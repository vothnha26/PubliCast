const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');

// Mock dependencies
jest.mock('child_process', () => ({
  exec: jest.fn()
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
    it('should construct correct command and execute it via child_process.exec', async () => {
      exec.mockImplementation((cmd, cb) => {
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
        audioVolume: 50
      };

      await videoProcessorFacade._executeFfmpeg(params);

      expect(exec).toHaveBeenCalledTimes(1);
      const callArgs = exec.mock.calls[0];
      const cmd = callArgs[0];
      expect(cmd).toContain('ffmpeg');
      expect(cmd).toContain('-ss 0');
      expect(cmd).toContain('-t 10');
      expect(cmd).toContain('crop=');
    });

    it('should reject if FFmpeg fails', async () => {
      exec.mockImplementation((cmd, cb) => {
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
        audioVolume: 50
      };

      await expect(videoProcessorFacade._executeFfmpeg(params))
        .rejects.toThrow('FFmpeg failed to process video');
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
