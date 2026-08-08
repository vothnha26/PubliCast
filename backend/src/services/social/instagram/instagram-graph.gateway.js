const axios = require('axios');

class InstagramGraphGateway {
  async getMediaDetails(auth, mediaId) {
    const accessToken = auth.accessToken || auth.token;
    const url = `https://graph.facebook.com/v26.0/${mediaId}?fields=id,media_type,like_count,comments_count,timestamp&access_token=${accessToken}`;
    const res = await axios.get(url);
    return res.data;
  }

  async getMediaInsights(auth, mediaId, metricsArray) {
    const accessToken = auth.accessToken || auth.token;
    const metricsParam = metricsArray.join(',');
    const url = `https://graph.facebook.com/v26.0/${mediaId}/insights?metric=${metricsParam}&access_token=${accessToken}`;
    const res = await axios.get(url);
    return res.data;
  }

  async getAccountInsights(auth, instagramUserId, metricsArray) {
    const accessToken = auth.accessToken || auth.token;
    const metricsParam = metricsArray.join(',');
    const url = `https://graph.facebook.com/v26.0/${instagramUserId}/insights?metric=${metricsParam}&period=day&access_token=${accessToken}`;
    const res = await axios.get(url);
    return res.data;
  }

  async getConversations(auth, instagramUserId) {
    const accessToken = auth.accessToken || auth.token;
    const url = `https://graph.facebook.com/v26.0/${instagramUserId}/conversations?fields=id,updated_time,participants,messages{id,message,created_time,from}&access_token=${accessToken}`;
    const res = await axios.get(url);
    return res.data;
  }

  async getMediaComments(auth, mediaId) {
    const accessToken = auth.accessToken || auth.token;
    const url = `https://graph.facebook.com/v26.0/${mediaId}/comments?fields=id,text,timestamp,username,from,replies{id,text,timestamp,from}&access_token=${accessToken}`;
    const res = await axios.get(url);
    return res.data;
  }

  async replyToComment(auth, commentId, message) {
    const accessToken = auth.accessToken || auth.token;
    const url = `https://graph.facebook.com/v26.0/${commentId}/replies`;
    const res = await axios.post(url, { message, access_token: accessToken });
    return res.data;
  }

  async createComment(auth, mediaId, message) {
    const accessToken = auth.accessToken || auth.token;
    const url = `https://graph.facebook.com/v26.0/${mediaId}/comments`;
    const res = await axios.post(url, { message, access_token: accessToken });
    return res.data;
  }

  async deleteComment(auth, commentId) {
    const accessToken = auth.accessToken || auth.token;
    const url = `https://graph.facebook.com/v26.0/${commentId}`;
    const res = await axios.delete(url, { params: { access_token: accessToken } });
    return res.data;
  }
}

module.exports = new InstagramGraphGateway();
