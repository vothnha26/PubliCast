const cloudinary = require('../../config/cloudinary').cloudinary;
const asyncHandler = require('../../utils/async-handler');

/**
 * Generate a signed upload signature for Cloudinary
 * This allows the client to upload directly to Cloudinary safely
 */
const generateSignature = asyncHandler(async (req, res) => {
  const { folder = 'publicast/others', resource_type = 'auto' } = req.query;
  
  const timestamp = Math.round(new Date().getTime() / 1000);
  
  // These parameters MUST match what the client sends
  const paramsToSign = {
    timestamp,
    folder,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  );

  res.status(200).json({
    data: {
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder
    }
  });
});

module.exports = {
  generateSignature
};
