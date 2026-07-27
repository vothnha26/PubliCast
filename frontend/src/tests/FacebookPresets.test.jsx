/* eslint-disable no-undef */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { FacebookPresets } from '../components/workspace/post-creator/presets/FacebookPresets';
import { usePostCreatorFormContext } from '../context/PostCreatorFormContext';

jest.mock('../context/PostCreatorFormContext');

describe('FacebookPresets Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render only Title field when facebookType is POST', () => {
    usePostCreatorFormContext.mockReturnValue({
      facebookOpen: true,
      setFacebookOpen: jest.fn(),
      facebookType: 'post',
      facebookTitle: '',
      setFacebookTitle: jest.fn(),
      facebookReelCollaboratorId: '',
      setFacebookReelCollaboratorId: jest.fn(),
      facebookReelPlaceId: '',
      setFacebookReelPlaceId: jest.fn(),
      facebookReelThumbnail: '',
      setFacebookReelThumbnail: jest.fn()
    });

    render(<FacebookPresets />);

    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Collaborator Page ID/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Place ID/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Custom Thumbnail URL/i)).not.toBeInTheDocument();
  });

  it('should render Reels advanced fields when facebookType is REEL', () => {
    usePostCreatorFormContext.mockReturnValue({
      facebookOpen: true,
      setFacebookOpen: jest.fn(),
      facebookType: 'reel',
      facebookTitle: '',
      setFacebookTitle: jest.fn(),
      facebookReelCollaboratorId: '',
      setFacebookReelCollaboratorId: jest.fn(),
      facebookReelPlaceId: '',
      setFacebookReelPlaceId: jest.fn(),
      facebookReelThumbnail: '',
      setFacebookReelThumbnail: jest.fn()
    });

    render(<FacebookPresets />);

    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Collaborator Page ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Place ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Custom Thumbnail URL/i)).toBeInTheDocument();
  });
});
