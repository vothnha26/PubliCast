const fs = require('fs');
const axios = require('axios');
const { GEMINI_CONFIG } = require('../../../../config/ai.config');

class BaseTranscriptionStrategy {
  /**
   * Transcribe a video/audio file
   * @param {string} localFilePath - Local path of the video/audio file
   * @param {string} mimeType - Mime type of the file
   * @returns {Promise<Array<{start: number, end: number, text: string}>>} Subtitles list
   */
  async transcribe(localFilePath, mimeType) {
    throw new Error('transcribe method must be implemented');
  }
}

class GeminiTranscriptionStrategy extends BaseTranscriptionStrategy {
  async transcribe(localFilePath, mimeType) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const fileSize = fs.statSync(localFilePath).size;
    let fileResourceName = '';

    try {
      console.log(`[GeminiTranscriptionStrategy] Step 1: Initiating file upload for size=${fileSize}, mime=${mimeType}...`);
      
      // Step 1: Initialize resumable upload handshake
      const initResponse = await axios.post(
        `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
        { file: { display_name: `transcribe-${Date.now()}` } },
        {
          headers: {
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': fileSize,
            'X-Goog-Upload-Header-Content-Type': mimeType,
            'Content-Type': 'application/json',
          }
        }
      );

      const uploadUrl = initResponse.headers['x-goog-upload-url'];
      if (!uploadUrl) {
        throw new Error('Failed to retrieve resumable upload URL from Gemini API');
      }

      console.log(`[GeminiTranscriptionStrategy] Step 2: Uploading file bytes...`);

      // Step 2: Upload binary content
      const fileStream = fs.createReadStream(localFilePath);
      const uploadResponse = await axios.post(uploadUrl, fileStream, {
        headers: {
          'Content-Length': fileSize,
          'X-Goog-Upload-Offset': '0',
          'X-Goog-Upload-Command': 'upload, finalize',
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      const fileData = uploadResponse.data.file;
      if (!fileData || !fileData.uri) {
        throw new Error('File upload completed but no file URI was returned');
      }

      fileResourceName = fileData.name; // e.g. "files/abc123xyz"
      console.log(`[GeminiTranscriptionStrategy] File uploaded successfully: ${fileResourceName}, URI: ${fileData.uri}`);

      // Wait a moment for processing if it is a large file
      let fileState = fileData.state;
      let checkAttempts = 0;
      while (fileState === 'PROCESSING' && checkAttempts < 10) {
        console.log(`[GeminiTranscriptionStrategy] File is processing. Waiting...`);
        await new Promise(r => setTimeout(r, 2000));
        const statusResponse = await axios.get(
          `https://generativelanguage.googleapis.com/v1beta/${fileResourceName}?key=${apiKey}`
        );
        fileState = statusResponse.data.state;
        checkAttempts++;
      }

      if (fileState === 'FAILED') {
        throw new Error('Gemini API file processing failed');
      }

      console.log(`[GeminiTranscriptionStrategy] Step 3: Prompting model to transcribe...`);

      // Step 3: Call generateContent with model gemini-1.5-flash
      const prompt = `Transcribe the speech in this video/audio. Output MUST be a valid JSON array of subtitle objects. Adhere strictly to this schema: [{"start": number, "end": number, "text": "string"}]. The start and end fields must represent timestamps in seconds as floating numbers (e.g. 1.25). Do not include any introductory or concluding text, only the raw JSON. Return empty array [] if no speech is detected.`;
      
      const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await axios.post(generateUrl, {
        contents: [
          {
            parts: [
              { fileData: { fileUri: fileData.uri, mimeType: fileData.mimeType } },
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });

      const responseText = response.data.candidates[0].content.parts[0].text;
      console.log(`[GeminiTranscriptionStrategy] Transcription result received.`);
      return JSON.parse(responseText);

    } catch (error) {
      console.error(`[GeminiTranscriptionStrategy] Transcription failed:`, error.response?.data || error.message);
      throw error;
    } finally {
      // Step 4: Cleanup files on Gemini API servers
      if (fileResourceName) {
        console.log(`[GeminiTranscriptionStrategy] Step 4: Cleaning up remote file ${fileResourceName} on Gemini servers...`);
        try {
          await axios.delete(
            `https://generativelanguage.googleapis.com/v1beta/${fileResourceName}?key=${apiKey}`
          );
          console.log(`[GeminiTranscriptionStrategy] Remote file cleanup complete.`);
        } catch (delError) {
          console.warn(`[GeminiTranscriptionStrategy] Failed to delete remote file: ${delError.message}`);
        }
      }
    }
  }
}

class MockTranscriptionStrategy extends BaseTranscriptionStrategy {
  async transcribe(localFilePath, mimeType) {
    console.log(`[MockTranscriptionStrategy] Transcribing mock file: ${localFilePath}`);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { start: 0.5, end: 3.2, text: "Welcome to PubliCast! 🚀" },
          { start: 3.5, end: 6.8, text: "Today we are looking at the new features" },
          { start: 7.0, end: 10.0, text: "Enjoy editing your social videos in one place!" }
        ]);
      }, 1500);
    });
  }
}

module.exports = {
  BaseTranscriptionStrategy,
  GeminiTranscriptionStrategy,
  MockTranscriptionStrategy
};
