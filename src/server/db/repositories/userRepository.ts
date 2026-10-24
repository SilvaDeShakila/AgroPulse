import { executeQuery } from '../postgresPool';
import { User, UserRole } from '../../../types';

export interface UserRecord extends User {
  passwordHash: string;
}

function mapUserRow(row: any): UserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role as UserRole,
    phone: row.phone || undefined,
    district: row.district || undefined,
    organization: row.organization || undefined,
    status: row.status as 'active' | 'suspended' | 'pending',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export const userRepository = {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.trim().toLowerCase();
    const res = await executeQuery(
      `SELECT id, name, email, password_hash, role, phone, district, organization, status, created_at
       FROM users
       WHERE LOWER(email) = $1
       LIMIT 1;`,
      [normalized]
    );

    if (res.rows.length === 0) return null;
    return mapUserRow(res.rows[0]);
  },

  async findById(id: string): Promise<UserRecord | null> {
    const res = await executeQuery(
      `SELECT id, name, email, password_hash, role, phone, district, organization, status, created_at
       FROM users
       WHERE id = $1
       LIMIT 1;`,
      [id]
    );

    if (res.rows.length === 0) return null;
    return mapUserRow(res.rows[0]);
  },

  async createUser(userData: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    phone?: string;
    district?: string;
    organization?: string;
  }): Promise<UserRecord> {
    const normalized = userData.email.trim().toLowerCase();
    const res = await executeQuery(
      `INSERT INTO users (id, name, email, password_hash, role, phone, district, organization, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, name, email, password_hash, role, phone, district, organization, status, created_at;`,
      [
        userData.id,
        userData.name.trim(),
        normalized,
        userData.passwordHash,
        userData.role,
        userData.phone || null,
        userData.district || 'Nuwara Eliya',
        userData.organization || null,
      ]
    );

    return mapUserRow(res.rows[0]);
  },

  async getAllUsers(): Promise<User[]> {
    const res = await executeQuery(
      `SELECT id, name, email, role, phone, district, organization, status, created_at
       FROM users
       ORDER BY created_at DESC;`
    );

    return res.rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role as UserRole,
      phone: r.phone || undefined,
      district: r.district || undefined,
      organization: r.organization || undefined,
      status: r.status as 'active' | 'suspended' | 'pending',
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    }));
  },

  async count(): Promise<number> {
    const res = await executeQuery('SELECT COUNT(*)::int as count FROM users;');
    return res.rows[0]?.count || 0;
  },

  async createPasswordResetToken(id: string, email: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await executeQuery(
      `INSERT INTO password_reset_tokens (id, email, token_hash, expires_at)
       VALUES ($1, $2, $3, $4);`,
      [id, email.toLowerCase(), tokenHash, expiresAt]
    );
  },

  async findValidResetToken(tokenHash: string): Promise<{ email: string } | null> {
    const res = await executeQuery(
      `SELECT email FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
       LIMIT 1;`,
      [tokenHash]
    );
    return res.rows[0] || null;
  },

  async markResetTokenUsed(tokenHash: string): Promise<void> {
    await executeQuery(
      `UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token_hash = $1;`,
      [tokenHash]
    );
  },
};
