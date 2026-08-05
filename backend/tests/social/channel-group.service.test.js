jest.mock('../../src/repositories/social/channel-group.repository', () => ({
  findVisibleToUser: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  setMembers: jest.fn()
}));

jest.mock('../../src/repositories/social/social-account.repository', () => ({
  findById: jest.fn()
}));

const channelGroupService = require('../../src/services/social/channel-group.service');
const channelGroupRepository = require('../../src/repositories/social/channel-group.repository');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');

describe('ChannelGroupService', () => {
  beforeEach(() => jest.resetAllMocks());

  describe('listByBrand', () => {
    it('formats groups with member channel details', async () => {
      channelGroupRepository.findVisibleToUser.mockResolvedValue([{
        id: 'group-1', brandId: 'brand-1', createdByUserId: 'user-1', name: 'Client A', color: '#ff0000',
        visibility: 'TEAM', createdAt: new Date(),
        members: [{
          socialAccountId: 'sa-1',
          socialAccount: { platform: 'FACEBOOK', username: 'clienta', displayName: 'Client A Page', profilePictureUrl: null }
        }]
      }]);

      const result = await channelGroupService.listByBrand('brand-1', 'user-1');

      expect(channelGroupRepository.findVisibleToUser).toHaveBeenCalledWith('brand-1', 'user-1');
      expect(result).toEqual([{
        id: 'group-1', brandId: 'brand-1', createdByUserId: 'user-1', name: 'Client A', color: '#ff0000',
        visibility: 'TEAM', createdAt: expect.any(Date),
        members: [{
          socialAccountId: 'sa-1', platform: 'FACEBOOK', username: 'clienta',
          displayName: 'Client A Page', profilePictureUrl: null
        }]
      }]);
    });
  });

  describe('create', () => {
    it('trims the name and creates a group with an empty member list', async () => {
      channelGroupRepository.create.mockResolvedValue({
        id: 'group-1', brandId: 'brand-1', createdByUserId: 'user-1', name: 'Client A', color: null,
        visibility: 'TEAM', createdAt: new Date()
      });

      const result = await channelGroupService.create('brand-1', 'user-1', { name: '  Client A  ' });

      expect(channelGroupRepository.create).toHaveBeenCalledWith('brand-1', 'user-1', { name: 'Client A', color: undefined, visibility: 'TEAM' });
      expect(result.members).toEqual([]);
    });

    it('rejects an empty/whitespace-only name', async () => {
      await expect(channelGroupService.create('brand-1', 'user-1', { name: '   ' }))
        .rejects.toMatchObject({ status: 400 });

      expect(channelGroupRepository.create).not.toHaveBeenCalled();
    });

    it('rejects an invalid visibility value', async () => {
      await expect(channelGroupService.create('brand-1', 'user-1', { name: 'Client A', visibility: 'PUBLIC' }))
        .rejects.toMatchObject({ status: 400 });

      expect(channelGroupRepository.create).not.toHaveBeenCalled();
    });

    it('accepts PRIVATE visibility', async () => {
      channelGroupRepository.create.mockResolvedValue({
        id: 'group-1', brandId: 'brand-1', createdByUserId: 'user-1', name: 'My Scratch', color: null,
        visibility: 'PRIVATE', createdAt: new Date()
      });

      await channelGroupService.create('brand-1', 'user-1', { name: 'My Scratch', visibility: 'PRIVATE' });

      expect(channelGroupRepository.create).toHaveBeenCalledWith('brand-1', 'user-1', { name: 'My Scratch', color: undefined, visibility: 'PRIVATE' });
    });

    it('surfaces a 409 when the group name already exists for this creator/brand', async () => {
      const dupError = new Error('duplicate');
      dupError.code = 'P2002';
      channelGroupRepository.create.mockRejectedValue(dupError);

      await expect(channelGroupService.create('brand-1', 'user-1', { name: 'Client A' }))
        .rejects.toMatchObject({ status: 409 });
    });
  });

  describe('update', () => {
    it('throws 404 when the group does not belong to the requesting brand', async () => {
      channelGroupRepository.findById.mockResolvedValue({ id: 'group-1', brandId: 'other-brand', visibility: 'TEAM' });

      await expect(channelGroupService.update('group-1', 'brand-1', 'user-1', { name: 'New name' }))
        .rejects.toMatchObject({ status: 404 });

      expect(channelGroupRepository.update).not.toHaveBeenCalled();
    });

    it('throws 404 when a PRIVATE group belongs to a different user (existence not leaked)', async () => {
      channelGroupRepository.findById.mockResolvedValue({
        id: 'group-1', brandId: 'brand-1', createdByUserId: 'other-user', visibility: 'PRIVATE'
      });

      await expect(channelGroupService.update('group-1', 'brand-1', 'user-1', { name: 'New name' }))
        .rejects.toMatchObject({ status: 404 });

      expect(channelGroupRepository.update).not.toHaveBeenCalled();
    });

    it('allows the creator to edit their own PRIVATE group', async () => {
      channelGroupRepository.findById
        .mockResolvedValueOnce({ id: 'group-1', brandId: 'brand-1', createdByUserId: 'user-1', visibility: 'PRIVATE' })
        .mockResolvedValueOnce({ id: 'group-1', brandId: 'brand-1', createdByUserId: 'user-1', visibility: 'PRIVATE', name: 'Renamed', members: [] });

      await channelGroupService.update('group-1', 'brand-1', 'user-1', { name: 'Renamed' });

      expect(channelGroupRepository.update).toHaveBeenCalledWith('group-1', { name: 'Renamed', color: undefined, visibility: undefined });
    });

    it('rejects reassigning a channel that belongs to a different brand (#IDOR guard)', async () => {
      channelGroupRepository.findById
        .mockResolvedValueOnce({ id: 'group-1', brandId: 'brand-1', visibility: 'TEAM' })
        .mockResolvedValueOnce({ id: 'group-1', brandId: 'brand-1', visibility: 'TEAM', members: [] });
      socialAccountRepository.findById.mockResolvedValue({ id: 'sa-victim', brandId: 'other-brand' });

      await expect(channelGroupService.update('group-1', 'brand-1', 'user-1', { socialAccountIds: ['sa-victim'] }))
        .rejects.toMatchObject({ status: 403 });

      expect(channelGroupRepository.setMembers).not.toHaveBeenCalled();
    });

    it('replaces members when socialAccountIds all belong to the brand', async () => {
      channelGroupRepository.findById
        .mockResolvedValueOnce({ id: 'group-1', brandId: 'brand-1', visibility: 'TEAM' })
        .mockResolvedValueOnce({ id: 'group-1', brandId: 'brand-1', visibility: 'TEAM', name: 'Client A', members: [] });
      socialAccountRepository.findById.mockResolvedValue({ id: 'sa-1', brandId: 'brand-1' });

      await channelGroupService.update('group-1', 'brand-1', 'user-1', { socialAccountIds: ['sa-1'] });

      expect(channelGroupRepository.setMembers).toHaveBeenCalledWith('group-1', ['sa-1']);
    });
  });

  describe('delete', () => {
    it('throws 404 when the group does not belong to the requesting brand', async () => {
      channelGroupRepository.findById.mockResolvedValue({ id: 'group-1', brandId: 'other-brand', visibility: 'TEAM' });

      await expect(channelGroupService.delete('group-1', 'brand-1', 'user-1'))
        .rejects.toMatchObject({ status: 404 });

      expect(channelGroupRepository.delete).not.toHaveBeenCalled();
    });

    it('throws 404 when a PRIVATE group belongs to a different user', async () => {
      channelGroupRepository.findById.mockResolvedValue({
        id: 'group-1', brandId: 'brand-1', createdByUserId: 'other-user', visibility: 'PRIVATE'
      });

      await expect(channelGroupService.delete('group-1', 'brand-1', 'user-1'))
        .rejects.toMatchObject({ status: 404 });

      expect(channelGroupRepository.delete).not.toHaveBeenCalled();
    });

    it('deletes a TEAM group regardless of who created it, as long as requester is in the brand', async () => {
      channelGroupRepository.findById.mockResolvedValue({
        id: 'group-1', brandId: 'brand-1', createdByUserId: 'other-user', visibility: 'TEAM'
      });

      await channelGroupService.delete('group-1', 'brand-1', 'user-1');

      expect(channelGroupRepository.delete).toHaveBeenCalledWith('group-1');
    });

    it('deletes a PRIVATE group when the requester is the creator', async () => {
      channelGroupRepository.findById.mockResolvedValue({
        id: 'group-1', brandId: 'brand-1', createdByUserId: 'user-1', visibility: 'PRIVATE'
      });

      await channelGroupService.delete('group-1', 'brand-1', 'user-1');

      expect(channelGroupRepository.delete).toHaveBeenCalledWith('group-1');
    });
  });
});
