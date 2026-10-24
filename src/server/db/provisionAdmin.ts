import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { checkPostgresConnection, closePostgresPool } from './postgresPool';
import { userRepository } from './repositories/userRepository';
import { auditRepository } from './repositories/auditRepository';

async function provisionAdministrator() {
  console.log('================================================================');
  console.log('       AGROPULSE SECURE ADMINISTRATOR PROVISIONING TOOL         ');
  console.log('================================================================');

  const status = await checkPostgresConnection();
  if (!status.connected) {
    console.error(`\n✗ Cannot provision administrator: PostgreSQL is not connected.`);
    console.error(`  Detail: ${status.error || 'DATABASE_URL is not set'}`);
    process.exit(1);
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'System Administrator';

  if (!email || !email.includes('@')) {
    console.error('\n✗ Error: ADMIN_EMAIL environment variable is required.');
    console.error('  Usage: ADMIN_EMAIL="admin@yourdomain.com" ADMIN_PASSWORD="<strong-password>" npm run db:provision-admin');
    process.exit(1);
  }

  if (!password || password.length < 10) {
    console.error('\n✗ Security Error: ADMIN_PASSWORD must be at least 10 characters long.');
    process.exit(1);
  }

  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    console.error('\n✗ Security Error: ADMIN_PASSWORD must contain at least one uppercase letter and one numeric digit.');
    process.exit(1);
  }

  // Check if admin account already exists
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    console.log(`\nAccount for '${email}' already exists (Role: ${existing.role}).`);
    console.log('Updating password and elevating to super_admin...');
  }

  console.log(`\nGenerating cryptographically secure bcrypt hash (cost factor 12)...`);
  const passwordHash = await bcrypt.hash(password, 12);

  const adminId = existing?.id || `usr-admin-${Date.now()}`;

  if (existing) {
    // Update existing user to super_admin with new hash
    const { executeQuery } = await import('./postgresPool');
    await executeQuery(
      `UPDATE users
       SET password_hash = $2, role = 'super_admin', status = 'active', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1;`,
      [existing.id, passwordHash]
    );
  } else {
    await userRepository.createUser({
      id: adminId,
      name,
      email,
      passwordHash,
      role: 'super_admin',
      district: 'Colombo',
      organization: 'AgroPulse Platform Administration',
    });
  }

  await auditRepository.logAudit({
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    action: 'CREATE',
    entity: 'AUTH',
    entityType: 'USER',
    entityId: adminId,
    actorId: 'cli_provisioner',
    actorName: 'Secure CLI Provisioner',
    actorRole: 'super_admin',
    details: `Securely provisioned Super Admin account: ${email}`,
    timestamp: new Date().toISOString(),
  });

  console.log(`\n✓ Super Admin account successfully provisioned:`);
  console.log(`  Email: ${email}`);
  console.log(`  Role:  super_admin`);
  console.log(`  Status: active`);
  console.log(`  Credentials: Securely hashed with bcrypt (no plaintext stored).`);
}

provisionAdministrator()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n✗ Provisioning failed:', err.message);
    process.exit(1);
  })
  .finally(() => {
    closePostgresPool();
  });
