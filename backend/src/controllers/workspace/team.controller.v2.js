const teamService = require('../../services/workspace/team.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success, v2Error } = require('../../utils/response.helper');

/**
 * inviteMember, validateInvitation, acceptInvitation, removeMember and
 * resendInvitation intentionally do NOT use the v2Success {message, data}
 * envelope — the underlying team.service.js methods return custom flat
 * shapes (e.g. { message, team, token }, { email, brandName, ... }) that
 * the frontend (frontend/src/services/team.service.js) reads fields off
 * directly at the top level, matching v1 exactly, same as v1.
 */
class TeamControllerV2 {
  getTeamMembers = asyncHandler(async (req, res) => {
    const brandId = req.query.brandId;
    if (!brandId) {
      return v2Error(res, 'Missing brandId query parameter', 400);
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
      return v2Error(res, 'Missing required body fields: email or emails, role, brandId', 400);
    }
    if (!role || !brandId) {
      return v2Error(res, 'Missing required body fields: role, brandId', 400);
    }

    let emailList = [];
    if (emails && Array.isArray(emails)) {
      emailList = emails;
    } else if (email) {
      emailList = [email];
    }

    emailList = emailList.map(e => typeof e === 'string' ? e.trim() : '').filter(Boolean);

    if (emailList.length === 0) {
      return v2Error(res, 'No valid email addresses provided', 400);
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
      return v2Error(res, 'Missing token parameter', 400);
    }

    const result = await teamService.validateInvitation(token);
    res.status(200).json(result);
  });

  acceptInvitation = asyncHandler(async (req, res) => {
    const { token, name, password } = req.body;
    if (!token) {
      return v2Error(res, 'Missing required body field: token', 400);
    }

    const result = await teamService.acceptInvitation({ token, name, password });

    if (result.accessToken && result.refreshToken) {
      const { setAuthCookies } = require('../../utils/cookie.utils');
      setAuthCookies(res, result.accessToken, result.refreshToken, req);
    }

    res.status(200).json({
      message: result.message,
      brandId: result.brandId,
      user: result.user
    });
  });

  updateMemberRole = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    if (!role) {
      return v2Error(res, 'Missing role body parameter', 400);
    }

    const result = await teamService.updateMemberRole(id, role, req.user.id);
    v2Success(res, result, 'Member role updated successfully');
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

module.exports = new TeamControllerV2();
