const { BskyAgent, RichText } = require('@atproto/api');
const BLUESKY_CONSTANTS = require('./bluesky.constants');

class BlueskyGateway {
  createAgent(pdsUrl = BLUESKY_CONSTANTS.DEFAULT_PDS_URL) {
    return new BskyAgent({ service: pdsUrl });
  }

  async loginWithAppPassword(agent, identifier, password) {
    return agent.login({ identifier, password });
  }

  async publishPost(agent, { text, images = [], replyTo }) {
    const rt = new RichText({ text });
    await rt.detectFacets(agent);

    let embed = undefined;
    if (images.length > 0) {
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
}

module.exports = new BlueskyGateway();
