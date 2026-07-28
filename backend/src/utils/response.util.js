function sendSuccess(res, data, message = 'Success', status = 200) {
  return res.status(status).json({ message, data });
}

module.exports = { sendSuccess };
