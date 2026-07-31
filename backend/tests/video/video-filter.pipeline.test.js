const fs = require('fs');
const path = require('path');
const videoFilterPipeline = require('../../src/services/workspace/video/video-filter.pipeline');
const { FILTER_PRESETS, ASPECT_RATIOS } = require('../../src/constants/video-editor.constants');

describe('VideoFilterPipeline Unit Tests', () => {
  let writeFileSyncSpy;

  beforeEach(() => {
    writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
  });

  afterEach(() => {
    writeFileSyncSpy.mockRestore();
  });

  it('should build filtergraph for crop & aspect ratio', () => {
    const filter = videoFilterPipeline.buildPipeline({
      aspectRatio: ASPECT_RATIOS.SQUARE_1_1,
      keyframes: []
    });

    expect(filter).toContain('crop=min(iw\\,ih):min(iw\\,ih)');
    expect(filter).toContain('scale=720:720');
  });

  it('should build filtergraph for brightness, contrast, and saturation adjustments', () => {
    const filter = videoFilterPipeline.buildPipeline({
      adjustments: { brightness: 20, contrast: 10, saturation: 15 }
    });

    expect(filter).toContain('eq=brightness=0.20:contrast=1.10:saturation=1.15');
  });

  it('should build filtergraph for color preset filters (mono, sepia, cold, etc.)', () => {
    const monoFilter = videoFilterPipeline.buildPipeline({ filterPreset: FILTER_PRESETS.MONO });
    expect(monoFilter).toBe('hue=s=0,eq=contrast=1.25');

    const sepiaFilter = videoFilterPipeline.buildPipeline({ filterPreset: FILTER_PRESETS.SEPIA });
    expect(sepiaFilter).toContain('colorchannelmixer=');

    const coldFilter = videoFilterPipeline.buildPipeline({ filterPreset: FILTER_PRESETS.COLD });
    expect(coldFilter).toBe('hue=h=195:s=0.9,eq=brightness=0.05');
  });

  it('should build filtergraph for custom resize dimensions', () => {
    const filter = videoFilterPipeline.buildPipeline({
      resize: { width: 1920, height: 1080 }
    });

    expect(filter).toBe('scale=1920:1080');
  });

  it('should combine multiple filter strategies in correct order and ignore custom resize when non-original aspect ratio is used', () => {
    const filter = videoFilterPipeline.buildPipeline({
      aspectRatio: ASPECT_RATIOS.VERTICAL_9_16,
      adjustments: { brightness: 10, contrast: 0, saturation: 0 },
      filterPreset: FILTER_PRESETS.COLD,
      resize: { width: 999, height: 999 }
    });

    expect(filter).toContain('crop=');
    expect(filter).toContain('scale=720:1280');
    expect(filter).not.toContain('scale=999:999');
    expect(filter).toContain('eq=brightness=0.10');
    expect(filter).toContain('hue=h=195');
  });
});
