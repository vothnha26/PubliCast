/* eslint-disable no-undef */
import { renderHook, act } from '@testing-library/react';
import { usePostCreatorForm } from '../hooks/usePostCreatorForm';

// Mock hook dependencies
jest.mock('../hooks/usePostCreator', () => () => ({
  restoreFormState: jest.fn(),
  openPostCreator: jest.fn()
}));
jest.mock('../context/BrandContext', () => ({
  useBrand: () => ({ activeBrand: { id: 'brand_1' } })
}));
jest.mock('../store/useAuthStore', () => ({
  useAuthStore: {
    getState: () => ({ isAuthenticated: true, user: { id: 'user_1' } })
  }
}));

describe('usePostCreatorForm Hook Reels States Tests', () => {
  it('should initialize Reels advanced options states with empty strings', () => {
    const { result } = renderHook(() => usePostCreatorForm());

    expect(result.current.facebookReelThumbnail).toBe('');
  });

  it('should backup and restore Reels advanced options correctly', () => {
    const { result } = renderHook(() => usePostCreatorForm());

    act(() => {
      result.current.setFacebookReelThumbnail('https://example.com/thumb.jpg');
    });

    const backup = result.current.getBackupPayload();
    expect(backup.facebookReelThumbnail).toBe('https://example.com/thumb.jpg');
  });
});
