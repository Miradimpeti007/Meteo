const { Sequelize, DataTypes } = require('sequelize');

/**
 * Initializes the Sequelize instance for PostgreSQL database connection.
 * Note: Hardcoded credentials should be replaced with environment variables in production.
 */
const sequelize = new Sequelize('meteo_db', 'meteo_user', 'posq$12!', {
  host: '10.70.2.86', 
  port: 5432,
  dialect: 'postgres',
  logging: false, 
});

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
    console.log('⏳ [INFO] Tentative de connexion à la base de données (10.70.2.86)...');
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