require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

/**
 * Initializes the Sequelize instance for PostgreSQL database connection.
 * Connects using environment variables defined in the .env file.
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
    console.log(`⏳ [INFO] Tentative de connexion à la base de données (${process.env.DB_HOST}:${process.env.DB_PORT})...`);
    await sequelize.authenticate();
    console.log('✅ [SUCCÈS] Connexion à la base de données établie.');
    
    console.log('⏳ [INFO] Synchronisation du modèle "Prevision" avec la table "previsions"...');
    await Prevision.sync({ alter: true });
    console.log('✅ [SUCCÈS] La table "previsions" est prête et synchronisée.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ [ERREUR CRITIQUE] Impossible d\'initialiser la base de données.');
    console.error('🔍 [DÉTAILS DE L\'ERREUR] :', error.message || error);
    process.exit(1);
  }
}

initDatabase();