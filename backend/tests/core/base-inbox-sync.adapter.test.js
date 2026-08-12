const BaseInboxSyncAdapter = require('../../src/core/inbox/base-inbox-sync.adapter');

class FakeAdapter extends BaseInboxSyncAdapter {
  get platform() { return 'FACEBOOK'; }
}

describe('BaseInboxSyncAdapter', () => {
  const adapter = new FakeAdapter();

  describe('platform', () => {
    it('throws on the base class since platform is abstract', () => {
      const base = new BaseInboxSyncAdapter();
      expect(() => base.platform).toThrow('Abstract property platform must be implemented');
    });
  });

  describe('supports', () => {
    it('matches the platform case-insensitively', () => {
      expect(adapter.supports('facebook')).toBe(true);
      expect(adapter.supports('FACEBOOK')).toBe(true);
    });

    it('returns false for a different platform', () => {
      expect(adapter.supports('INSTAGRAM')).toBe(false);
    });

    it('returns false for a falsy platform', () => {
      expect(adapter.supports(null)).toBe(false);
      expect(adapter.supports(undefined)).toBe(false);
      expect(adapter.supports('')).toBe(false);
    });
  });

  describe('supportsReply', () => {
    it('matches an item whose platform matches, case-insensitively', () => {
      expect(adapter.supportsReply({ platform: 'facebook' })).toBe(true);
    });

    it('returns false when the item platform differs', () => {
      expect(adapter.supportsReply({ platform: 'INSTAGRAM' })).toBe(false);
    });

    it('returns false for a null/undefined item or missing platform', () => {
      expect(adapter.supportsReply(null)).toBe(false);
      expect(adapter.supportsReply(undefined)).toBe(false);
      expect(adapter.supportsReply({})).toBe(false);
    });
  });

  describe('supportsNewComment', () => {
    it('matches the platform case-insensitively', () => {
      expect(adapter.supportsNewComment('Facebook')).toBe(true);
    });

    it('returns false for a falsy platform', () => {
      expect(adapter.supportsNewComment(null)).toBe(false);
    });
  });

  describe('unimplemented abstract methods', () => {
    it('sync rejects as not implemented', async () => {
      await expect(adapter.sync('brand-1', {})).rejects.toThrow('Abstract method sync must be implemented');
    });

    it('syncPostComments resolves to an empty array by default', async () => {
      await expect(adapter.syncPostComments('brand-1', 'post-1', {})).resolves.toEqual([]);
    });

    it('reply rejects as not implemented', async () => {
      await expect(adapter.reply('brand-1', 'item-1', 'hello')).rejects.toThrow('Abstract method reply must be implemented');
    });

    it('createComment rejects as not implemented', async () => {
      await expect(adapter.createComment('brand-1', 'post-1', 'hello')).rejects.toThrow('Abstract method createComment must be implemented');
    });

    it('updateReply rejects as not implemented', async () => {
      await expect(adapter.updateReply('brand-1', 'item-1', 'hello')).rejects.toThrow('Abstract method updateReply must be implemented');
    });

    it('deleteReply rejects as not implemented', async () => {
      await expect(adapter.deleteReply('brand-1', 'item-1')).rejects.toThrow('Abstract method deleteReply must be implemented');
    });
  });
});
