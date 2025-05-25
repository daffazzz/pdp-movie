import { Pool } from 'pg';

// Local PostgreSQL configuration
const pgConfig = {
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'pdp_movie',
  ssl: process.env.POSTGRES_USE_SSL === 'true' ? {
    rejectUnauthorized: false
  } : undefined
};

// Create a new pool using the configuration
const pool = new Pool(pgConfig);

/**
 * Execute a SQL query with parameters
 * @param text SQL query text
 * @param params Query parameters
 * @returns Promise with query result
 */
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Error executing query', { text, error });
    throw error;
  }
}

/**
 * Get a client from the pool
 * Use for transactions
 */
export async function getClient() {
  const client = await pool.connect();
  return client;
} 