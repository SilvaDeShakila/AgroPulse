import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { serverDb } from '../db/database';
import { UserRole } from '../../types';

const INSECURE_DEFAULT_SECRETS = [
  'agropulse-enterprise-jwt-secret-key-2026-production',
  'agropulse-enterprise-secure-jwt-secret-key-change-in-production',
  'REPLACE_WITH_UNIQUE_CRYPTOGRAPHIC_32_CHAR_SECRET_HEX',
  'secret',
  'changeme',
];

export function resolveJwtSecret(): string {
  const envSecret = process.env.JWT_SECRET?.trim();
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (!envSecret) {
      throw new Error(
        '[AgroPulse Security Error] FATAL: JWT_SECRET environment variable is missing in production mode. ' +
        'A dedicated, cryptographically random secret of at least 32 characters (256 bits) is required to secure JWT tokens.'
      );
    }
    if (envSecret.length < 32) {
      throw new Error(
        `[AgroPulse Security Error] FATAL: JWT_SECRET length is insufficient (${envSecret.length} chars). ` +
        'Production JWT_SECRET must be at least 32 characters long to ensure HMAC-SHA256 signature resistance.'
      );
    }
    if (INSECURE_DEFAULT_SECRETS.includes(envSecret)) {
      throw new Error(
        '[AgroPulse Security Error] FATAL: Insecure default JWT_SECRET placeholder detected in production mode. ' +
        'Configure a unique random secret before launching.'
      );
    }
    return envSecret;
  }

  // Local development / non-production environment
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }

  // Deterministic local development fallback (preserves active dev sessions across restarts)
  // Strictly prevented from being used when NODE_ENV === 'production'
  return 'agropulse-local-dev-jwt-secret-do-not-use-in-production-32-chars';
}

export const JWT_SECRET = resolveJwtSecret();

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  district?: string;
  organization?: string;
}

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
  params: Record<string, string>;
  body: any;
  query: Record<string, string | string[] | undefined>;
  path: string;
}

export async function authMiddleware(req: any, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access token is required. Please provide a valid Bearer token.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: UserRole;
    };

    const user = await serverDb.findUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'The account associated with this session no longer exists.',
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This account has been suspended by system administration.',
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      district: user.district,
      organization: user.organization,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'TokenExpired',
        message: 'Your session has expired. Please log in again to continue.',
      });
    }

    return res.status(401).json({
      error: 'InvalidToken',
      message: 'Cryptographic token validation failed.',
    });
  }
}
