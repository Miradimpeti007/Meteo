import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'meteo',
  user: process.env.PGUSER || 'meteo',
  password: process.env.PGPASSWORD || 'meteo',
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error:', err.message);
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS measurements (
      id         SERIAL PRIMARY KEY,
      nom        TEXT              NOT NULL,
      lat        DOUBLE PRECISION  NOT NULL,
      lon        DOUBLE PRECISION  NOT NULL,
      indice     DOUBLE PRECISION  NOT NULL,
      hour_utc   TIMESTAMPTZ       NOT NULL,
      polled_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
      UNIQUE (nom, hour_utc)
    );

    CREATE INDEX IF NOT EXISTS idx_measurements_hour_utc ON measurements (hour_utc);
    CREATE INDEX IF NOT EXISTS idx_measurements_lat_lon  ON measurements (lat, lon);
    CREATE INDEX IF NOT EXISTS idx_measurements_indice   ON measurements (indice);
  `);
  console.log('Database initialized');
}

export default pool;
