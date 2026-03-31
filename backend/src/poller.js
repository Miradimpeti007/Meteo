import pool from './db.js';

const DATA_API_URL = process.env.DATA_API_URL || 'http://localhost:8000';
const POLL_INTERVAL_MS = (parseInt(process.env.POLL_INTERVAL_MINUTES) || 5) * 60 * 1000;

async function poll() {
  try {
    const res = await fetch(`${DATA_API_URL}/current`);
    if (!res.ok) {
      console.error(`[poller] HTTP ${res.status} from data API`);
      return;
    }

    const { hour_utc, rows } = await res.json();

    if (!rows?.length) {
      console.log('[poller] No rows returned');
      return;
    }

    const client = await pool.connect();
    try {
      let inserted = 0;
      await client.query('BEGIN');

      for (const row of rows) {
        const result = await client.query(
          `INSERT INTO measurements (nom, lat, lon, indice, hour_utc)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (nom, hour_utc) DO NOTHING`,
          [row.nom, row.lat, row.lon, row.Indice, hour_utc]
        );
        inserted += result.rowCount;
      }

      await client.query('COMMIT');
      console.log(`[poller] ${new Date().toISOString()} — polled ${rows.length} rows, inserted ${inserted} new (hour: ${hour_utc})`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[poller] Error:', err.message);
  }
}

export function startPoller() {
  const intervalMin = POLL_INTERVAL_MS / 60000;
  console.log(`[poller] Starting — interval: ${intervalMin} min, API: ${DATA_API_URL}`);
  poll();
  setInterval(poll, POLL_INTERVAL_MS);
}
