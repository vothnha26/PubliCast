const teamService = require('../../services/workspace/team.service');
const asyncHandler = require('../../utils/async-handler');

class TeamController {
  getTeamMembers = asyncHandler(async (req, res) => {
    const brandId = req.query.brandId;
    if (!brandId) {
      return res.status(400).json({ message: 'Missing brandId query parameter' });
    }
    const result = await teamService.getTeamMembers(req.query, brandId);

    res.status(200).json({
      message: 'Team members retrieved successfully',
      ...result
    });
  });

  inviteMember = asyncHandler(async (req, res) => {
    const { email, emails, role, brandId } = req.body;
    if (!email && (!emails || !Array.isArray(emails))) {
      return res.status(400).json({ message: 'Missing required body fields: email or emails, role, brandId' });
    }
    if (!role || !brandId) {
      return res.status(400).json({ message: 'Missing required body fields: role, brandId' });
    }

    let emailList = [];
    if (emails && Array.isArray(emails)) {
      emailList = emails;
    } else if (email) {
      emailList = [email];
    }

    emailList = emailList.map(e => typeof e === 'string' ? e.trim() : '').filter(Boolean);

    if (emailList.length === 0) {
      return res.status(400).json({ message: 'No valid email addresses provided' });
    }

    const result = await teamService.inviteMembers({
      emails: emailList,
      role,
      brandId,
      invitedByUserId: req.user.id
    });

    res.status(201).json(result);
  });

  validateInvitation = asyncHandler(async (req, res) => {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: 'Missing token parameter' });
    }

    const result = await teamService.validateInvitation(token);
    res.status(200).json(result);
  });

  acceptInvitation = asyncHandler(async (req, res) => {
    const { token, name, password } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Missing required body field: token' });
    }

    const result = await teamService.acceptInvitation({ token, name, password });
    
    if (result.accessToken && result.refreshToken) {
      const { setAuthCookies } = require('../../utils/cookie.utils');
      setAuthCookies(res, result.accessToken, result.refreshToken);
    }

    res.status(200).json(result);
  });

  updateMemberRole = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ message: 'Missing role body parameter' });
    }

    const result = await teamService.updateMemberRole(id, role, req.user.id);
    res.status(200).json({
      message: 'Member role updated successfully',
      data: result
    });
  });

  removeMember = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await teamService.removeMember(id, req.user.id);
    res.status(200).json(result);
  });

  resendInvitation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await teamService.resendInvitation(id, req.user.id);
    res.status(200).json(result);
  });
}

module.exports = new TeamController();
