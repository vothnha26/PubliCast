const { BskyAgent, Agent, RichText } = require('@atproto/api');
const BLUESKY_CONSTANTS = require('./bluesky.constants');
const blueskyOAuthHelper = require('./bluesky-oauth.helper');

class BlueskyGateway {
  createAgent(pdsUrl = BLUESKY_CONSTANTS.DEFAULT_PDS_URL) {
    return new BskyAgent({ service: pdsUrl });
  }

  /**
   * Builds an @atproto/api Agent authenticated via an OAuth2 DPoP-bound
   * access token (AT Protocol OAuth flow) instead of session-based Bearer
   * auth — see bluesky-oauth.helper.js's createDPoPFetchHandler for why
   * resumeSession() (plain Bearer) cannot be used with these tokens.
   *
   * Must use the base `Agent` class, not `BskyAgent`/`AtpAgent`: AtpAgent's
   * constructor always does `new URL(options.service)` and only accepts a
   * custom sessionManager when it's already a CredentialSession instance —
   * there's no path to inject a custom fetchHandler through it (throws
   * "Invalid URL" otherwise). `Agent` (the class AtpAgent itself extends)
   * accepts any object with a `fetchHandler` key directly. `getProfile`,
   * `uploadBlob`, and `post` used elsewhere in this gateway are all defined
   * on `Agent` itself, so no BskyAgent-specific functionality is lost.
   */
  createDPoPAgent({ did, accessJwt, keyPair, pdsUrl = BLUESKY_CONSTANTS.DEFAULT_PDS_URL }) {
    const sessionManager = blueskyOAuthHelper.createDPoPFetchHandler({ did, accessJwt, keyPair, pdsUrl });
    return new Agent(sessionManager);
  }

  async resumeSession(agent, { accessJwt, refreshJwt, did, handle }) {
    return agent.resumeSession({ accessJwt, refreshJwt, did, handle });
  }

  /**
   * Fetches the account's current verification/session state directly from
   * com.atproto.server.getSession. resumeSession()'s underlying
   * refreshSession call can omit or return a stale emailConfirmed value
   * (the SDK only backfills it via getSession when the field comes back as
   * null/undefined — a stale `false` from the PDS slips through), so any
   * code that needs an up-to-date verification status must call this
   * directly rather than trust the resumeSession() result.
   */
  async getSession(agent) {
    const res = await agent.com.atproto.server.getSession();
    return res.data;
  }

  /**
   * Trả về DID của PDS (Personal Data Server) của user dưới dạng did:web.
   * Theo AT Protocol spec, đây là `aud` (audience) phải dùng khi gọi getServiceAuth.
   *
   * `agent.dispatchUrl` (pdsUrl ?? serviceUrl) is an AtpAgent/BskyAgent-only
   * getter — the base `Agent` class used for OAuth DPoP agents (see
   * createDPoPAgent) has no such getter, only whatever we put on its
   * sessionManager (dispatchUrl/pdsUrl/serviceUrl, all URL objects — see
   * bluesky-oauth.helper.js's createDPoPFetchHandler). Reading from
   * sessionManager first keeps this working for both agent kinds.
   */
  _getPdsDid(agent) {
    const pdsHref = (agent.dispatchUrl ?? agent.sessionManager?.dispatchUrl ?? agent.sessionManager?.pdsUrl ?? agent.sessionManager?.serviceUrl)?.href;
    if (!pdsHref) throw new Error('Unable to determine Bluesky PDS URL from agent');
    // Chuẩn hoá: bỏ "https://" và trailing slash
    const host = pdsHref.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `did:web:${host}`;
  }

  async uploadVideo(agent, videoBuffer, mimeType = 'video/mp4') {
    if (videoBuffer.length > BLUESKY_CONSTANTS.LIMITS.MAX_VIDEO_SIZE_BYTES) {
      throw new Error(`Video file size exceeds Bluesky maximum limit of 50MB`);
    }

    // Theo AT Protocol spec, `aud` phải là DID của PDS của user, KHÔNG phải
    // DID của video service. PDS sẽ issue token để upload lên video.bsky.app.
    const pdsDid = this._getPdsDid(agent);

    const tokenRes = await agent.com.atproto.server.getServiceAuth({
      aud: pdsDid,
      lxm: BLUESKY_CONSTANTS.VIDEO_UPLOAD_LXM,
      exp: Math.floor(Date.now() / 1000) + BLUESKY_CONSTANTS.LIMITS.VIDEO_SERVICE_TOKEN_EXPIRY_SEC
    });
    const token = tokenRes.data.token;

    const uploadUrl = `${BLUESKY_CONSTANTS.VIDEO_SERVICE_URL}/xrpc/app.bsky.video.uploadVideo?did=${encodeURIComponent(agent.did)}&name=${Date.now()}.mp4`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': mimeType
      },
      body: videoBuffer
    });

    if (!uploadRes.ok) {
      const errData = await uploadRes.json().catch(() => ({}));
      const errMessage = errData.message || errData.error || `HTTP ${uploadRes.status}`;
      throw new Error(`Failed to upload video to Bluesky video service: ${errMessage}`);
    }
    const jobData = await uploadRes.json();
    const jobId = jobData.jobId;

    let attempts = 0;
    while (attempts < BLUESKY_CONSTANTS.LIMITS.VIDEO_JOB_MAX_ATTEMPTS) {
      await new Promise(r => setTimeout(r, BLUESKY_CONSTANTS.LIMITS.VIDEO_JOB_POLL_INTERVAL_MS));
      attempts++;

      const statusUrl = `${BLUESKY_CONSTANTS.VIDEO_SERVICE_URL}/xrpc/app.bsky.video.getJobStatus?jobId=${encodeURIComponent(jobId)}`;
      const statusRes = await fetch(statusUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const statusData = await statusRes.json().catch(() => ({}));

      if (statusData.jobStatus?.blob) {
        return statusData.jobStatus.blob;
      }

      if (!statusRes.ok) {
        throw new Error(`Video job status check failed: HTTP ${statusRes.status}${statusData.jobStatus?.error ? ` (${statusData.jobStatus.error})` : ''}`);
      }

      if (statusData.jobStatus?.state === 'JOB_STATE_COMPLETED') {
        return statusData.jobStatus.blob;
      }
      if (statusData.jobStatus?.state === 'JOB_STATE_FAILED') {
        throw new Error(`Bluesky video processing failed: ${statusData.jobStatus.error || 'Unknown error'}`);
      }
    }
    throw new Error('Bluesky video processing timed out');
  }

  async publishPost(agent, { text, images = [], video = null, replyTo }) {
    if (images.length > 0 && video) {
      throw new Error('Bluesky does not support posting images and video simultaneously');
    }

    const rt = new RichText({ text });
    await rt.detectFacets(agent);

    let embed = undefined;
    if (video) {
      const videoBlob = await this.uploadVideo(agent, video.buffer, video.mimeType);
      embed = {
        $type: BLUESKY_CONSTANTS.RECORD_TYPES.EMBED_VIDEO,
        video: videoBlob,
        ...(video.aspectRatio ? { aspectRatio: video.aspectRatio } : {})
      };
    } else if (images.length > 0) {
      const uploadedImages = [];
      for (const img of images) {
        const uploadRes = await agent.uploadBlob(img.buffer, { encoding: img.mimeType });
        uploadedImages.push({
          image: uploadRes.data.blob,
          alt: img.alt || ''
        });
      }
      embed = {
        $type: BLUESKY_CONSTANTS.RECORD_TYPES.EMBED_IMAGES,
        images: uploadedImages
      };
    }

    const postRecord = {
      text: rt.text,
      facets: rt.facets,
      embed,
      langs: BLUESKY_CONSTANTS.DEFAULT_LANGS,
      reply: replyTo ? { root: replyTo.root, parent: replyTo.parent } : undefined,
      createdAt: new Date().toISOString()
    };

    const res = await agent.post(postRecord);
    return { id: res.uri, cid: res.cid };
  }

  async getProfile(agent, actor) {
    const res = await agent.getProfile({ actor });
    return res.data;
  }

  async getPostThread(agent, { uri, depth = 6, parentHeight = 80 } = {}) {
    if (!uri) throw new Error('Post URI is required to fetch Bluesky thread');
    const res = await agent.getPostThread({ uri, depth, parentHeight });
    return res.data?.thread;
  }

  async getPostMetrics(agent, uri) {
    const thread = await this.getPostThread(agent, { uri, depth: 0, parentHeight: 0 });
    if (thread?.$type === BLUESKY_CONSTANTS.RECORD_TYPES.THREAD_VIEW_POST) {
      const post = thread.post;
      return {
        likes: post.likeCount || 0,
        reposts: post.repostCount || 0,
        replies: post.replyCount || 0,
        quotes: post.quoteCount || 0
      };
    }
    return { likes: 0, reposts: 0, replies: 0, quotes: 0 };
  }

  async likePost(agent, uri, cid) {
    return agent.like(uri, cid);
  }

  async repost(agent, uri, cid) {
    return agent.repost(uri, cid);
  }

  async followUser(agent, did) {
    return agent.follow(did);
  }

  async deleteLike(agent, likeUri) {
    return agent.deleteLike(likeUri);
  }

  async deleteRepost(agent, repostUri) {
    return agent.deleteRepost(repostUri);
  }
}

module.exports = new BlueskyGateway();
