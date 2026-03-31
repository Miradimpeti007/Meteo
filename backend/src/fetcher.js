import pool from './db.js';

const DATA_API_URL = process.env.DATA_API_URL || 'http://localhost:8000';

/**
 * Fetch a single day from the data API and store rows in DB.
 * Returns the number of newly inserted rows.
 */
export async function fetchAndStore(start, end) {
  const url = `${DATA_API_URL}/data?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  console.log(`[fetcher] → ${url}`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Data API ${res.status} for ${start}→${end}`);

  const { rows = [] } = await res.json();
  if (!rows.length) {
    console.log(`[fetcher] 0 rows returned for ${start}→${end}`);
    return 0;
  }

  const client = await pool.connect();
  try {
    let inserted = 0;
    await client.query('BEGIN');
    for (const row of rows) {
      const r = await client.query(
        `INSERT INTO measurements (nom, lat, lon, indice, hour_utc)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (nom, hour_utc) DO NOTHING`,
        [row.nom, row.lat, row.lon, row.Indice ?? row.indice, row.hour_utc]
      );
      inserted += r.rowCount;
    }
    await client.query('COMMIT');
    console.log(`[fetcher] +${inserted} new rows (${rows.length} from API) for ${start}→${end}`);
    return inserted;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Ensure every calendar day between startDate and endDate (inclusive, "YYYY-MM-DD")
 * has at least one row in the DB. Missing days are fetched one by one.
 *
 * Uses TO_CHAR in SQL to get clean 'YYYY-MM-DD' strings and avoids any
 * JS timezone parsing issues.
 */
export async function ensureRangeCovered(startDate, endDate) {
  // startDate / endDate must be "YYYY-MM-DD" strings
  const s = startDate.slice(0, 10);
  const e = endDate.slice(0, 10);

  // Days already present in DB — TO_CHAR guarantees clean YYYY-MM-DD strings
  const { rows } = await pool.query(`
    SELECT DISTINCT TO_CHAR(hour_utc AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day
    FROM   measurements
    WHERE  hour_utc::date >= $1::date
      AND  hour_utc::date <= $2::date
  `, [s, e]);

  const covered = new Set(rows.map(r => r.day));

  // Generate all calendar days in range using explicit UTC dates
  const missing = [];
  const cursor = new Date(`${s}T00:00:00Z`);
  const limit  = new Date(`${e}T00:00:00Z`);

  while (cursor <= limit) {
    const day = cursor.toISOString().slice(0, 10);
    if (!covered.has(day)) missing.push(day);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (!missing.length) {
    console.log(`[fetcher] All days ${s}→${e} already in DB`);
    return 0;
  }

  console.log(`[fetcher] Missing days: ${missing.join(', ')}`);
  let total = 0;
  for (const day of missing) {
    try { total += await fetchAndStore(day, `${day}T23:59`); }
    catch (err) { console.error(`[fetcher] Failed for ${day}:`, err.message); }
  }
  return total;
}
