require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

/**
 * Initializes the Sequelize instance for the PostgreSQL database connection.
 * Connects using environment variables defined in the .env file.
 */
const sequelize = new Sequelize(
  process.env.DB_NAME || process.env.POSTGRES_DB,
  process.env.DB_USER || process.env.POSTGRES_USER,
  process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
  {
    host: process.env.DB_HOST || process.env.POSTGRES_HOST,
    port: process.env.DB_PORT || process.env.POSTGRES_PORT || 5432,
    dialect: process.env.DB_DIALECT || 'postgres',
    dialectOptions: (process.env.DB_SSL === 'true' || process.env.DB_SSL === true)
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
          }
        }
      : undefined,
    logging: false,
  }
);

/**
 * Defines the 'Prevision' model mapping to the 'previsions' table.
 * Implements a composite unique constraint to handle historical data efficiently
 * without allowing perfect duplicates.
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
    type: DataTypes.DOUBLE, 
    allowNull: false
  },
  longitude: {
    type: DataTypes.DOUBLE,
    allowNull: false
  },
  latitude: {
    type: DataTypes.DOUBLE,
    allowNull: false
  },
  dateprevision: {
    type: DataTypes.DATE, 
    allowNull: false
  }
}, {
  tableName: 'previsions',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['name', 'dateprevision'],
      name: 'unique_city_forecast_time'
    }
  ]
});

/**
 * Authenticates the connection and synchronizes the model with the database.
 * Utilizes { alter: true } to update existing tables without dropping them,
 * ensuring structure matches the model definition.
 */
async function setupDatabase() {
  try {
    console.log(`⏳ [INFO] Tentative de connexion à la base de données (${process.env.DB_HOST}:${process.env.DB_PORT})...`);
    await sequelize.authenticate();
    console.log('✅ [SUCCÈS] Connexion à la base de données établie.');
    
    console.log('⏳ [INFO] Synchronisation du modèle "Prevision" avec la table "previsions"...');
    // { alter: true } updates the table structure to match the model
    await Prevision.sync({ alter: true });
    console.log('✅ [SUCCÈS] La table "previsions" est prête et synchronisée avec la nouvelle architecture.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ [ERREUR CRITIQUE] Impossible d\'initialiser la base de données.');
    console.error('🔍 [DÉTAILS DE L\'ERREUR] :', error.message || error);
    process.exit(1);
  }
}

setupDatabase();