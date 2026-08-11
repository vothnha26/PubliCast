jest.mock('../../src/services/workspace/team.service', () => ({
  getTeamMembers: jest.fn(),
  inviteMembers: jest.fn(),
  validateInvitation: jest.fn(),
  acceptInvitation: jest.fn(),
  updateMemberRole: jest.fn(),
  removeMember: jest.fn(),
  resendInvitation: jest.fn()
}));
jest.mock('../../src/utils/cookie.utils', () => ({
  setAuthCookies: jest.fn()
}));

const teamService = require('../../src/services/workspace/team.service');
const teamController = require('../../src/controllers/workspace/team.controller');
const teamControllerV2 = require('../../src/controllers/workspace/team.controller.v2');

function mockReqRes({ query = {}, params = {}, body = {}, user = { id: 'user-1' } } = {}) {
  const req = { query, params, body, user };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res };
}

function callHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    handler(req, res, (err) => (err ? reject(err) : resolve()));
    setImmediate(resolve);
  });
}

describe('TeamController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTeamMembers', () => {
    it('400s without brandId, on both versions', async () => {
      const v1 = mockReqRes({ query: {} });
      await callHandler(teamController.getTeamMembers, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(400);

      const v2 = mockReqRes({ query: {} });
      await callHandler(teamControllerV2.getTeamMembers, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(400);
    });

    it('both keep the flat {message, data, meta} shape (not nested under data)', async () => {
      teamService.getTeamMembers.mockResolvedValue({ data: [{ id: 'm1' }], meta: { total: 1 } });

      const v1 = mockReqRes({ query: { brandId: 'b1' } });
      await callHandler(teamController.getTeamMembers, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ message: 'Team members retrieved successfully', data: [{ id: 'm1' }], meta: { total: 1 } });

      const v2 = mockReqRes({ query: { brandId: 'b1' } });
      await callHandler(teamControllerV2.getTeamMembers, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Team members retrieved successfully', data: [{ id: 'm1' }], meta: { total: 1 } });
    });
  });

  describe('inviteMember', () => {
    it('v1 and v2 both return the raw service result (not wrapped under data)', async () => {
      teamService.inviteMembers.mockResolvedValue({ message: 'Đã xử lý mời thành viên. Thành công: 1, Thất bại: 0', successes: ['a@x.com'], failures: [] });

      const v1 = mockReqRes({ body: { email: 'a@x.com', role: 'MEMBER', brandId: 'b1' } });
      await callHandler(teamController.inviteMember, v1.req, v1.res);
      expect(v1.res.status).toHaveBeenCalledWith(201);
      expect(v1.res.json).toHaveBeenCalledWith({ message: 'Đã xử lý mời thành viên. Thành công: 1, Thất bại: 0', successes: ['a@x.com'], failures: [] });

      const v2 = mockReqRes({ body: { email: 'a@x.com', role: 'MEMBER', brandId: 'b1' } });
      await callHandler(teamControllerV2.inviteMember, v2.req, v2.res);
      expect(v2.res.status).toHaveBeenCalledWith(201);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Đã xử lý mời thành viên. Thành công: 1, Thất bại: 0', successes: ['a@x.com'], failures: [] });
    });
  });

  describe('validateInvitation', () => {
    it('v1 and v2 both return the raw invitation details (no data key)', async () => {
      teamService.validateInvitation.mockResolvedValue({ email: 'a@x.com', brandName: 'Acme', inviterName: 'Bob', isNewUser: true });

      const v2 = mockReqRes({ query: { token: 'tok' } });
      await callHandler(teamControllerV2.validateInvitation, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ email: 'a@x.com', brandName: 'Acme', inviterName: 'Bob', isNewUser: true });
    });
  });

  describe('updateMemberRole', () => {
    it('v1 and v2 both wrap the result under {message, data}', async () => {
      teamService.updateMemberRole.mockResolvedValue({ id: 'm1', role: 'ADMIN' });

      const v1 = mockReqRes({ params: { id: 'm1' }, body: { role: 'ADMIN' } });
      await callHandler(teamController.updateMemberRole, v1.req, v1.res);
      expect(v1.res.json).toHaveBeenCalledWith({ message: 'Member role updated successfully', data: { id: 'm1', role: 'ADMIN' } });

      const v2 = mockReqRes({ params: { id: 'm1' }, body: { role: 'ADMIN' } });
      await callHandler(teamControllerV2.updateMemberRole, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Member role updated successfully', data: { id: 'm1', role: 'ADMIN' } });
    });
  });

  describe('removeMember / resendInvitation', () => {
    it('both return the raw {message} result, on both versions', async () => {
      teamService.removeMember.mockResolvedValue({ message: 'Đã xóa thành viên khỏi thương hiệu thành công' });

      const v2 = mockReqRes({ params: { id: 'm1' } });
      await callHandler(teamControllerV2.removeMember, v2.req, v2.res);
      expect(v2.res.json).toHaveBeenCalledWith({ message: 'Đã xóa thành viên khỏi thương hiệu thành công' });
    });
  });
});
