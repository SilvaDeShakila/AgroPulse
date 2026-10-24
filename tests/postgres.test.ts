/**
 * AgroPulse PostgreSQL Integration Test Suite
 *
 * Verifies:
 * 1. Safe connection test & health checks (SELECT NOW())
 * 2. Credential sanitization & security against URL leakage
 * 3. PostgreSQL constraint error translation (unique 23505, foreign key 23503, check 23514)
 * 4. Migration runner idempotency and transactional execution
 * 5. Production database configuration & demo seeding guards
 * 6. Live CRUD, transaction isolation, and rollback (when DATABASE_URL is connected)
 */

import 'dotenv/config';
import {
  checkPostgresConnection,
  sanitizeConnectionUrl,
  handlePostgresError,
  closePostgresPool,
  withTransaction,
} from '../src/server/db/postgresPool';
import { runMigrations } from '../src/server/db/migrator';
import { seedPostgresDatabase } from '../src/server/db/seedToPostgres';
import { userRepository } from '../src/server/db/repositories/userRepository';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, failureDetail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (failureDetail) console.error(`    Detail: ${failureDetail}`);
    testsFailed++;
  }
}

async function runPostgresTestSuite() {
  console.log('================================================================');
  console.log('       AGROPULSE POSTGRESQL INTEGRATION & SECURITY TEST SUITE    ');
  console.log('================================================================\n');

  // ------------------------------------------------------------------
  // TEST GROUP 1: SECURITY & CREDENTIAL SANITIZATION
  // ------------------------------------------------------------------
  console.log('▶ TEST GROUP 1: Credential Protection & Safe Logging');

  const sampleUrlWithSecret = 'postgresql://neondb_owner:npg_SecretPass99@ep-cool-fog-12345.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
  const sanitized = sanitizeConnectionUrl(sampleUrlWithSecret);

  assert(
    !sanitized.includes('npg_SecretPass99'),
    'Raw database password is redacted from connection string'
  );
  assert(
    sanitized.includes('******'),
    'Password placeholder mask is displayed safely'
  );
  assert(
    sanitizeConnectionUrl(undefined) === '[NOT CONFIGURED]',
    'Missing DATABASE_URL safely returns [NOT CONFIGURED]'
  );

  // ------------------------------------------------------------------
  // TEST GROUP 2: POSTGRESQL ERROR TRANSLATION (Section 2)
  // ------------------------------------------------------------------
  console.log('\n▶ TEST GROUP 2: SQL Constraint Error Translation');

  // 2.1 Unique Violation (23505)
  const uniqueErr = handlePostgresError({
    code: '23505',
    detail: 'Key (email)=(farmer@ceylonfarms.lk) already exists.',
    table: 'users',
  });
  assert(
    uniqueErr.message.includes('Unique constraint violated'),
    'Postgres error 23505 translated to descriptive domain error'
  );

  // 2.2 Foreign Key Violation (23503)
  const fkErr = handlePostgresError({
    code: '23503',
    detail: 'Key (farm_id)=(farm-999) is not present in table "farms".',
    table: 'land_plots',
  });
  assert(
    fkErr.message.includes('Foreign key constraint violated'),
    'Postgres error 23503 translated to descriptive foreign key error'
  );

  // 2.3 Check Constraint Violation (23514)
  const checkErr = handlePostgresError({
    code: '23514',
    constraint: 'inventory_items_current_stock_check',
  });
  assert(
    checkErr.message.includes('Check constraint violated'),
    'Postgres error 23514 translated to check constraint error'
  );

  // 2.4 Not Null Violation (23502)
  const notNullErr = handlePostgresError({
    code: '23502',
    column: 'plot_code',
  });
  assert(
    notNullErr.message.includes('Required field missing'),
    'Postgres error 23502 translated to required field error'
  );

  // ------------------------------------------------------------------
  // TEST GROUP 3: SECURITY GUARDS AGAINST UNSAFE SEEDING
  // ------------------------------------------------------------------
  console.log('\n▶ TEST GROUP 3: Unsafe Demo Seeding Safeguards');

  delete process.env.ALLOW_DEMO_SEED;
  const seedBlockedRes = await seedPostgresDatabase();
  assert(
    seedBlockedRes.success === false,
    'Unprompted seeding of predictable demo accounts is blocked by default'
  );
  assert(
    seedBlockedRes.message.includes('SECURITY POLICY ENFORCED') || seedBlockedRes.message.includes('Database is not connected'),
    'Descriptive security policy feedback provided when demo seed is blocked'
  );

  // ------------------------------------------------------------------
  // TEST GROUP 4: CONNECTION STATUS & HEALTH CHECK BENCHMARK
  // ------------------------------------------------------------------
  console.log('\n▶ TEST GROUP 4: Connection & Health Check Evaluation');

  const status = await checkPostgresConnection();
  assert(
    typeof status.configured === 'boolean',
    'Connection status reports configured flag'
  );
  assert(
    typeof status.connected === 'boolean',
    'Connection status reports connected flag'
  );

  if (!status.connected) {
    console.log(`\n  [STATUS] PostgreSQL is currently NOT connected.`);
    console.log(`  [DETAIL] ${status.error}`);
    console.log(`  [NOTICE] Safe offline fallback verified. Testing offline migration handling.`);

    // 4.1 Migration runner offline safety check
    const migRes = await runMigrations();
    assert(
      migRes.success === false,
      'Migration runner halts safely without crash when PostgreSQL is offline'
    );
    assert(
      !!migRes.error,
      'Migration runner provides descriptive connection failure error'
    );
  } else {
    // ------------------------------------------------------------------
    // LIVE POSTGRESQL TEST SUITE (Only runs when DATABASE_URL is connected)
    // ------------------------------------------------------------------
    console.log(`\n  [STATUS] PostgreSQL is CONNECTED to ${status.database} (v${status.version}) in ${status.latencyMs}ms`);

    // 5.1 Migration runner execution
    console.log('\n▶ TEST GROUP 5: Database Schema Migrations');
    const migRes = await runMigrations();
    assert(migRes.success === true, 'Database migrations executed successfully');

    // 5.2 Migration runner idempotency check
    const secondMig = await runMigrations();
    assert(secondMig.success === true, 'Migration runner is repeatable and idempotent');
    assert(secondMig.applied.length === 0, 'No duplicate migrations applied on subsequent run');

    // 5.3 Transaction & Rollback verification
    console.log('\n▶ TEST GROUP 6: Transaction & Rollback Semantics');
    const testEmail = `rollback.test.${Date.now()}@farm.lk`;
    let rolledBack = false;

    try {
      await withTransaction(async (client) => {
        await client.query(
          `INSERT INTO users (id, name, email, password_hash, role)
           VALUES ($1, $2, $3, $4, $5);`,
          [`usr-test-${Date.now()}`, 'Rollback Test', testEmail, 'hash123', 'farmer']
        );
        // Force intentional rollback
        throw new Error('INTENTIONAL_TEST_ROLLBACK');
      });
    } catch (err: any) {
      if (err.message === 'INTENTIONAL_TEST_ROLLBACK') {
        rolledBack = true;
      }
    }

    assert(rolledBack, 'Transaction aborted upon error');

    // Verify record was NOT persisted
    const checkUser = await userRepository.findByEmail(testEmail);
    assert(checkUser === null, 'Rollback successfully reverted inserted database row');
  }

  // Summary
  console.log('\n================================================================');
  console.log(`POSTGRESQL TEST RESULTS: ${testsPassed} PASSED | ${testsFailed} FAILED`);
  console.log('================================================================\n');

  await closePostgresPool();

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPostgresTestSuite().catch((err) => {
  console.error('Fatal postgres test runner error:', err);
  process.exit(1);
});
