/* eslint-disable no-undef */
import {
  mapNetworkOverridesToCustom,
  buildNetworkOverrides,
  formatOverrideMediaUrls,
} from '../utils/buildNetworkOverrides';
import { PLATFORMS } from '../constants/platforms';

describe('buildNetworkOverrides Utility Tests', () => {
  describe('formatOverrideMediaUrls', () => {
    it('should format string and object media URLs correctly and filter out blob/empty items', () => {
      const input = [
        'https://res.cloudinary.com/demo/image1.jpg',
        { path: 'https://res.cloudinary.com/demo/image2.jpg' },
        { previewUrl: 'https://res.cloudinary.com/demo/image3.jpg' },
        'blob:http://localhost:3000/1234-5678',
        '',
        null,
      ];
      const result = formatOverrideMediaUrls(input);
      expect(result).toEqual([
        'https://res.cloudinary.com/demo/image1.jpg',
        'https://res.cloudinary.com/demo/image2.jpg',
        'https://res.cloudinary.com/demo/image3.jpg',
      ]);
    });
  });

  describe('mapNetworkOverridesToCustom (INBOUND)', () => {
    it('should convert backend networkOverrides payload array to networkCustom form state', () => {
      const networkOverrides = [
        {
          platform: 'FACEBOOK',
          useTemplate: false,
          caption: 'Facebook custom caption',
          mediaUrls: ['https://example.com/fb.jpg'],
          settings: { facebookType: 'POST' },
        },
        {
          platform: 'YOUTUBE',
          useTemplate: true,
          settings: { categoryId: '22', privacyStatus: 'public' },
        },
      ];

      const result = mapNetworkOverridesToCustom(networkOverrides);

      expect(result[PLATFORMS.FACEBOOK]).toMatchObject({
        useTemplate: false,
        caption: 'Facebook custom caption',
        mediaUrls: [{ file: null, previewUrl: 'https://example.com/fb.jpg', path: 'https://example.com/fb.jpg' }],
        settings: { facebookType: 'POST' },
      });

      expect(result[PLATFORMS.YOUTUBE]).toMatchObject({
        useTemplate: true,
        settings: { categoryId: '22', privacyStatus: 'public' },
      });
    });

    it('should handle perAccount overrides correctly', () => {
      const networkOverrides = [
        {
          platform: 'FACEBOOK',
          socialAccountId: 'acc_fb_1',
          useTemplate: false,
          caption: 'Caption Account 1',
        },
        {
          platform: 'FACEBOOK',
          socialAccountId: 'acc_fb_2',
          useTemplate: false,
          caption: 'Caption Account 2',
        },
      ];

      const result = mapNetworkOverridesToCustom(networkOverrides);

      expect(result[PLATFORMS.FACEBOOK].perAccount['acc_fb_1']).toMatchObject({
        useTemplate: false,
        caption: 'Caption Account 1',
      });
      expect(result[PLATFORMS.FACEBOOK].perAccount['acc_fb_2']).toMatchObject({
        useTemplate: false,
        caption: 'Caption Account 2',
      });
    });
  });

  describe('buildNetworkOverrides (OUTBOUND)', () => {
    const activeBrand = {
      id: 'brand_1',
      socialAccounts: [
        { id: 'acc_fb_1', platform: 'facebook' },
        { id: 'acc_yt_1', platform: 'youtube' },
      ],
    };

    it('should construct networkOverrides array for customized platform', () => {
      const networkCustom = {
        [PLATFORMS.FACEBOOK]: {
          useTemplate: false,
          caption: 'Custom FB post',
          mediaUrls: ['https://example.com/fb.jpg'],
          settings: {},
        },
      };

      const result = buildNetworkOverrides({
        networkCustom,
        selectedPlatforms: [PLATFORMS.FACEBOOK],
        selectedAccountIds: ['acc_fb_1'],
        activeBrand,
      });

      expect(result).toEqual([
        {
          platform: 'FACEBOOK',
          socialAccountId: 'acc_fb_1',
          useTemplate: false,
          caption: 'Custom FB post',
          mediaUrls: ['https://example.com/fb.jpg'],
        },
      ]);
    });

    it('should return empty array if no customizations or settings are changed', () => {
      const networkCustom = {
        [PLATFORMS.FACEBOOK]: {
          useTemplate: true,
          caption: '',
          mediaUrls: [],
          settings: {},
        },
      };

      const result = buildNetworkOverrides({
        networkCustom,
        selectedPlatforms: [PLATFORMS.FACEBOOK],
        selectedAccountIds: ['acc_fb_1'],
        activeBrand,
      });

      expect(result).toEqual([]);
    });
  });
});
