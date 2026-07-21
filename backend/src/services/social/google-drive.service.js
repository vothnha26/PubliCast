const { google } = require('googleapis');
const googleOAuthService = require('./google-oauth.service');
const socialAccountRepository = require('../../repositories/social/social-account.repository');
const { PLATFORMS, API_VERSIONS } = require('../../utils/constants');
const fs = require('fs');
const path = require('path');

// Real Google Drive file IDs are base64url-like (letters, digits, - and _).
// fileId comes straight from the request body, so it has to be validated
// before it's used to build a filesystem path — path.join happily resolves
// "../.." segments, and only Google's own API rejecting a malformed ID
// stands between that and writing outside uploads/.
const DRIVE_FILE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

class GoogleDriveService {
  async getDriveClient(brandId) {
    const socialAccount = await socialAccountRepository.findByBrandAndPlatform(brandId, PLATFORMS.YOUTUBE);
    if (!socialAccount || socialAccount.length === 0) {
      const error = new Error('Google account not connected');
      error.code = 'NOT_CONNECTED';
      throw error;
    }
    
    const account = socialAccount[0];
    const auth = googleOAuthService.createClient();
    auth.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      expiry_date: account.tokenExpiresAt ? account.tokenExpiresAt.getTime() : undefined
    });

    return google.drive({ version: API_VERSIONS.YOUTUBE, auth });
  }

  async listVideos(brandId) {
    const drive = await this.getDriveClient(brandId);
    
    const response = await drive.files.list({
      q: "(mimeType contains 'video/' or mimeType contains 'image/' or mimeType = 'application/pdf') and trashed = false",
      fields: 'nextPageToken, files(id, name, mimeType, size, thumbnailLink, createdTime)',
      pageSize: 50,
      orderBy: 'createdTime desc'
    });

    return response.data.files || [];
  }

  async downloadFile(brandId, fileId, fileName) {
    if (!DRIVE_FILE_ID_PATTERN.test(fileId)) {
      const error = new Error('Invalid Google Drive file ID');
      error.statusCode = 400;
      throw error;
    }

    const drive = await this.getDriveClient(brandId);
    const { localFilePath, uploadUrlPath } = this._resolveStoragePaths(fileId, fileName);

    if (fs.existsSync(localFilePath)) {
      return uploadUrlPath;
    }

    const response = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
    return this._streamToFile(response.data, localFilePath, uploadUrlPath);
  }

  // ============= Private Helper Methods =============

  _resolveStoragePaths(fileId, fileName) {
    const uploadDir = path.resolve(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const cleanFileName = `drive-${fileId}-${safeName}`;
    const localFilePath = path.join(uploadDir, cleanFileName);

    // Belt-and-suspenders: even with fileId pre-validated, refuse to resolve
    // outside uploadDir rather than trust the regex is the only guard.
    if (!localFilePath.startsWith(uploadDir + path.sep)) {
      const error = new Error('Resolved file path escapes the uploads directory');
      error.statusCode = 400;
      throw error;
    }

    return {
      localFilePath,
      uploadUrlPath: `/uploads/${cleanFileName}`
    };
  }

  async _streamToFile(inputStream, localPath, urlPath) {
    const dest = fs.createWriteStream(localPath);
    return new Promise((resolve, reject) => {
      inputStream
        .on('end', () => resolve(urlPath))
        .on('error', (err) => {
          fs.unlink(localPath, () => {}); 
          reject(new Error(`Stream failed: ${err.message}`));
        })
        .pipe(dest);
    });
  }
}

module.exports = new GoogleDriveService();
