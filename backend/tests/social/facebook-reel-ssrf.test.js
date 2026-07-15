const { isPrivateIp, downloadImageSafely } = require('../../src/utils/network-security');
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
