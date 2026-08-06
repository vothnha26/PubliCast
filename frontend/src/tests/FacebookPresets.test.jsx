/* eslint-disable no-undef */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { FacebookPresets } from '../components/workspace/post-creator/presets/FacebookPresets';
import { usePostCreatorFormContext } from '../context/PostCreatorFormContext';

jest.mock('../context/PostCreatorFormContext');

const baseContext = {
  facebookOpen: true,
  setFacebookOpen: jest.fn(),
  facebookTitle: '',
  setFacebookTitle: jest.fn(),
  selectedAccountIds: [],
  activeBrand: { id: 'brand-1', socialAccounts: [] },
  networkCustom: {},
  activeNetworkAccountId: null,
  updateNetworkSetting: jest.fn()
};

describe('FacebookPresets Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the Title field', () => {
    usePostCreatorFormContext.mockReturnValue({ ...baseContext });

    render(<FacebookPresets />);

    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.queryByText(/Collaborator Page ID/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Place ID/i)).not.toBeInTheDocument();
  });
});
