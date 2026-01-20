import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'document_flow_db',
  user: process.env.DB_USER || 'postgres',
  // Do not provide a misleading default password. Require DB_PASSWORD to be set in .env
  password: process.env.DB_PASSWORD || undefined,
});

// Test database connection on demand
export async function testConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Failed to connect to PostgreSQL database:', message);
    return false;
  }
}

// Log when client connects
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err: Error) => {
  console.error('❌ Unexpected error on idle client', err);
  // Do NOT exit the process here; let the server handle requests and return friendly errors.
});

export default pool;

