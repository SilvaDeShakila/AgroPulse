import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import {
  checkPostgresConnection,
  closePostgresPool,
  withTransaction,
} from './postgresPool.js';

async function provisionAdministrator(): Promise<void> {
  console.log('================================================================');
  console.log('       AGROPULSE SECURE ADMINISTRATOR PROVISIONING TOOL         ');
  console.log('================================================================');

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'System Administrator';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL must contain a valid email address.');
  }

  if (!password || password.length < 10) {
    throw new Error('ADMIN_PASSWORD must be at least 10 characters long.');
  }

  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error(
      'ADMIN_PASSWORD must contain at least one uppercase letter and one numeric digit.'
    );
  }

  const status = await checkPostgresConnection();

  if (!status.connected) {
    throw new Error(
      `PostgreSQL is not connected: ${status.error || 'DATABASE_URL is not configured.'}`
    );
  }

  console.log('\nGenerating bcrypt password hash (cost factor 12)...');
  const passwordHash = await bcrypt.hash(password, 12);

  const adminId = `usr-admin-${randomUUID()}`;
  const auditId = `audit-${randomUUID()}`;

  await withTransaction(async (client) => {
    const existing = await client.query(
      `SELECT id FROM users
       WHERE LOWER(email) = $1
       LIMIT 1
       FOR UPDATE;`,
      [email]
    );

    if (existing.rows.length > 0) {
      throw new Error(
        `An account already exists for '${email}'. No account changes were made. Use a new, dedicated administrator email.`
      );
    }

    await client.query(
      `INSERT INTO users (
         id, name, email, password_hash, role,
         district, organization, status, created_at, updated_at
       )
       VALUES (
         $1, $2, $3, $4, 'super_admin',
         'Colombo', 'AgroPulse Platform Administration',
         'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       );`,
      [adminId, name, email, passwordHash]
    );

    await client.query(
      `INSERT INTO audit_logs (
         id, action, entity_type, entity_id, user_id, user_role,
         actor_name, details, ip_address, timestamp
       )
       VALUES (
         $1, 'CREATE', 'USER', $2, $2, 'super_admin',
         'Secure CLI Provisioner', $3, '127.0.0.1', CURRENT_TIMESTAMP
       );`,
      [
        auditId,
        adminId,
        `Securely provisioned Super Admin account: ${email}`,
      ]
    );
  });

  console.log('\nSuper Admin account successfully provisioned.');
  console.log(`  Email: ${email}`);
  console.log('  Role: super_admin');
  console.log('  Status: active');
  console.log('  Password: stored as a bcrypt hash.');
  console.log('  Audit record: created in the same transaction.');
}

async function main(): Promise<void> {
  try {
    await provisionAdministrator();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('\nProvisioning failed:', message);
    process.exitCode = 1;
  } finally {
    await closePostgresPool();
  }
}

void main();
