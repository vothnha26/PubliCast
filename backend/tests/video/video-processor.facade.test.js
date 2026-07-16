const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const axios = require('axios');

// Mock dependencies
jest.mock('child_process', () => ({
  execFile: jest.fn()
}));

jest.mock('axios');

jest.mock('../../src/config/cloudinary', () => ({
  cloudinary: {
    uploader: {
      upload: jest.fn()
    }
  }
}));

const videoProcessorFacade = require('../../src/services/workspace/video/video-processor.facade');
const { cloudinary } = require('../../src/config/cloudinary');

describe('VideoProcessorFacade Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('_buildFfmpegCropXExpr()', () => {
    it('should return default position if keyframes are empty or missing', () => {
      expect(videoProcessorFacade._buildFfmpegCropXExpr([])).toBe('0.5000');
      expect(videoProcessorFacade._buildFfmpegCropXExpr(null)).toBe('0.5000');
    });

    it('should return static position if there is only one keyframe', () => {
      const keyframes = [{ time: 0, cropX: 0.25 }];
      expect(videoProcessorFacade._buildFfmpegCropXExpr(keyframes)).toBe('0.2500');
    });

    it('should build linear interpolation formula between keyframes', () => {
      const keyframes = [
        { time: 0, cropX: 0.1 },
        { time: 5, cropX: 0.6 }
      ];
      // Slope: (0.6 - 0.1) / (5 - 0) = 0.5 / 5 = 0.1
      // Formula: 0.1000+(0.1000)*(t-0.000)
      const expr = videoProcessorFacade._buildFfmpegCropXExpr(keyframes);
      expect(expr).toContain('0.1000');
      expect(expr).toContain('(0.1000)*(t-0.000)');
    });

    it('should build recursive condition if multiple keyframes are defined', () => {
      const keyframes = [
        { time: 0, cropX: 0.1 },
        { time: 2, cropX: 0.5 },
        { time: 5, cropX: 0.8 }
      ];
      const expr = videoProcessorFacade._buildFfmpegCropXExpr(keyframes);
      expect(expr).toContain('if(lt(t,2.000)');
      expect(expr).toContain('if(lt(t,5.000)');
    });
  });

  describe('_resolveFile()', () => {
    let existsSyncSpy;
    let copyFileSyncSpy;
    let createWriteStreamSpy;

    beforeEach(() => {
      existsSyncSpy = jest.spyOn(fs, 'existsSync').mockImplementation(() => true);
      copyFileSyncSpy = jest.spyOn(fs, 'copyFileSync').mockImplementation(() => {});
      createWriteStreamSpy = jest.spyOn(fs, 'createWriteStream').mockImplementation(() => {
        const stream = new (require('stream').Writable)();
        setTimeout(() => stream.emit('finish'), 10);
        return stream;
      });
    });

    afterEach(() => {
      existsSyncSpy.mockRestore();
      copyFileSyncSpy.mockRestore();
      createWriteStreamSpy.mockRestore();
    });

    it('should download file if source starts with http', async () => {
      const mockStream = new (require('stream').Readable)();
      mockStream._read = () => {};
      setTimeout(() => mockStream.emit('end'), 10);

      axios.mockResolvedValue({
        data: {
          pipe: (dest) => {
            mockStream.pipe(dest);
          }
        }
      });

      await videoProcessorFacade._resolveFile('https://example.com/video.mp4', 'local.mp4');

      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
        url: 'https://example.com/video.mp4',
        method: 'GET',
        responseType: 'stream'
      }));
      expect(createWriteStreamSpy).toHaveBeenCalledWith('local.mp4');
    });

    it('should copy file if local path is within allowed uploads directory', async () => {
      const localPath = '/uploads/my-video.mp4';
      // Mock path.resolve to behave correctly
      const resolveSpy = jest.spyOn(path, 'resolve').mockImplementation((...args) => {
        return args.join('/').replace(/\\/g, '/');
      });
      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue('/app');

      await videoProcessorFacade._resolveFile(localPath, 'target.mp4');

      expect(copyFileSyncSpy).toHaveBeenCalled();
      
      resolveSpy.mockRestore();
      cwdSpy.mockRestore();
    });

    it('should throw an error (Path Traversal block) if local path is outside uploads directory', async () => {
      const evilPath = '../etc/passwd';
      
      await expect(videoProcessorFacade._resolveFile(evilPath, 'target.mp4'))
        .rejects.toThrow('Access denied');

      expect(copyFileSyncSpy).not.toHaveBeenCalled();
    });
  });

  describe('_executeFfmpeg()', () => {
    it('should construct correct argv and execute it via child_process.execFile (no shell)', async () => {
      execFile.mockImplementation((cmd, args, cb) => {
        cb(null, 'stdout', 'stderr');
      });

      const params = {
        inputPath: 'in.mp4',
        outputPath: 'out.mp4',
        startTime: 0,
        endTime: 10,
        aspectRatio: '1:1',
        keyframes: [{ time: 0, cropX: 0.5 }],
        audioPath: null,
        audioVolume: 50,
        tempDir: 'tmp',
        uniqueId: 'test-id',
        textFilePaths: []
      };

      await videoProcessorFacade._executeFfmpeg(params);

      expect(execFile).toHaveBeenCalledTimes(1);
      const [cmd, args] = execFile.mock.calls[0];
      expect(cmd).toBe('ffmpeg');
      expect(Array.isArray(args)).toBe(true);
      expect(args).toContain('-ss');
      expect(args).toContain('0');
      expect(args).toContain('-t');
      expect(args).toContain('10');
      expect(args.some(a => typeof a === 'string' && a.includes('crop='))).toBe(true);
    });

    it('should reject if FFmpeg fails', async () => {
      execFile.mockImplementation((cmd, args, cb) => {
        cb(new Error('Ffmpeg crashed'), '', 'Ffmpeg failed');
      });

      const params = {
        inputPath: 'in.mp4',
        outputPath: 'out.mp4',
        startTime: 0,
        endTime: 5,
        aspectRatio: 'original',
        keyframes: [],
        audioPath: null,
        audioVolume: 50,
        tempDir: 'tmp',
        uniqueId: 'test-id',
        textFilePaths: []
      };

      await expect(videoProcessorFacade._executeFfmpeg(params))
        .rejects.toThrow('FFmpeg failed to process video');
    });

    it('should never pass raw user text as a single interpolated string (RCE regression)', async () => {
      // Before the fix, textOverlays[].text was interpolated directly into a
      // -filter_complex string run via exec() (a shell). A value like
      // `'; touch /tmp/pwned; echo '` would close the quoted filter argument
      // and run as a separate shell command. execFile() takes an argv array
      // with no shell involved, so this same payload can only ever end up as
      // literal file content via the textfile= mechanism, never as a command.
      const maliciousText = "'; touch /tmp/pwned; echo '";
      let capturedWriteContent = null;
      const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation((filePath, content) => {
        capturedWriteContent = content;
      });
      execFile.mockImplementation((cmd, args, cb) => cb(null, '', ''));

      await videoProcessorFacade._executeFfmpeg({
        inputPath: 'in.mp4',
        outputPath: 'out.mp4',
        startTime: 0,
        endTime: 5,
        aspectRatio: 'original',
        keyframes: [],
        audioPath: null,
        audioVolume: 50,
        textOverlays: [{ text: maliciousText, color: 'white', size: 24, x: 50, y: 50 }],
        subtitles: [],
        tempDir: 'tmp',
        uniqueId: 'test-id',
        textFilePaths: []
      });

      // The malicious text must be written verbatim to a text file...
      expect(capturedWriteContent).toBe(maliciousText);

      // ...and the -filter_complex argv element must reference that file via
      // textfile=, never contain the raw payload itself.
      const [, args] = execFile.mock.calls[0];
      const filterComplexIndex = args.indexOf('-filter_complex');
      const filterValue = args[filterComplexIndex + 1];
      expect(filterValue).not.toContain(maliciousText);
      expect(filterValue).toContain('textfile=');
      expect(filterValue).toContain('test-id-overlay-0.txt');

      writeSpy.mockRestore();
    });
  });

  describe('_buildVideoFilters() — textfile mechanism', () => {
    it('writes overlay text to a temp file and references it via textfile=, tracking it for cleanup', () => {
      const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      const textFilePaths = [];

      const result = videoProcessorFacade._buildVideoFilters({
        aspectRatio: 'original',
        keyframes: [],
        textOverlays: [{ text: "It's a \"test\": part 1, part 2", color: 'white', size: 24, x: 50, y: 50 }],
        subtitles: [],
        startTime: 0,
        tempDir: 'tmp',
        uniqueId: 'test-id',
        textFilePaths
      });

      expect(writeSpy).toHaveBeenCalledWith(
        path.join('tmp', 'test-id-overlay-0.txt'),
        "It's a \"test\": part 1, part 2",
        'utf8'
      );
      expect(result).toContain('textfile=');
      expect(textFilePaths).toHaveLength(1);
      expect(textFilePaths[0]).toBe(path.join('tmp', 'test-id-overlay-0.txt'));

      writeSpy.mockRestore();
    });

    it('escapes drive-letter colons in the textfile path so ffmpeg does not mis-parse it as a filter option', () => {
      const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue('C:\\app');
      const textFilePaths = [];

      const result = videoProcessorFacade._buildVideoFilters({
        aspectRatio: 'original',
        keyframes: [],
        textOverlays: [{ text: 'hello', color: 'white', size: 24, x: 50, y: 50 }],
        subtitles: [],
        startTime: 0,
        tempDir: 'C:\\app\\uploads\\temp',
        uniqueId: 'test-id',
        textFilePaths
      });

      // The literal file-system path (as tracked for cleanup) keeps its real colon...
      expect(textFilePaths[0]).toContain('C:');
      // ...but the filtergraph argument must have it escaped so ffmpeg doesn't
      // treat "C" as the textfile value and ":\\app\\..." as a bogus option.
      expect(result).toContain('textfile=\'C\\:');

      writeSpy.mockRestore();
      cwdSpy.mockRestore();
    });
  });

  describe('processVideo()', () => {
    let existsSyncSpy;
    let mkdirSyncSpy;
    let copyFileSyncSpy;
    let unlinkSyncSpy;

    beforeEach(() => {
      existsSyncSpy = jest.spyOn(fs, 'existsSync').mockImplementation(() => true);
      mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
      copyFileSyncSpy = jest.spyOn(fs, 'copyFileSync').mockImplementation(() => {});
      unlinkSyncSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});
    });

    afterEach(() => {
      existsSyncSpy.mockRestore();
      mkdirSyncSpy.mockRestore();
      copyFileSyncSpy.mockRestore();
      unlinkSyncSpy.mockRestore();
    });

    it('should complete processing and copy to brand folder when UPLOAD_STORAGE is local', async () => {
      const originalStorage = process.env.UPLOAD_STORAGE;
      process.env.UPLOAD_STORAGE = 'local';

      // Mock internal methods
      const resolveFileSpy = jest.spyOn(videoProcessorFacade, '_resolveFile').mockResolvedValue(true);
      const executeFfmpegSpy = jest.spyOn(videoProcessorFacade, '_executeFfmpeg').mockResolvedValue(true);

      const result = await videoProcessorFacade.processVideo({
        videoUrl: '/uploads/input.mp4',
        startTime: 0,
        endTime: 10,
        aspectRatio: 'original',
        keyframes: [],
        brandId: 'brand-123'
      });

      expect(result).toContain('/uploads/media/brand-123/');
      expect(resolveFileSpy).toHaveBeenCalledTimes(1);
      expect(executeFfmpegSpy).toHaveBeenCalledTimes(1);
      expect(unlinkSyncSpy).toHaveBeenCalled(); // cleanup temp

      resolveFileSpy.mockRestore();
      executeFfmpegSpy.mockRestore();
      process.env.UPLOAD_STORAGE = originalStorage;
    });

    it('should complete processing and upload to Cloudinary when UPLOAD_STORAGE is cloudinary', async () => {
      const originalStorage = process.env.UPLOAD_STORAGE;
      process.env.UPLOAD_STORAGE = 'cloudinary';

      const resolveFileSpy = jest.spyOn(videoProcessorFacade, '_resolveFile').mockResolvedValue(true);
      const executeFfmpegSpy = jest.spyOn(videoProcessorFacade, '_executeFfmpeg').mockResolvedValue(true);
      
      cloudinary.uploader.upload.mockImplementation((filePath, opts, cb) => {
        cb(null, { secure_url: 'https://cloudinary.com/result.mp4' });
      });

      const result = await videoProcessorFacade.processVideo({
        videoUrl: '/uploads/input.mp4',
        startTime: 0,
        endTime: 10,
        aspectRatio: 'original',
        keyframes: [],
        brandId: 'brand-123'
      });

      expect(result).toBe('https://cloudinary.com/result.mp4');
      expect(cloudinary.uploader.upload).toHaveBeenCalled();

      resolveFileSpy.mockRestore();
      executeFfmpegSpy.mockRestore();
      process.env.UPLOAD_STORAGE = originalStorage;
    });
  });
});
