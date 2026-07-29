const videoFilterPipeline = require('../../src/services/workspace/video/video-filter.pipeline');
const { ASPECT_RATIOS, FILTER_PRESETS } = require('../../src/constants/video-editor.constants');

describe('VideoFilterPipeline Unit Tests (Strategy Pattern & No Magic Strings)', () => {
  it('should build combined filter string for crop, adjustments, filter preset, text overlay, and subtitles', () => {
    const filterString = videoFilterPipeline.buildPipeline({
      aspectRatio: ASPECT_RATIOS.SQUARE_1_1,
      adjustments: { brightness: 10, contrast: 20, saturation: -10 },
      filterPreset: FILTER_PRESETS.GRAYSCALE,
      textOverlays: [{ text: 'Hello World', color: 'red', size: 30, x: 50, y: 50 }],
      subtitles: [{ text: 'Sample Subtitle', start: 2, end: 5 }],
      startTime: 1,
      tempDir: 'C:/temp',
      uniqueId: 'test-id-123',
      textFilePaths: []
    });

    expect(filterString).toContain('crop=min(iw\\,ih):min(iw\\,ih)');
    expect(filterString).toContain('scale=720:720');
    expect(filterString).toContain('eq=brightness=0.10:contrast=1.20:saturation=0.90');
    expect(filterString).toContain('hue=s=0');
    expect(filterString).toContain('drawtext=textfile=');
  });

  it('should apply custom resize strategy when provided with valid dimensions and original aspectRatio', () => {
    const filterString = videoFilterPipeline.buildPipeline({
      aspectRatio: ASPECT_RATIOS.ORIGINAL,
      resize: { width: 1920, height: 1080 }
    });

    expect(filterString).toBe('scale=1920:1080');
  });

  it('should ignore custom resize strategy if aspectRatio is non-original (e.g. 1:1) to prevent double scaling', () => {
    const filterString = videoFilterPipeline.buildPipeline({
      aspectRatio: ASPECT_RATIOS.SQUARE_1_1,
      resize: { width: 1920, height: 1080 }
    });

    // Should only contain the crop/scale from CropScaleFilterStrategy (720:720), NOT scale=1920:1080
    expect(filterString).toContain('scale=720:720');
    expect(filterString).not.toContain('scale=1920:1080');
  });

  it('should apply color preset strategy correctly (Sepia & Vintage)', () => {
    const sepiaString = videoFilterPipeline.buildPipeline({
      filterPreset: FILTER_PRESETS.SEPIA
    });
    expect(sepiaString).toContain('colorchannelmixer=.393:.769:.189');

    const vintageString = videoFilterPipeline.buildPipeline({
      filterPreset: FILTER_PRESETS.VINTAGE
    });
    expect(vintageString).toContain('colorbalance=rs=.1:gs=-.05:bs=-.2');
  });

  it('should return empty filter string when no strategies apply', () => {
    const filterString = videoFilterPipeline.buildPipeline({
      aspectRatio: ASPECT_RATIOS.ORIGINAL,
      filterPreset: FILTER_PRESETS.NONE
    });

    expect(filterString).toBe('');
  });
});
