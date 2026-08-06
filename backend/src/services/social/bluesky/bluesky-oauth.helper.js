const crypto = require('crypto');
const logger = require('../../../utils/logger');

class BlueskyOAuthHelper {
  generateES256KeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'P-256'
    });
    const jwk = publicKey.export({ format: 'jwk' });
    return { publicKey, privateKey, jwk };
  }

  createDPoPJwt({ privateKey, jwk, htm, htu, nonce, ath }) {
    const header = {
      typ: 'dpop+jwt',
      alg: 'ES256',
      jwk: {
        kty: jwk.kty,
        crv: jwk.crv,
        x: jwk.x,
        y: jwk.y
      }
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      jti: crypto.randomBytes(16).toString('hex'),
      htm,
      htu,
      iat: now,
      exp: now + 60,
      ...(nonce ? { nonce } : {}),
      ...(ath ? { ath } : {})
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const message = `${encodedHeader}.${encodedPayload}`;

    const signer = crypto.createSign('SHA256');
    signer.update(message);
    const signature = signer.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' }, 'base64url');

    return `${message}.${signature}`;
  }

  async sendDPoPRequest(url, method, options = {}, keyPair, initialNonce = null) {
    const cleanUrl = url.split('?')[0];
    let nonce = initialNonce;

    const executeRequest = async (currentNonce) => {
      const dpopJwt = this.createDPoPJwt({
        privateKey: keyPair.privateKey,
        jwk: keyPair.jwk,
        htm: method.toUpperCase(),
        htu: cleanUrl,
        nonce: currentNonce,
        ath: options.accessTokenHash
      });

      // options.headers may be a plain object (PAR/token-exchange callers) or
      // a Headers instance (AtpAgent's fetchHandler always passes one) —
      // spreading a Headers instance directly yields {} and silently drops
      // every header the agent already set (atproto-proxy, accept-labelers).
      const headers = new Headers(options.headers || {});
      headers.set('DPoP', dpopJwt);
      if (options.accessJwt) headers.set('Authorization', `DPoP ${options.accessJwt}`);

      const response = await fetch(url, {
        method,
        headers,
        body: options.body
      });

      const responseNonce = response.headers.get('dpop-nonce');
      if (responseNonce) {
        nonce = responseNonce;
      }

      return { response, nonce };
    };

    let result = await executeRequest(nonce);

    // Bluesky's AS rejects the first DPoP proof with 400 use_dpop_nonce (not 401)
    // when no nonce was supplied yet, and returns the nonce to retry with via
    // the dpop-nonce response header — retry once using that nonce.
    const needsNonceRetry =
      (result.response.status === 400 || result.response.status === 401) &&
      result.nonce &&
      result.nonce !== initialNonce;

    if (needsNonceRetry) {
      logger.info('[BlueskyOAuth] Retrying DPoP request with updated server nonce:', result.nonce);
      result = await executeRequest(result.nonce);
    }

    return result;
  }

  /**
   * Resolves a DID to its actual PDS (Personal Data Server) endpoint. OAuth
   * DPoP-bound access tokens are only valid against the user's real PDS —
   * NOT against bsky.social (the AS/appview host) unless that happens to
   * also be their PDS — calling getProfile/etc. against the wrong host
   * fails with "OAuth tokens are meant for PDS access only". Most users
   * are hosted on Bluesky's own fleet (e.g. *.host.bsky.network), not
   * bsky.social itself, so this lookup is required, not an edge case.
   */
  async resolveDidToPdsUrl(did) {
    const doc = did.startsWith('did:web:')
      ? await fetch(`https://${decodeURIComponent(did.slice('did:web:'.length))}/.well-known/did.json`).then(r => r.json())
      : await fetch(`https://plc.directory/${encodeURIComponent(did)}`).then(r => r.json());

    const pdsService = (doc.service || []).find(s => s.id === '#atproto_pds' || s.type === 'AtprotoPersonalDataServer');
    if (!pdsService?.serviceEndpoint) {
      throw new Error(`Could not resolve PDS endpoint for DID: ${did}`);
    }
    return pdsService.serviceEndpoint;
  }

  async sendPARRequest({ parUrl, clientId, redirectUri, state, codeChallenge, keyPair }) {
    const parBody = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'atproto transition:generic',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    const { response, nonce } = await this.sendDPoPRequest(
      parUrl,
      'POST',
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: parBody
      },
      keyPair
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`PAR Request failed (HTTP ${response.status}): ${errText}`);
    }

    const data = await response.json();
    return { requestUri: data.request_uri, nonce };
  }

  async exchangeCodeForToken({ tokenUrl, clientId, redirectUri, code, codeVerifier, keyPair, nonce }) {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier
    });

    const { response } = await this.sendDPoPRequest(
      tokenUrl,
      'POST',
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      },
      keyPair,
      nonce
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Token Exchange failed (HTTP ${response.status}): ${errText}`);
    }

    return response.json();
  }

  /**
   * Exchanges a refresh_token for a fresh DPoP-bound access token via the
   * same client's token endpoint (grant_type=refresh_token). DPoP OAuth
   * access tokens are short-lived and, unlike the session-based BskyAgent
   * path (see BlueskyGateway.createAgent's persistSession), createDPoPAgent
   * has no built-in auto-refresh — callers must call this themselves and
   * persist the result when a request fails with an expired-token error
   * (e.g. "exp" claim timestamp check failed).
   */
  async refreshDPoPToken({ tokenUrl, clientId, refreshJwt, keyPair, nonce }) {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshJwt,
      client_id: clientId
    });

    const { response } = await this.sendDPoPRequest(
      tokenUrl,
      'POST',
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      },
      keyPair,
      nonce
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Token Refresh failed (HTTP ${response.status}): ${errText}`);
    }

    return response.json();
  }

  /**
   * Builds an @atproto/api sessionManager for OAuth DPoP-bound access tokens.
   * BskyAgent/AtpAgent normally send plain `Authorization: Bearer` requests
   * (via resumeSession), which Bluesky's AS/PDS rejects for DPoP-bound tokens
   * with "Authentication Required" — every request must instead carry a fresh
   * DPoP proof JWT (optionally bound to the access token via `ath`) signed
   * with the same ES256 key used during the PAR/token-exchange steps.
   *
   * Pass the returned object directly as `new Agent(sessionManager)` — NOT
   * `BskyAgent`/`AtpAgent`, whose constructor always does `new URL(options.service)`
   * and has no path to accept a custom fetchHandler (throws "Invalid URL").
   *
   * Also exposes `dispatchUrl`/`pdsUrl` (as URL objects) so callers that read
   * `agent.dispatchUrl`/`agent.pdsUrl` — a convention from AtpAgent, which
   * `Agent` itself does not provide — keep working the same way regardless
   * of which agent class is in use.
   */
  createDPoPFetchHandler({ did, accessJwt, keyPair, pdsUrl }) {
    const accessTokenHash = crypto.createHash('sha256').update(accessJwt).digest('base64url');
    const pdsUrlObj = new URL(pdsUrl);

    // No shared mutable nonce here — each call gets its own sendDPoPRequest
    // invocation (initialNonce always null), so concurrent requests through
    // this same fetchHandler can't clobber each other's nonce. The extra
    // "unnecessary" first-request nonce miss on concurrent calls costs one
    // retry round-trip, which is cheaper than a wrong nonce corrupting an
    // unrelated in-flight request.
    const fetchHandler = async (url, init = {}) => {
      const fullUrl = url.startsWith('http') ? url : `${pdsUrl.replace(/\/$/, '')}${url}`;

      const { response } = await this.sendDPoPRequest(
        fullUrl,
        init.method || 'GET',
        {
          headers: init.headers,
          body: init.body,
          accessTokenHash,
          accessJwt
        },
        keyPair
      );

      return response;
    };

    return { did, fetchHandler, dispatchUrl: pdsUrlObj, pdsUrl: pdsUrlObj, serviceUrl: pdsUrlObj };
  }
}

module.exports = new BlueskyOAuthHelper();
