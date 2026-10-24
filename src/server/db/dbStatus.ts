import { checkPostgresConnection, sanitizeConnectionUrl, closePostgresPool } from './postgresPool';

async function main() {
  console.log('================================================================');
  console.log('              AGROPULSE DATABASE CONNECTION STATUS              ');
  console.log('================================================================');

  const rawUrl = process.env.DATABASE_URL;
  console.log(`DATABASE_URL: ${sanitizeConnectionUrl(rawUrl)}`);
  console.log(`Environment:  ${process.env.NODE_ENV || 'development'}`);
  console.log(`Fallback:     ${process.env.ALLOW_DISK_DB_FALLBACK === 'true' ? 'Enabled' : 'Disabled (Default)'}`);

  const status = await checkPostgresConnection();

  if (status.connected) {
    console.log('\n✓ PostgreSQL Status: CONNECTED');
    console.log(`  Database:   ${status.database}`);
    console.log(`  Version:    ${status.version}`);
    console.log(`  Latency:    ${status.latencyMs} ms`);
    console.log(`  Pool:       ${status.totalConnections} connections (${status.idleConnections} idle)`);
  } else {
    console.log('\n✗ PostgreSQL Status: DISCONNECTED');
    console.log(`  Reason:     ${status.error || 'Connection failed'}`);
    if (!rawUrl) {
      console.log('\nNotice: To connect PostgreSQL, set DATABASE_URL in your environment.');
      console.log('Example: DATABASE_URL="postgresql://user:password@host:5432/agropulse"');
    }
  }

  await closePostgresPool();
}

main().catch(err => {
  console.error('Fatal status check failure:', err);
  process.exit(1);
});
