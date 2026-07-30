// db/pool.js
import pg from 'pg';

const { Pool } = pg;

// Render/Neon/Supabase-style DATABASE_URL connection string.
// SSL is required by most managed Postgres hosts but not by local dev —
// toggle via PGSSL=false in your local .env if needed.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error:', err);
});