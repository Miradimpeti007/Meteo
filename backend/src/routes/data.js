import { Router } from 'express';
import pool from '../db.js';
import { ensureRangeCovered } from '../fetcher.js';

// Cache : on ne vérifie la couverture des 2 derniers jours qu'une seule
// fois par jour calendaire (ou au premier démarrage). Le poller prend le
// relais pour les données intra-journalières fraîches.
let coverageCheckedForDate = null;

const router = Router();

/**
 * GET /api/data
 *
 * Filters (all optional):
 *   start        — ISO date/datetime, ex: 2026-01-01 ou 2026-01-01T14:00
 *   end          — ISO date/datetime
 *   lat_min      — latitude minimum
 *   lat_max      — latitude maximum
 *   lon_min      — longitude minimum
 *   lon_max      — longitude maximum
 *   indice_min   — borne basse de l'indice
 *   indice_max   — borne haute de l'indice
 *   avg          — "true" → regroupe par site et retourne l'indice moyen
 *   limit        — nombre max de lignes (défaut 5000)
 *
 * Si start+end sont fournis et qu'aucune donnée n'existe en base pour
 * cette plage, le backend interroge automatiquement l'API data et
 * stocke les résultats avant de répondre.
 */
router.get('/data', async (req, res) => {
  const {
    start, end,
    lat_min, lat_max, lon_min, lon_max,
    indice_min, indice_max,
    avg,
    limit,
  } = req.query;

  // ── 1. Si une plage de dates est demandée, s'assurer que chaque jour
  //        est présent en DB. Les jours manquants sont fetchés un par un
  //        avant de calculer les moyennes, pour ne pas biaiser le résultat.
  if (start && end) {
    try {
      const inserted = await ensureRangeCovered(start, end);
      if (inserted > 0) {
        console.log(`[/api/data] Fetched and stored ${inserted} new rows for ${start}→${end}`);
      }
    } catch (err) {
      console.error('[/api/data] Coverage check failed:', err.message);
    }
  }

  // ── 2. Construire la requête filtrée ─────────────────────────────────────
  const whereConditions = [];
  const havingConditions = [];
  const params = [];

  const p = (value) => { params.push(value); return `$${params.length}`; };

  // Filtres applicables avant agrégation (WHERE)
  if (start)   whereConditions.push(`hour_utc >= ${p(start)}`);
  if (end)     whereConditions.push(`hour_utc <= ${p(end)}`);
  if (lat_min) whereConditions.push(`lat >= ${p(parseFloat(lat_min))}`);
  if (lat_max) whereConditions.push(`lat <= ${p(parseFloat(lat_max))}`);
  if (lon_min) whereConditions.push(`lon >= ${p(parseFloat(lon_min))}`);
  if (lon_max) whereConditions.push(`lon <= ${p(parseFloat(lon_max))}`);

  // Filtre sur l'indice :
  //   - mode avg=true  → HAVING (filtre sur la moyenne)
  //   - mode brut      → WHERE  (filtre sur chaque mesure)
  const isAvg = avg === 'true';
  if (indice_min) {
    const cond = `${isAvg ? 'AVG(indice)' : 'indice'} >= ${p(parseFloat(indice_min))}`;
    isAvg ? havingConditions.push(cond) : whereConditions.push(cond);
  }
  if (indice_max) {
    const cond = `${isAvg ? 'AVG(indice)' : 'indice'} <= ${p(parseFloat(indice_max))}`;
    isAvg ? havingConditions.push(cond) : whereConditions.push(cond);
  }

  const WHERE  = whereConditions.length  ? `WHERE ${whereConditions.join(' AND ')}`   : '';
  const HAVING = havingConditions.length ? `HAVING ${havingConditions.join(' AND ')}` : '';
  const maxRows = parseInt(limit) || 5000;

  let query;

  if (isAvg) {
    // ── Mode agrégé : indice moyen par site sur la période ────────────────
    query = `
      SELECT
        nom,
        lat,
        lon,
        ROUND(AVG(indice)::numeric, 4)  AS indice_moyen,
        ROUND(MIN(indice)::numeric, 4)  AS indice_min,
        ROUND(MAX(indice)::numeric, 4)  AS indice_max,
        COUNT(*)                        AS nb_mesures,
        MIN(hour_utc)                   AS premiere_mesure,
        MAX(hour_utc)                   AS derniere_mesure
      FROM measurements
      ${WHERE}
      GROUP BY nom, lat, lon
      ${HAVING}
      ORDER BY indice_moyen DESC
      LIMIT ${p(maxRows)}
    `;
  } else {
    // ── Mode brut : toutes les mesures ────────────────────────────────────
    query = `
      SELECT nom, lat, lon, indice, hour_utc, polled_at
      FROM measurements
      ${WHERE}
      ORDER BY hour_utc DESC
      LIMIT ${p(maxRows)}
    `;
  }

  try {
    const result = await pool.query(query, params);
    res.json({
      count: result.rowCount,
      avg_mode: isAvg,
      rows: result.rows,
    });
  } catch (err) {
    console.error('[GET /api/data]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/latest
 *
 * Retourne la dernière valeur connue de CHAQUE station.
 *
 * Logique :
 *  1. S'assurer que les 2 derniers jours sont en DB (jour J et J-1).
 *     Les jours déjà présents sont ignorés (ON CONFLICT DO NOTHING),
 *     seuls les jours manquants déclenchent un appel à l'API data.
 *  2. Retourner, pour chaque station, sa mesure la plus récente
 *     (DISTINCT ON nom ORDER BY hour_utc DESC).
 *     → Toutes les stations ayant au moins une mesure dans les 2 derniers
 *       jours sont affichées, même si elles n'ont pas toutes le même timestamp.
 */
router.get('/latest', async (req, res) => {
  try {
    const now      = new Date();
    const todayStr = now.toISOString().slice(0, 10);            // "YYYY-MM-DD"
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);
    const startStr = yesterday.toISOString().slice(0, 10);      // "YYYY-MM-DD"

    // Vérification de couverture : une seule fois par jour calendaire.
    // Les appels suivants dans la même journée utilisent ce qui est déjà en DB
    // (le poller se charge d'enrichir les données en continu).
    if (coverageCheckedForDate !== todayStr) {
      const inserted = await ensureRangeCovered(startStr, todayStr);
      coverageCheckedForDate = todayStr;
      if (inserted > 0) {
        console.log(`[/api/latest] Stored ${inserted} new rows for ${startStr}→${todayStr}`);
      }
    }

    // Dernière mesure par station sur la fenêtre de 2 jours
    const result = await pool.query(`
      SELECT DISTINCT ON (nom) nom, lat, lon, indice, hour_utc
      FROM measurements
      WHERE hour_utc >= $1
      ORDER BY nom, hour_utc DESC
    `, [yesterday.toISOString()]);

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Aucune donnée disponible' });
    }

    res.json({
      count:    result.rowCount,
      since:    startStr,
      rows:     result.rows,
    });
  } catch (err) {
    console.error('[GET /api/latest]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/stats
 * Statistiques globales sur les données stockées.
 */
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)                           AS total_mesures,
        COUNT(DISTINCT nom)                AS total_sites,
        COUNT(DISTINCT hour_utc)           AS total_heures,
        MIN(hour_utc)                      AS plus_ancienne,
        MAX(hour_utc)                      AS plus_recente,
        ROUND(MIN(indice)::numeric, 4)     AS indice_min,
        ROUND(MAX(indice)::numeric, 4)     AS indice_max,
        ROUND(AVG(indice)::numeric, 4)     AS indice_moyen
      FROM measurements
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[GET /api/stats]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
