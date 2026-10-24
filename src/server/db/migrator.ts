import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPostgresPool, checkPostgresConnection, closePostgresPool } from './postgresPool';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MigrationResult {
  success: boolean;
  applied: string[];
  alreadyApplied: string[];
  error?: string;
}

const ADVISORY_LOCK_ID = 982341;

/**
 * Executes pending database schema migrations in transactional sequence.
 * Fully compatible with Neon serverless PostgreSQL (direct & pooled endpoints).
 */
export async function runMigrations(): Promise<MigrationResult> {
  const status = await checkPostgresConnection();
  if (!status.connected) {
    return {
      success: false,
      applied: [],
      alreadyApplied: [],
      error: `PostgreSQL connection failed: ${status.error || 'DATABASE_URL not connected'}`,
    };
  }

  const pool = getPostgresPool();
  if (!pool) {
    return {
      success: false,
      applied: [],
      alreadyApplied: [],
      error: 'PostgreSQL pool is null',
    };
  }

  const client = await pool.connect();
  const applied: string[] = [];
  const alreadyApplied: string[] = [];
  let hasAdvisoryLock = false;

  try {
    // 1. Ensure migrations tracking table exists before locking
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Attempt PostgreSQL session advisory lock (supported on direct connections)
    try {
      await client.query('SELECT pg_advisory_lock($1);', [ADVISORY_LOCK_ID]);
      hasAdvisoryLock = true;
    } catch (lockErr: any) {
      // If Neon pooled endpoint (-pooler) is used, PgBouncer rejects session-level advisory locks
      if (
        lockErr.message?.includes('advisory locks are not supported') ||
        lockErr.code === '0A000'
      ) {
        console.log('[AgroPulse Migrator] Notice: Neon transaction pooler detected; proceeding with table-level transactional exclusivity.');
      } else {
        throw lockErr;
      }
    }

    // 3. Fetch applied migrations
    const existing = await client.query('SELECT name FROM schema_migrations ORDER BY id ASC;');
    const appliedNames = new Set(existing.rows.map((r: { name: string }) => r.name));

    // 4. Scan migrations directory
    const migrationsDir = path.resolve(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found at ${migrationsDir}`);
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (appliedNames.has(file)) {
        alreadyApplied.push(file);
        continue;
      }

      console.log(`[AgroPulse Migrator] Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      // Execute migration in a dedicated transaction with table lock
      await client.query('BEGIN');
      try {
        await client.query('LOCK TABLE schema_migrations IN EXCLUSIVE MODE;');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1);', [file]);
        await client.query('COMMIT');
        applied.push(file);
        console.log(`[AgroPulse Migrator] ✓ Migration applied successfully: ${file}`);
      } catch (migrationErr: any) {
        await client.query('ROLLBACK');
        console.error(`[AgroPulse Migrator] ✗ Migration failed on ${file}:`, migrationErr.message);
        throw migrationErr;
      }
    }

    return {
      success: true,
      applied,
      alreadyApplied,
    };
  } catch (err: any) {
    return {
      success: false,
      applied,
      alreadyApplied,
      error: err.message,
    };
  } finally {
    if (hasAdvisoryLock) {
      try {
        await client.query('SELECT pg_advisory_unlock($1);', [ADVISORY_LOCK_ID]);
      } catch {
        // ignore unlock error on client disconnect
      }
    }
    client.release();
  }
}

// CLI entry point
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('migrator.ts') || process.argv[1].endsWith('migrator.js'));

if (isMain) {
  console.log('================================================================');
  console.log('       AGROPULSE RELATIONAL DATABASE MIGRATION RUNNER           ');
  console.log('================================================================');

  runMigrations()
    .then((result) => {
      if (result.success) {
        console.log(`\n✓ Migrations completed.`);
        console.log(`  Newly applied: ${result.applied.length > 0 ? result.applied.join(', ') : 'None (Up to date)'}`);
        console.log(`  Existing:      ${result.alreadyApplied.length} migrations`);
        process.exit(0);
      } else {
        console.error(`\n✗ Migration runner halted: ${result.error}`);
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('\n✗ Fatal migration error:', err);
      process.exit(1);
    })
    .finally(() => {
      closePostgresPool();
    });
}
