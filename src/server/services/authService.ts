import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serverDb } from '../db/database';
import { UserRole } from '../../types';
import { JWT_SECRET } from '../middleware/auth';

export class AuthService {
  public static async register(data: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    role: UserRole;
    district?: string;
    organization?: string;
    phone?: string;
  }) {
    const { name, email, password, confirmPassword, role, district, organization, phone } = data;

    // 1. Validation
    if (!name || name.trim().length < 2) {
      throw { status: 422, message: 'Full legal or operating name must be at least 2 characters.' };
    }

    const normalizedEmail = email ? email.trim().toLowerCase() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      throw { status: 422, message: 'A valid email address is required.' };
    }

    if (role === 'super_admin' || role === 'support_staff') {
      throw {
        status: 403,
        message: 'Security policy: Privileged administrative roles cannot be provisioned via public registration.',
      };
    }

    const allowedRoles: UserRole[] = ['farmer', 'farm_worker', 'agronomist', 'buyer', 'supplier'];
    if (!allowedRoles.includes(role)) {
      throw { status: 422, message: `Invalid operational role '${role}'.` };
    }

    // Password requirements: 8+ chars, 1 digit, 1 uppercase
    if (!password || password.length < 8) {
      throw { status: 422, message: 'Password must be at least 8 characters long.' };
    }
    if (!/\d/.test(password)) {
      throw { status: 422, message: 'Password must contain at least one numeric digit.' };
    }
    if (!/[A-Z]/.test(password)) {
      throw { status: 422, message: 'Password must contain at least one uppercase letter.' };
    }
    if (password !== confirmPassword) {
      throw { status: 422, message: 'Password and confirmation password do not match.' };
    }

    // 2. Check duplicate email constraint
    const existing = await serverDb.findUserByEmail(normalizedEmail);
    if (existing) {
      throw { status: 409, message: 'An account with this work email address is already registered.' };
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Create user record
    const user = await serverDb.createUser({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role,
      district: district || 'Nuwara Eliya',
      organization: organization || (role === 'buyer' ? 'Wholesale Commodity Buyer' : 'Independent Tea Estate'),
      phone: phone || '',
    });

    // 5. Audit log
    await serverDb.logAudit('CREATE', 'USER', user.id, user.id, user.role, `Registered new account: ${user.name} (${user.role})`);

    // 6. Sign JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { passwordHash: _, ...safeUser } = user;
    return { token, user: safeUser };
  }

  public static async login(credentials: { email: string; password: string }) {
    const { email, password } = credentials;

    const normalizedEmail = email ? email.trim().toLowerCase() : '';
    if (!normalizedEmail || !password) {
      throw { status: 422, message: 'Email and password are required.' };
    }

    const user = await serverDb.findUserByEmail(normalizedEmail);
    if (!user) {
      await serverDb.logAudit('LOGIN', 'USER', 'unknown', 'anonymous', 'anonymous', `Failed login attempt for ${normalizedEmail}`);
      throw { status: 401, message: 'Invalid credentials. Please verify your email and password.' };
    }

    if (user.status === 'suspended') {
      throw { status: 403, message: 'This estate account has been suspended.' };
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await serverDb.logAudit('LOGIN', 'USER', user.id, user.id, user.role, `Failed password verification for ${user.email}`);
      throw { status: 401, message: 'Invalid credentials. Please verify your email and password.' };
    }

    await serverDb.logAudit('LOGIN', 'USER', user.id, user.id, user.role, `Successful authentication for ${user.email}`);

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { passwordHash: _, ...safeUser } = user;
    return { token, user: safeUser };
  }

  public static async requestPasswordReset(email: string) {
    const normalized = email ? email.trim().toLowerCase() : '';
    if (!normalized || !normalized.includes('@')) {
      throw { status: 422, message: 'Please provide a valid work email address.' };
    }

    const user = await serverDb.findUserByEmail(normalized);
    // Don't leak user presence to unauthenticated client, but record audit
    if (user) {
      await serverDb.logAudit(
        'UPDATE',
        'PASSWORD_RESET',
        user.id,
        user.id,
        user.role,
        `Password recovery dispatched to ${user.email}`
      );
    }

    return {
      message: 'If an account is associated with this email, cryptographic password reset instructions have been dispatched.',
      deliveryStatus: 'dispatched_simulated_smtp',
    };
  }
}
