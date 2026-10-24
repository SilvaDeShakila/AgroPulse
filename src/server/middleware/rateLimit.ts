import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const ipBuckets = new Map<string, RateLimitRecord>();

export function rateLimit(maxRequests = 30, windowMs = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
    const now = Date.now();
    const record = ipBuckets.get(ip);

    if (!record || now > record.resetAt) {
      ipBuckets.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      const waitSeconds = Math.ceil((record.resetAt - now) / 1000);
      return res.status(429).json({
        error: 'TooManyRequests',
        message: `Too many requests from this IP address. Please retry in ${waitSeconds} seconds.`,
      });
    }

    record.count++;
    next();
  };
}
