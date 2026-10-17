import { Pool, QueryResult, QueryResultRow } from 'pg';
import { env } from '../config/env.js';

export const pool = new Pool({
  connectionString: env.DATABASE_URL
});

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected error on idle client:', err);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (env.NODE_ENV === 'development') {
    console.log(`[SQL] executed query (${duration}ms):`, { text: text.trim().substring(0, 80), rows: res.rowCount });
  }
  return res;
}
