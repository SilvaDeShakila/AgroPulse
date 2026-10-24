import 'dotenv/config';
import pg from 'pg';

const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000
});

try {
  await db.connect();

  const result = await db.query(`
    SELECT id, name, applied_at
    FROM public.schema_migrations
    ORDER BY id
  `);

  console.log('\nAPPLIED DATABASE MIGRATIONS:');

  if (result.rows.length === 0) {
    console.log('No migration records found.');
  } else {
    console.table(result.rows);
  }

  console.log('Migration records:', result.rows.length);
} catch (error) {
  console.log('CHECK FAILED:', error.code || '', error.message);
  process.exitCode = 1;
} finally {
  await db.end().catch(() => {});
}
