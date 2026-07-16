const videoProcessorFacade = require('../../src/services/workspace/video/video-processor.facade');
const TranscriptionStrategyFactory = require('../../src/services/workspace/ai/transcription/transcription-strategy.factory');
const { GeminiTranscriptionStrategy, MockTranscriptionStrategy } = require('../../src/services/workspace/ai/transcription/transcription.strategy');
const { execFile } = require('child_process');
const fs = require('fs');

jest.mock('child_process', () => ({
  execFile: jest.fn()
}));

// Mock cloudinary before importing video processor
jest.mock('../../src/config/cloudinary', () => ({
  cloudinary: {
    uploader: {
      upload: jest.fn((filePath, options, callback) => {
        callback(null, { secure_url: 'https://cloudinary/mock-video.mp4' });
      })
    }
  }
}));

jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  const { Readable } = require('stream');
  return {
    ...originalFs,
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    unlinkSync: jest.fn(),
    copyFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    statSync: jest.fn(() => ({ size: 1024 })),
    createReadStream: jest.fn(() => {
      const s = new Readable();
      s._read = () => {};
      s.push(null);
      return s;
    })
  };
});

jest.mock('axios');

describe('Video Editor Services & SOLID Patterns Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      AI_PROVIDER: 'MOCK',
      GEMINI_API_KEY: 'mock-key',
      UPLOAD_STORAGE: 'local' // test local storage branch
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('TranscriptionStrategyFactory', () => {
    it('should return MockTranscriptionStrategy when provider is MOCK', () => {
      process.env.AI_PROVIDER = 'MOCK';
      const strategy = TranscriptionStrategyFactory.getStrategy();
      expect(strategy).toBeInstanceOf(MockTranscriptionStrategy);
    });

    it('should return GeminiTranscriptionStrategy when provider is GEMINI and key exists', () => {
      process.env.AI_PROVIDER = 'GEMINI';
      process.env.GEMINI_API_KEY = 'real-gemini-key';
      const strategy = TranscriptionStrategyFactory.getStrategy();
      expect(strategy).toBeInstanceOf(GeminiTranscriptionStrategy);
    });

    it('should fallback to MockTranscriptionStrategy when provider is GEMINI but key is missing', () => {
      process.env.AI_PROVIDER = 'GEMINI';
      delete process.env.GEMINI_API_KEY;
      const strategy = TranscriptionStrategyFactory.getStrategy();
      expect(strategy).toBeInstanceOf(MockTranscriptionStrategy);
    });
  });

  describe('MockTranscriptionStrategy', () => {
    it('should resolve immediately with mock subtitles', async () => {
      const strategy = new MockTranscriptionStrategy();
      const subtitles = await strategy.transcribe('local-video.mp4', 'video/mp4');
      expect(subtitles).toBeInstanceOf(Array);
      expect(subtitles[0]).toHaveProperty('text');
      expect(subtitles[0]).toHaveProperty('start');
    });
  });

  describe('VideoProcessorFacade', () => {
    it('should process video and trigger correct ffmpeg command', async () => {
      fs.existsSync.mockReturnValue(true);
      execFile.mockImplementation((cmd, args, callback) => callback(null, 'stdout', ''));

      // Stub private _resolveFile to avoid real file network requests
      videoProcessorFacade._resolveFile = jest.fn().mockResolvedValue();

      const result = await videoProcessorFacade.processVideo({
        videoUrl: '/uploads/media/video.mp4',
        startTime: 2,
        endTime: 7,
        brandId: 'brand_123'
      });

      expect(execFile).toHaveBeenCalled();
      const [cmd, args] = execFile.mock.calls[0];
      expect(cmd).toBe('ffmpeg');
      expect(args).toContain('-ss');
      expect(args).toContain('2');
      expect(args).toContain('-t');
      expect(args).toContain('5'); // 7 - 2 = 5 seconds duration
      expect(result).toContain('brand_123');
    });

    it('should generate correct crop filter command for 9:16 aspect ratio with dynamic keyframes', async () => {
      fs.existsSync.mockReturnValue(true);
      execFile.mockImplementation((cmd, args, callback) => callback(null, 'stdout', ''));
      videoProcessorFacade._resolveFile = jest.fn().mockResolvedValue();

      await videoProcessorFacade.processVideo({
        videoUrl: '/uploads/media/video.mp4',
        startTime: 0,
        endTime: 10,
        aspectRatio: '9:16',
        keyframes: [
          { time: 0, cropX: 0.5 },
          { time: 5, cropX: 0.2 }
        ],
        brandId: 'brand_123'
      });

      expect(execFile).toHaveBeenCalled();
      const [, args] = execFile.mock.calls[0];
      const filterComplexValue = args[args.indexOf('-filter_complex') + 1];
      expect(filterComplexValue).toContain('crop=min(iw\\,ih*9/16)');
      // linear interpolation slope: (0.2 - 0.5) / 5 = -0.06
      expect(filterComplexValue).toContain('-0.0600');
    });

    it('should include drawtext filters for textOverlays and subtitles, rendered via textfile= instead of raw text=', async () => {
      fs.existsSync.mockReturnValue(true);
      execFile.mockImplementation((cmd, args, callback) => callback(null, 'stdout', ''));
      videoProcessorFacade._resolveFile = jest.fn().mockResolvedValue();

      await videoProcessorFacade.processVideo({
        videoUrl: '/uploads/media/video.mp4',
        startTime: 1,
        endTime: 9,
        aspectRatio: 'original',
        textOverlays: [
          { text: 'Hello World', x: 50, y: 40, color: '#FF0000', size: 30 }
        ],
        subtitles: [
          { text: 'A Subtitle', start: 2, end: 5 }
        ],
        brandId: 'brand_123'
      });

      expect(execFile).toHaveBeenCalled();
      const [, args] = execFile.mock.calls[0];
      const filterComplexValue = args[args.indexOf('-filter_complex') + 1];

      // Text content is written to server-generated temp files, not
      // interpolated directly into the filter string.
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('overlay-0.txt'), 'Hello World', 'utf8');
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('subtitle-0.txt'), 'A Subtitle', 'utf8');

      // Kiểm tra filter drawtext của text overlay tĩnh
      expect(filterComplexValue).toContain('drawtext=textfile=');
      expect(filterComplexValue).toContain('overlay-0.txt');
      expect(filterComplexValue).toContain('x=(w*50/100-tw/2):y=(h*40/100-th/2):fontcolor=#FF0000:fontsize=30');
      // Kiểm tra filter drawtext của subtitle động (start 2 - 1 = 1, end 5 - 1 = 4)
      expect(filterComplexValue).toContain('subtitle-0.txt');
      expect(filterComplexValue).toContain('x=(w-tw)/2:y=h-80:fontcolor=white:fontsize=22:box=1:boxcolor=black@0.6:boxborderw=6:enable=\'between(t,1.000,4.000)\'');
    });
  });
});
