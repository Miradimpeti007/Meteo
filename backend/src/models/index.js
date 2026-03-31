'use strict';
require('dotenv').config();
const Sequelize = require('sequelize');
const initModels = require('./init-models');

const getRegionFromCoords = (lat, lon) => {
  if (lat >= 48.1 && lat <= 49.2 && lon >= 1.4 && lon <= 3.6) return 'IDF';
  if (lat >= 44.1 && lat <= 46.8 && lon >= 2.1 && lon <= 7.2) return 'AURA';
  if (lat >= 43.0 && lat <= 44.5 && lon >= 4.2 && lon <= 7.7) return 'PACA';
  if (lat >= 42.3 && lat <= 44.9 && lon >= 0.0 && lon <= 4.0) return 'OCCI';
  return 'OTHER';
};

const sequelizeNord = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_SHARD_NORD_HOST || 'postgres1',
    port: process.env.DB_PORT || 5432,
    dialect: process.env.DB_DIALECT || 'postgres',
    logging: false,
  }
);

const sequelizeSud = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_SHARD_SUD_HOST || 'postgres3',
    port: process.env.DB_PORT || 5432,
    dialect: process.env.DB_DIALECT || 'postgres',
    logging: false,
  }
);

const dbNord = initModels(sequelizeNord);
dbNord.sequelize = sequelizeNord;
dbNord.Sequelize = Sequelize;

const dbSud = initModels(sequelizeSud);
dbSud.sequelize = sequelizeSud;
dbSud.Sequelize = Sequelize;

const getShard = (lat, lon) => {
  const region = getRegionFromCoords(lat, lon);
  if (['IDF', 'AURA'].includes(region)) return dbNord;
  return dbSud;
};

module.exports = { dbNord, dbSud, getShard, getRegionFromCoords };
