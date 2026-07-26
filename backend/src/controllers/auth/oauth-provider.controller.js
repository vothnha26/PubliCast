const prisma = require('../../config/prisma');
const asyncHandler = require('../../utils/async-handler');
const oauthCodeStore = require('../../utils/oauth-code-store');

class OAuthProviderController {
  /**
   * GET /oauth/authorize
   * Renders consent UI or redirects to login if user session does not exist.
   */
  renderAuthorizePage = asyncHandler(async (req, res) => {
    const { client_id, redirect_uri, state, response_type } = req.query;

    if (!client_id || !redirect_uri || !state) {
      return res.status(400).send('<h1>Bad Request</h1><p>Missing required OAuth parameters (client_id, redirect_uri, state).</p>');
    }

    // Check user session
    const userId = req.user?.id || req.session?.userId;
    if (!userId) {
      // User not logged into PubliCast yet — redirect to PubliCast login with returnTo
      const returnUrl = encodeURIComponent(req.originalUrl);
      return res.redirect(`/login?returnTo=${returnUrl}`);
    }

    // Get user's active brand
    const userBrands = await prisma.team.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { brand: true },
    });

    const ownedBrands = await prisma.brand.findMany({
      where: { ownerId: userId, deletedAt: null },
    });

    const allBrands = [
      ...ownedBrands,
      ...userBrands.map((t) => t.brand),
    ];

    if (allBrands.length === 0) {
      return res.status(400).send('<h1>No Brands Found</h1><p>You must own or belong to at least one active brand in PubliCast.</p>');
    }

    const primaryBrand = allBrands[0];

    // Auto-consent mode or HTML Consent Screen
    if (req.headers.accept?.includes('application/json')) {
      return res.json({
        client_id,
        redirect_uri,
        state,
        user: { id: userId },
        brand: primaryBrand,
      });
    }

    // Render simple HTML consent interface
    const html = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <title>Ủy quyền truy cập — PubliCast</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); max-width: 400px; width: 100%; text-align: center; }
          .btn { display: inline-block; width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: none; font-weight: bold; cursor: pointer; margin-top: 0.75rem; text-decoration: none; }
          .btn-primary { background: #4f46e5; color: white; }
          .btn-danger { background: #ef4444; color: white; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Ủy quyền cho Convo</h2>
          <p>Ứng dụng <strong>Convo</strong> đang yêu cầu truy cập vào thương hiệu <strong>${primaryBrand.name}</strong> của bạn trên PubliCast.</p>
          <form method="POST" action="/oauth/authorize">
            <input type="hidden" name="client_id" value="${client_id}" />
            <input type="hidden" name="redirect_uri" value="${redirect_uri}" />
            <input type="hidden" name="state" value="${state}" />
            <input type="hidden" name="brand_id" value="${primaryBrand.id}" />
            <input type="hidden" name="action" value="approve" />
            <button type="submit" class="btn btn-primary">Đồng ý Ủy quyền</button>
          </form>
          <form method="POST" action="/oauth/authorize">
            <input type="hidden" name="redirect_uri" value="${redirect_uri}" />
            <input type="hidden" name="state" value="${state}" />
            <input type="hidden" name="action" value="deny" />
            <button type="submit" class="btn btn-danger">Từ chối</button>
          </form>
        </div>
      </body>
      </html>
    `;

    res.send(html);
  });

  /**
   * POST /oauth/authorize
   * Handles user consent decision (approve/deny), issues single-use OAuth code, and redirects.
   */
  handleAuthorizeConsent = asyncHandler(async (req, res) => {
    const { redirect_uri, state, action, brand_id } = req.body;

    if (action === 'deny') {
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.set('error', 'access_denied');
      redirectUrl.searchParams.set('state', state);
      return res.redirect(redirectUrl.toString());
    }

    const userId = req.user?.id || req.session?.userId || req.body.user_id;
    if (!userId || !brand_id) {
      return res.status(400).send('Missing user or brand context for OAuth approval.');
    }

    // Generate single-use authorization code
    const code = oauthCodeStore.createCode(userId, brand_id);

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', code);
    redirectUrl.searchParams.set('state', state);

    return res.redirect(redirectUrl.toString());
  });
}

module.exports = new OAuthProviderController();
