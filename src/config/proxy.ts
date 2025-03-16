export const proxyConfig = {
  // Trust proxy in production or when explicitly enabled
  get trustProxy(): boolean {
    return process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true';
  },
  
  // Helper to get real IP from request
  getClientIP: (req: { ip: string; socket: { remoteAddress: string | null } }): string => {
    if (proxyConfig.trustProxy) {
      return req.ip;
    }
    return req.socket.remoteAddress || '';
  }
};
