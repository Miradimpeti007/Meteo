#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const { Sequelize, DataTypes, QueryTypes } = require('sequelize');

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const DB_NAME = requireEnv('POSTGRES_DB');
const DB_USER = requireEnv('POSTGRES_USER');
const DB_PASSWORD = requireEnv('POSTGRES_PASSWORD');
const DB_HOST = requireEnv('POSTGRES_HOST');
const DB_PORT = Number(requireEnv('POSTGRES_PORT'));

const sequelizeNord = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: process.env.DB_SHARD_NORD_HOST || 'postgres1',
  port: DB_PORT,
  dialect: 'postgres',
  logging: false,
});

const sequelizeSud = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: process.env.DB_SHARD_SUD_HOST || 'postgres3',
  port: DB_PORT,
  dialect: 'postgres',
  logging: false,
});

const PrevisionModel = (sequelize) => sequelize.define('Prevision', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  indice: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  dateprevision: {
    type: DataTypes.DATE,
    allowNull: false
  },
  shard: {
    type: DataTypes.STRING(10),
    allowNull: true
  }
}, {
  tableName: 'previsions',
  timestamps: true
});

const setupPostGIS = async (sequelize, shardName) => {
  console.log(`[INFO] Setting up PostGIS on ${shardName}...`);

  await sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');
  console.log(`[SUCCESS] PostGIS enabled on ${shardName}`);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS regions (
      id SERIAL PRIMARY KEY,
      region_code VARCHAR(10),
      region_name VARCHAR(100),
      shard VARCHAR(10),
      geom GEOMETRY(GEOMETRY, 4326)
    );
  `);

  const [result] = await sequelize.query('SELECT COUNT(*) as count FROM regions;', { type: QueryTypes.SELECT });
  
  if (parseInt(result.count) === 0) {
    console.log(`[INFO] Loading regions on ${shardName}...`);
    const fs = require('fs');
    const geojsonPath = path.resolve(__dirname, '../../infra/postgres/regions.geojson');
    
    if (fs.existsSync(geojsonPath)) {
      const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
      const nordRegions = ['11', '84'];

      for (const feature of data.features) {
        const code = feature.properties.code || '';
        const name = feature.properties.nom || '';
        const shard = nordRegions.includes(code) ? 'nord' : 'sud';
        const geom = JSON.stringify(feature.geometry);

        await sequelize.query(`
          INSERT INTO regions (region_code, region_name, shard, geom)
          VALUES (:code, :name, :shard, ST_SetSRID(ST_GeomFromGeoJSON(:geom), 4326))
          ON CONFLICT DO NOTHING;
        `, { replacements: { code, name, shard, geom } });
        console.log(`[INFO] Loaded region ${code} (${name}) → ${shard}`);
      }
    } else {
      console.warn(`[WARN] regions.geojson not found at ${geojsonPath}`);
    }
  } else {
    console.log(`[INFO] Regions already loaded on ${shardName} (${result.count} regions)`);
  }

  await sequelize.query(`
    CREATE OR REPLACE FUNCTION get_shard_from_coords(lat FLOAT, lon FLOAT)
    RETURNS VARCHAR AS $$
    DECLARE
      v_shard VARCHAR;
    BEGIN
      SELECT shard INTO v_shard
      FROM regions
      WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(lon, lat), 4326))
      LIMIT 1;
      RETURN COALESCE(v_shard, 'sud');
    END;
    $$ LANGUAGE plpgsql;
  `);
  console.log(`[SUCCESS] Sharding function created on ${shardName}`);
};

const setupTrigger = async (sequelize, shardName) => {
  await sequelize.query(`
    ALTER TABLE previsions ADD COLUMN IF NOT EXISTS shard VARCHAR(10);

    CREATE OR REPLACE FUNCTION route_to_shard()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.shard := get_shard_from_coords(NEW.latitude, NEW.longitude);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_route_shard ON previsions;
    CREATE TRIGGER trg_route_shard
      BEFORE INSERT ON previsions
      FOR EACH ROW EXECUTE FUNCTION route_to_shard();
  `);
  console.log(`[SUCCESS] Sharding trigger created on ${shardName}`);
};

async function initDatabase() {
  try {
    // ── Shard Nord ──────────────────────────
    console.log(`[INFO] Connecting to Nord shard (${process.env.DB_SHARD_NORD_HOST || 'postgres1'})...`);
    await sequelizeNord.authenticate();
    console.log('[SUCCESS] Nord shard connected');

    const PrevisionNord = PrevisionModel(sequelizeNord);
    await PrevisionNord.sync({ alter: true });
    console.log('[SUCCESS] previsions table synced on Nord shard');

    await setupPostGIS(sequelizeNord, 'Nord');
    await setupTrigger(sequelizeNord, 'Nord');

    // ── Shard Sud ──────────────────────────
    console.log(`[INFO] Connecting to Sud shard (${process.env.DB_SHARD_SUD_HOST || 'postgres3'})...`);
    await sequelizeSud.authenticate();
    console.log('[SUCCESS] Sud shard connected');

    const PrevisionSud = PrevisionModel(sequelizeSud);
    await PrevisionSud.sync({ alter: true });
    console.log('[SUCCESS] previsions table synced on Sud shard');

    await setupPostGIS(sequelizeSud, 'Sud');
    await setupTrigger(sequelizeSud, 'Sud');

    console.log('[SUCCESS] Database initialization complete');
    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Database initialization failed');
    console.error('[ERROR_DETAILS]:', error.message || error);
    process.exit(1);
  }
}

initDatabase();