'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const Sequelize = require('sequelize');
const initModels = require('./init-models'); // Vérifie bien s'il y a un tiret ici

const dbName = process.env.DB_NAME || process.env.POSTGRES_DB || 'meteo_db';
const dbUser = process.env.DB_USER || process.env.POSTGRES_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || '';
const dbHost = process.env.DB_HOST || process.env.POSTGRES_HOST || process.env.DB_SHARD_NORD_HOST || 'localhost';
const dbPort = Number(process.env.DB_PORT || process.env.POSTGRES_PORT || 5432);
const dbDialect = process.env.DB_DIALECT || 'postgres';
const dbSslEnabled = (process.env.DB_SSL || '').toLowerCase() === 'true';
const dbSslRejectUnauthorized = (process.env.DB_SSL_REJECT_UNAUTHORIZED || '').toLowerCase() === 'true';

const sequelizeOptions = {
  host: dbHost,
  port: dbPort,
  dialect: dbDialect,
  logging: false,
};

if (dbSslEnabled) {
  sequelizeOptions.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: dbSslRejectUnauthorized,
    },
  };
}

/**
 * Initializes the Sequelize connection using environment variables.
 * This instance will be shared across the entire application.
 */
const sequelize = new Sequelize(
  dbName,
  dbUser,
  dbPassword,
  sequelizeOptions
);

/**
 * Executes the initModels function to map all generated models to the connection.
 */
const db = initModels(sequelize);

// Expose the instances for use in server.js (db.sequelize)
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;