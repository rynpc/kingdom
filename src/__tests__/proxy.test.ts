import { proxyConfig } from '../config/proxy';

const originalEnv = { ...process.env };

describe('Proxy Configuration Tests', () => {
  const mockReq = {
    ip: '1.2.3.4',
    socket: {
      remoteAddress: '5.6.7.8'
    }
  };

  describe('Trust Proxy Configuration', () => {
    test('should trust proxy in production environment', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      
      // Act
      const result = proxyConfig.trustProxy;

      // Assert
      expect(result).toBe(true);
    });

    test('should respect TRUST_PROXY env variable', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      process.env.TRUST_PROXY = 'true';

      // Act
      const result = proxyConfig.trustProxy;

      // Assert
      expect(result).toBe(true);
    });

    test('should not trust proxy by default in non-production', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      process.env.TRUST_PROXY = 'false';

      // Act
      const result = proxyConfig.trustProxy;

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Client IP Resolution', () => {
    test('should return X-Forwarded-For IP when proxy is trusted', () => {
      // Arrange
      process.env.TRUST_PROXY = 'true';
      const req = { ...mockReq };

      // Act
      const clientIP = proxyConfig.getClientIP(req);

      // Assert
      expect(clientIP).toBe(req.ip);
    });

    test('should return socket remote address when proxy is not trusted', () => {
      // Arrange
      process.env.TRUST_PROXY = 'false';
      const req = { ...mockReq };

      // Act
      const clientIP = proxyConfig.getClientIP(req);

      // Assert
      expect(clientIP).toBe(req.socket.remoteAddress);
    });

    test('should handle missing remote address', () => {
      // Arrange
      process.env.TRUST_PROXY = 'false';
      const req = {
        ip: '1.2.3.4',
        socket: {
          remoteAddress: null
        }
      };

      // Act
      const clientIP = proxyConfig.getClientIP(req);

      // Assert
      expect(clientIP).toBe('');
    });

    test('should handle invalid IP address', () => {
      // Arrange
      process.env.TRUST_PROXY = 'true';
      const req = {
        ip: 'invalid-ip',
        socket: {
          remoteAddress: '5.6.7.8'
        }
      };

      // Act
      const clientIP = proxyConfig.getClientIP(req);

      // Assert
      expect(clientIP).toBe('invalid-ip');
    });
  });

  afterEach(() => {
    // Cleanup
    process.env = { ...originalEnv };
  });
});