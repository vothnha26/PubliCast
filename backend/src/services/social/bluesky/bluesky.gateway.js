const { BskyAgent, RichText } = require('@atproto/api');
const BLUESKY_CONSTANTS = require('./bluesky.constants');

class BlueskyGateway {
  createAgent(pdsUrl = BLUESKY_CONSTANTS.DEFAULT_PDS_URL) {
    return new BskyAgent({ service: pdsUrl });
  }

  async loginWithAppPassword(agent, identifier, password) {
    return agent.login({ identifier, password });
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
   * agent.dispatchUrl = agent.pdsUrl ?? agent.serviceUrl
   *   - agent.pdsUrl:     URL object, được set từ didDoc sau resumeSession/login.
   *                       Là PDS thực sự của user (có thể khác serviceUrl).
   *   - agent.serviceUrl: URL object, là endpoint ban đầu truyền vào constructor
   *                       (giá trị từ DB). Fallback khi pdsUrl chưa được set.
   *
   * Cả hai đều là URL objects nên dùng .href để lấy string.
   */
  _getPdsDid(agent) {
    // agent.dispatchUrl luôn là URL object hợp lệ (pdsUrl ?? serviceUrl)
    const pdsHref = agent.dispatchUrl.href;
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

    const uploadUrl = `${BLUESKY_CONSTANTS.VIDEO_SERVICE_URL}/xrpc/app.bsky.video.uploadVideo?did=${encodeURIComponent(agent.session.did)}&name=${Date.now()}.mp4`;
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
      if (!statusRes.ok) {
        throw new Error(`Video job status check failed: HTTP ${statusRes.status}`);
      }
      const statusData = await statusRes.json();
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

  async getPostMetrics(agent, uri) {
    const res = await agent.getPostThread({ uri });
    if (res.data.thread?.$type === BLUESKY_CONSTANTS.RECORD_TYPES.THREAD_VIEW_POST) {
      const post = res.data.thread.post;
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
