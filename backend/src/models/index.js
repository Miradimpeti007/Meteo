'use strict';

require('dotenv').config();

const Sequelize = require('sequelize');
const initModels = require('./init-models'); // Vérifie bien s'il y a un tiret ici

/**
 * Initializes the Sequelize connection using environment variables.
 * This instance will be shared across the entire application.
 */
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    logging: false,
  }
);

/**
 * Executes the initModels function to map all generated models to the connection.
 */
const db = initModels(sequelize);

// Expose the instances for use in server.js (db.sequelize)
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;