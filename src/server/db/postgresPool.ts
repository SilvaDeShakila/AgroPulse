import 'dotenv/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

export interface PostgresConnectionStatus {
  configured: boolean;
  connected: boolean;
  driver: 'postgresql';
  host?: string;
  database?: string;
  version?: string;
  latencyMs?: number;
  totalConnections?: number;
  idleConnections?: number;
  waitingCount?: number;
  provider?: string;
  error?: string;
}

let pool: Pool | null = null;
let isShuttingDown = false;

/**
 * Redacts passwords and sensitive auth tokens from connection URIs for safe logging.
 */
export function sanitizeConnectionUrl(url?: string): string {
  if (!url) return '[NOT CONFIGURED]';
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '******';
    }
    return parsed.toString();
  } catch {
    return '[REDACTED CONNECTION STRING]';
  }
}

/**
 * Returns or initializes the global PostgreSQL connection pool with Neon compatibility.
 */
export function getPostgresPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return null;
  }

  if (pool) {
    return pool;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const sslMode = process.env.PGSSLMODE?.toLowerCase();
  const isNeon = connectionString.includes('.neon.tech');

  // Neon requires SSL. For AWS Asia Pacific (Singapore) Neon instances or standard Neon endpoints,
  // ensure SSL configuration matches pg library expectations with SNI support.
  let sslConfig: any = undefined;
  if (sslMode === 'disable') {
    sslConfig = false;
  } else if (isNeon || isProduction || sslMode === 'require' || connectionString.includes('sslmode=require')) {
    sslConfig = {
      rejectUnauthorized: process.env.PGSSL_REJECT_UNAUTHORIZED === 'true',
    };
  }

  // Neon recommended pool limits: 5-10 connections per server instance
  const poolMax = parseInt(process.env.DB_POOL_MAX || (isNeon ? '10' : '15'), 10);
  // Connection timeout: 10 seconds to accommodate Neon cold-start wakeups (scale-from-zero)
  const connectTimeoutMs = parseInt(process.env.DB_TIMEOUT_MS || '10000', 10);

  pool = new Pool({
    connectionString,
    ssl: sslConfig,
    max: isNaN(poolMax) ? 10 : poolMax,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: isNaN(connectTimeoutMs) ? 10000 : connectTimeoutMs,
  });

  pool.on('error', (err) => {
    if (!isShuttingDown) {
      console.error('[AgroPulse Postgres Pool Error]:', err.message);
    }
  });

  return pool;
}

/**
 * Performs a real connection test and latency benchmark against PostgreSQL.
 */
export async function checkPostgresConnection(): Promise<PostgresConnectionStatus> {
  const connString = process.env.DATABASE_URL;
  if (!connString) {
    return {
      configured: false,
      connected: false,
      driver: 'postgresql',
      error: 'DATABASE_URL environment variable is not configured.',
    };
  }

  const targetPool = getPostgresPool();
  if (!targetPool) {
    return {
      configured: true,
      connected: false,
      driver: 'postgresql',
      error: 'Failed to initialize PostgreSQL connection pool.',
    };
  }

  const isNeon = connString.includes('.neon.tech');
  const startTime = Date.now();
  try {
    const res = await targetPool.query(
      'SELECT NOW() as current_time, current_database() as db_name, version() as version;'
    );
    const latencyMs = Date.now() - startTime;
    const row = res.rows[0];

    return {
      configured: true,
      connected: true,
      driver: 'postgresql',
      provider: isNeon ? 'Neon Serverless PostgreSQL (AWS)' : 'PostgreSQL',
      database: row.db_name,
      version: row.version.split(' on ')[0],
      latencyMs,
      totalConnections: targetPool.totalCount,
      idleConnections: targetPool.idleCount,
      waitingCount: targetPool.waitingCount,
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      driver: 'postgresql',
      provider: isNeon ? 'Neon Serverless PostgreSQL' : undefined,
      latencyMs: Date.now() - startTime,
      error: err.message || 'PostgreSQL connection test failed.',
    };
  }
}

/**
 * Safe error parser for PostgreSQL constraint errors (23505, 23503, 23514, etc.)
 */
export function handlePostgresError(err: any): Error {
  if (!err) return new Error('Unknown database error');

  // PostgreSQL Error Codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
  switch (err.code) {
    case '23505': // unique_violation
      return new Error(`Unique constraint violated: ${err.detail || err.message}`);
    case '23503': // foreign_key_violation
      return new Error(`Foreign key constraint violated: ${err.detail || err.message}`);
    case '23514': // check_violation
      return new Error(`Check constraint violated: ${err.constraint || err.message}`);
    case '23502': // not_null_violation
      return new Error(`Required field missing: column '${err.column}' cannot be null.`);
    case '0A000': // feature_not_supported
      return new Error(`Database feature not supported: ${err.message}`);
    case 'ECONNREFUSED':
    case 'ETIMEDOUT':
      return new Error('Database connection failed. Unable to reach PostgreSQL server.');
    default:
      return err;
  }
}

/**
 * Executes a parameterized SQL query on the managed pool.
 */
export async function executeQuery<T extends QueryResultRow = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
  const activePool = getPostgresPool();
  if (!activePool) {
    throw new Error('Database query failed: PostgreSQL pool is not configured (DATABASE_URL missing).');
  }

  try {
    return await activePool.query<T>(sql, params);
  } catch (err: any) {
    throw handlePostgresError(err);
  }
}

/**
 * Executes operations inside an ACID transaction (BEGIN / COMMIT / ROLLBACK)
 */
export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const activePool = getPostgresPool();
  if (!activePool) {
    throw new Error('Transaction failed: PostgreSQL pool is not configured (DATABASE_URL missing).');
  }

  const client = await activePool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err: any) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr: any) {
      console.error('[AgroPulse Postgres] Rollback error:', rollbackErr.message);
    }
    throw handlePostgresError(err);
  } finally {
    client.release();
  }
}

/**
 * Gracefully shuts down the PostgreSQL connection pool.
 */
export async function closePostgresPool(): Promise<void> {
  if (pool) {
    isShuttingDown = true;
    try {
      await pool.end();
      console.log('[AgroPulse Postgres] Connection pool drained and closed gracefully.');
    } catch (err: any) {
      console.warn('[AgroPulse Postgres] Error closing pool:', err.message);
    } finally {
      pool = null;
    }
  }
}
