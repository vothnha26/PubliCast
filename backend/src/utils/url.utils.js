const isRemoteUrl = (value) => value.startsWith('http://') || value.startsWith('https://');

module.exports = { isRemoteUrl };
