#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const { Sequelize, DataTypes } = require('sequelize');

/**
 * Initializes the Sequelize instance for PostgreSQL database connection.
 * Uses environment variables loaded from .env.
 */
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
const DB_SSL = (process.env.POSTGRES_SSL || 'false').toLowerCase() === 'true';
const DB_SSL_REJECT_UNAUTHORIZED =
  (process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED || 'false').toLowerCase() === 'true';

const sequelizeOptions = {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: false,
};

if (DB_SSL) {
  sequelizeOptions.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: DB_SSL_REJECT_UNAUTHORIZED,
    },
  };
}

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, sequelizeOptions);

/**
 * Defines the 'Prevision' model mapping to the 'previsions' table.
 */
const Prevision = sequelize.define('Prevision', {
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
  dateprevison: {
    type: DataTypes.DATE, 
    allowNull: false
  }
}, {
  tableName: 'previsions',
  timestamps: true 
});

/**
 * Authenticates the connection and synchronizes the model with the database.
 * Outputs the execution process and handles potential connection errors.
 */
async function initDatabase() {
  try {
    console.log(`[INFO] Tentative de connexion à la base de donnees (${DB_HOST}:${DB_PORT})...`);
    await sequelize.authenticate();
    console.log('[SUCCESS] Connexion a la base de donnees etablie.');
    
    console.log('[INFO] Synchronisation du modele "Prevision" avec la table "previsions"...');
    await Prevision.sync({ alter: true });
    console.log('[SUCCESS] La table "previsions" est prete et synchronisee.');
    
    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Impossible d\'initialiser la base de donnees.');
    console.error('[ERROR_DETAILS]:', error.message || error);
    process.exit(1);
  }
}

initDatabase();