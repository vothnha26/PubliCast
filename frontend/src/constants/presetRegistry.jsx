import React from 'react';
import { PLATFORMS } from './platforms';
import { YouTubePresets } from '../components/workspace/post-creator/presets/YouTubePresets';
import { FacebookPresets } from '../components/workspace/post-creator/presets/FacebookPresets';
import { InstagramPresets } from '../components/workspace/post-creator/presets/InstagramPresets';
import { TikTokPresets } from '../components/workspace/post-creator/presets/TikTokPresets';
import { ThreadsPresets } from '../components/workspace/post-creator/presets/ThreadsPresets';

export const PRESET_REGISTRY = {
  [PLATFORMS.YOUTUBE]: {
    Component: YouTubePresets,
    shouldRender: (selectedPlatforms) => selectedPlatforms.includes('youtube')
  },
  [PLATFORMS.FACEBOOK]: {
    Component: FacebookPresets,
    shouldRender: (selectedPlatforms, options) => selectedPlatforms.includes('facebook') && options.facebookType === 'reel'
  },
  [PLATFORMS.INSTAGRAM]: {
    Component: InstagramPresets,
    shouldRender: (selectedPlatforms) => selectedPlatforms.includes('instagram')
  },
  [PLATFORMS.TIKTOK]: {
    Component: TikTokPresets,
    shouldRender: (selectedPlatforms) => selectedPlatforms.includes('tiktok')
  },
  [PLATFORMS.THREADS]: {
    Component: ThreadsPresets,
    shouldRender: (selectedPlatforms) => selectedPlatforms.includes('threads')
  }
};
