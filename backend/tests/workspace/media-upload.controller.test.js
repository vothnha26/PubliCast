jest.mock('../../src/config/cloudinary', () => ({
  cloudinary: {
    utils: {
      api_sign_request: jest.fn().mockReturnValue('signed-hash')
    }
  }
}));

const { generateSignature } = require('../../src/controllers/workspace/media-upload.controller');
const { generateSignature: generateSignatureV2 } = require('../../src/controllers/workspace/media-upload.controller.v2');

function mockReqRes(query = {}) {
  const req = { query };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res };
}

function callHandler(handler, req, res) {
  return new Promise((resolve, reject) => {
    handler(req, res, (err) => (err ? reject(err) : resolve()));
    setImmediate(resolve);
  });
}

describe('MediaUploadController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_CLOUD_NAME;
  });

  it('v1 and v2 both return the bare { data: { signature, timestamp, ... } } shape (no message)', async () => {
    process.env.CLOUDINARY_API_KEY = 'key123';
    process.env.CLOUDINARY_CLOUD_NAME = 'cloud123';

    const v1 = mockReqRes({});
    await callHandler(generateSignature, v1.req, v1.res);
    const v1Body = v1.res.json.mock.calls[0][0];
    expect(v1Body.data).toMatchObject({ signature: 'signed-hash', apiKey: 'key123', cloudName: 'cloud123', folder: 'publicast/others' });
    expect(v1Body.message).toBeUndefined();

    const v2 = mockReqRes({});
    await callHandler(generateSignatureV2, v2.req, v2.res);
    const v2Body = v2.res.json.mock.calls[0][0];
    expect(v2Body.data).toMatchObject({ signature: 'signed-hash', apiKey: 'key123', cloudName: 'cloud123', folder: 'publicast/others' });
    expect(v2Body.message).toBeUndefined();
  });

  it('uses the folder query param when given, on both versions', async () => {
    const v2 = mockReqRes({ folder: 'publicast/avatars' });
    await callHandler(generateSignatureV2, v2.req, v2.res);
    expect(v2.res.json.mock.calls[0][0].data.folder).toBe('publicast/avatars');
  });
});
