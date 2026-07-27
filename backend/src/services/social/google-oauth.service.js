const { google } = require('googleapis');
const { API_VERSIONS } = require('../../utils/constants');

class GoogleOAuthService {
  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  }

  createClient(redirectUri) {
    return new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      redirectUri
    );
  }

  getAuthUrl(scopes, state, redirectUri) {
    const client = this.createClient(redirectUri);
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: state
    });
  }

  async getTokens(code, redirectUri) {
    const client = this.createClient(redirectUri);
    const { tokens } = await client.getToken(code);
    return tokens;
  }

  async getUserInfo(tokens) {
    const client = this.createClient();
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: API_VERSIONS.YOUTUBE_ANALYTICS, auth: client });
    const { data } = await oauth2.userinfo.get();
    return data;
  }
}

module.exports = new GoogleOAuthService();
