const { isPrivateIp, downloadImageSafely, downloadBufferSafely } = require('../../src/utils/network-security');
const axios = require('axios');
const dns = require('dns');

jest.mock('axios');
jest.mock('dns');

describe('Network Security SSRF / DNS Rebinding Tests', () => {
  describe('isPrivateIp', () => {
    it('should correctly identify private IPv4 addresses', () => {
      expect(isPrivateIp('127.0.0.1')).toBe(true);
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('192.168.1.1')).toBe(true);
      expect(isPrivateIp('169.254.169.254')).toBe(true);
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('142.250.74.46')).toBe(false);
    });

    it('should identify loopback and private IPv6 addresses', () => {
      expect(isPrivateIp('::1')).toBe(true);
      expect(isPrivateIp('fe80::1')).toBe(true);
      expect(isPrivateIp('2001:4860:4860::8888')).toBe(false);
    });

    it('should unwrap and identify IPv4-mapped IPv6 addresses', () => {
      expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateIp('::ffff:10.2.3.4')).toBe(true);
      expect(isPrivateIp('::ffff:8.8.8.8')).toBe(false);
    });

    it('should treat a non-string address (e.g. dns.lookup with {all:true}) as unsafe instead of throwing', () => {
      // dns.lookup normally calls back with a string, but with {all:true} it
      // calls back with an array of {address, family} objects — a caller
      // passing that straight through used to crash on ip.trim().
      expect(isPrivateIp([{ address: '8.8.8.8', family: 4 }])).toBe(true);
      expect(isPrivateIp(undefined)).toBe(true);
      expect(isPrivateIp(null)).toBe(true);
      expect(isPrivateIp(42)).toBe(true);
    });
  });

  describe('downloadBufferSafely (#96)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      dns.lookup.mockImplementation((hostname, options, callback) => {
        const cb = typeof options === 'function' ? options : callback;
        cb(null, '203.0.113.10', 4); // public IP (TEST-NET-3)
      });
    });

    it('downloads and returns a Buffer for a public URL under the byte limit', async () => {
      const mockStream = { on: jest.fn(), destroy: jest.fn() };
      axios.mockResolvedValueOnce({ headers: { 'content-length': '4' }, data: mockStream });

      const promise = downloadBufferSafely('http://example.com/video.mp4', 100 * 1024 * 1024);
      await Promise.resolve();
      await Promise.resolve();

      const dataCb = mockStream.on.mock.calls.find(c => c[0] === 'data')[1];
      const endCb = mockStream.on.mock.calls.find(c => c[0] === 'end')[1];
      dataCb(Buffer.from([1, 2, 3, 4]));
      endCb();

      const buffer = await promise;
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBe(4);
    });

    it('rejects a non-http(s) protocol', async () => {
      await expect(downloadBufferSafely('file:///etc/passwd', 1024)).rejects.toThrow('SSRF Blocked');
    });

    it('enforces the caller-supplied maxBytes limit, not the 5MB image default', async () => {
      axios.mockResolvedValueOnce({
        headers: { 'content-length': (2 * 1024 * 1024).toString() }, // 2MB
        data: { destroy: jest.fn(), on: jest.fn() }
      });

      // 1MB limit should reject a 2MB Content-Length even though it's well
      // under the 5MB image limit used elsewhere.
      await expect(downloadBufferSafely('http://example.com/video.mp4', 1 * 1024 * 1024))
        .rejects.toThrow('limit');
    });
  });

  describe('downloadImageSafely', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Mock dns.lookup to immediately resolve localhost to 127.0.0.1
      dns.lookup.mockImplementation((hostname, options, callback) => {
        const cb = typeof options === 'function' ? options : callback;
        cb(null, '127.0.0.1', 4);
      });
    });

    it('should throw an error if the hostname resolves to a private IP', async () => {
      axios.mockImplementationOnce((config) => {
        // Run the custom lookup agent to see if it correctly blocks loopback
        const agent = config.httpAgent;
        if (agent && agent.options && agent.options.lookup) {
          return new Promise((resolve, reject) => {
            agent.options.lookup('localhost', {}, (err, address) => {
              if (err) {
                reject(err);
              } else if (address && isPrivateIp(address)) {
                reject(new Error('SSRF Protection: Private IP blocked'));
              }
            });
          });
        }
        return Promise.resolve({ headers: { 'content-length': '1000' }, data: { pipe: jest.fn(), on: jest.fn() } });
      });

      await expect(downloadImageSafely('http://localhost/image.jpg')).rejects.toThrow('SSRF Blocked');
    });

    it('should destroy stream if Content-Length exceeds 5MB', async () => {
      axios.mockResolvedValueOnce({
        headers: {
          'content-length': (6 * 1024 * 1024).toString() // 6MB
        },
        data: {
          destroy: jest.fn(),
          on: jest.fn()
        }
      });

      await expect(downloadImageSafely('http://example.com/huge.jpg')).rejects.toThrow('limit');
    });

    it('should destroy stream during data flow if actual bytes read exceeds 5MB', async () => {
      const mockStream = {
        on: jest.fn(),
        destroy: jest.fn()
      };

      axios.mockResolvedValueOnce({
        headers: {
          'content-length': '1000'
        },
        data: mockStream
      });

      const downloadPromise = downloadImageSafely('http://example.com/liar.jpg');

      // Allow microtask queue to flush so that response.data.on('data') is registered
      await Promise.resolve();
      await Promise.resolve();

      // Get the data callback registered on the stream
      const dataCallback = mockStream.on.mock.calls.find(c => c[0] === 'data')[1];

      // Send a chunk larger than 5MB
      dataCallback(Buffer.alloc(6 * 1024 * 1024));

      await expect(downloadPromise).rejects.toThrow('File size limit exceeded');
      expect(mockStream.destroy).toHaveBeenCalled();
    });
  });
});
