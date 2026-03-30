require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

/**
 * Initializes the Sequelize instance using environment variables.
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
 * Defines the 'Prevision' model with a uniqueness constraint on the 'name' field.
 */
const Prevision = sequelize.define('Prevision', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true // Ensures each city appears only once
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
 * Dataset of 100 French cities with high-precision coordinates.
 */
const frenchCities = [
  { name: "Paris", lat: 48.856614, lon: 2.3522219 },
  { name: "Marseille", lat: 43.296482, lon: 5.36978 },
  { name: "Lyon", lat: 45.764043, lon: 4.835659 },
  { name: "Toulouse", lat: 43.604652, lon: 1.444209 },
  { name: "Nice", lat: 43.7101728, lon: 7.2619532 },
  { name: "Nantes", lat: 47.218371, lon: -1.553621 },
  { name: "Montpellier", lat: 43.610769, lon: 3.876716 },
  { name: "Strasbourg", lat: 48.5734053, lon: 7.7521113 },
  { name: "Bordeaux", lat: 44.837789, lon: -0.57918 },
  { name: "Lille", lat: 50.62925, lon: 3.057256 },
  { name: "Rennes", lat: 48.117266, lon: -1.6777926 },
  { name: "Reims", lat: 49.258329, lon: 4.031696 },
  { name: "Saint-Étienne", lat: 45.439695, lon: 4.3871779 },
  { name: "Le Havre", lat: 49.49437, lon: 0.107929 },
  { name: "Toulon", lat: 43.124228, lon: 5.928 },
  { name: "Grenoble", lat: 45.188529, lon: 5.724524 },
  { name: "Dijon", lat: 47.322047, lon: 5.04148 },
  { name: "Angers", lat: 47.478419, lon: -0.563166 },
  { name: "Nîmes", lat: 43.836699, lon: 4.360054 },
  { name: "Villeurbanne", lat: 45.771944, lon: 4.890171 },
  { name: "Aix-en-Provence", lat: 43.529742, lon: 5.447427 },
  { name: "Le Mans", lat: 48.00611, lon: 0.199556 },
  { name: "Clermont-Ferrand", lat: 45.777222, lon: 3.082222 },
  { name: "Brest", lat: 48.390394, lon: -4.486076 },
  { name: "Tours", lat: 47.394144, lon: 0.68484 },
  { name: "Amiens", lat: 49.894067, lon: 2.295753 },
  { name: "Limoges", lat: 45.833619, lon: 1.261105 },
  { name: "Annecy", lat: 45.899247, lon: 6.129384 },
  { name: "Perpignan", lat: 42.688659, lon: 2.894833 },
  { name: "Boulogne-Billancourt", lat: 48.833333, lon: 2.25 },
  { name: "Metz", lat: 49.119308, lon: 6.175715 },
  { name: "Besançon", lat: 47.237829, lon: 6.0240539 },
  { name: "Orléans", lat: 47.902964, lon: 1.909251 },
  { name: "Saint-Denis", lat: 48.936181, lon: 2.357443 },
  { name: "Argenteuil", lat: 48.947815, lon: 2.247515 },
  { name: "Rouen", lat: 49.443232, lon: 1.099971 },
  { name: "Montreuil", lat: 48.862326, lon: 2.441221 },
  { name: "Mulhouse", lat: 47.748646, lon: 7.33923 },
  { name: "Caen", lat: 49.182863, lon: -0.370797 },
  { name: "Nancy", lat: 48.692054, lon: 6.184417 },
  { name: "Saint-Paul", lat: -21.009, lon: 55.2707 },
  { name: "Roubaix", lat: 50.6927049, lon: 3.177847 },
  { name: "Tourcoing", lat: 50.723912, lon: 3.161173 },
  { name: "Nanterre", lat: 48.8914, lon: 2.2044 },
  { name: "Avignon", lat: 43.949317, lon: 4.805528 },
  { name: "Vitry-sur-Seine", lat: 48.787504, lon: 2.392138 },
  { name: "Créteil", lat: 48.777051, lon: 2.453147 },
  { name: "Dunkerque", lat: 51.034368, lon: 2.376771 },
  { name: "Poitiers", lat: 46.580224, lon: 0.340375 },
  { name: "Asnières-sur-Seine", lat: 48.910556, lon: 2.289167 },
  { name: "Courbevoie", lat: 48.89732, lon: 2.253011 },
  { name: "Versailles", lat: 48.801408, lon: 2.130122 },
  { name: "Colombes", lat: 48.923145, lon: 2.252062 },
  { name: "Cherbourg-en-Cotentin", lat: 49.6337, lon: -1.6221 },
  { name: "Aulnay-sous-Bois", lat: 48.934057, lon: 2.490807 },
  { name: "Saint-Maur-des-Fossés", lat: 48.80237, lon: 2.485196 },
  { name: "Rueil-Malmaison", lat: 48.877615, lon: 2.180211 },
  { name: "Pau", lat: 43.2951, lon: -0.370797 },
  { name: "Aubervilliers", lat: 48.913009, lon: 2.38318 },
  { name: "Champigny-sur-Marne", lat: 48.817088, lon: 2.51347 },
  { name: "Antibes", lat: 43.580418, lon: 7.125102 },
  { name: "Béziers", lat: 43.344212, lon: 3.215797 },
  { name: "La Rochelle", lat: 46.160329, lon: -1.151139 },
  { name: "Saint-Pierre", lat: -21.3392, lon: 55.4781 },
  { name: "Cannes", lat: 43.552847, lon: 7.017369 },
  { name: "Saint-Calais", lat: 47.9208, lon: 0.7456 },
  { name: "Mérignac", lat: 44.83857, lon: -0.64321 },
  { name: "Saint-Nazaire", lat: 47.27312, lon: -2.21373 },
  { name: "Colmar", lat: 48.079358, lon: 7.358512 },
  { name: "Ajaccio", lat: 41.927193, lon: 8.734603 },
  { name: "Issy-les-Moulineaux", lat: 48.8239, lon: 2.2704 },
  { name: "Noisy-le-Grand", lat: 48.847712, lon: 2.55276 },
  { name: "Vénissieux", lat: 45.697778, lon: 4.886667 },
  { name: "Évry-Courcouronnes", lat: 48.6239, lon: 2.4297 },
  { name: "Levallois-Perret", lat: 48.895, lon: 2.2872 },
  { name: "Quimper", lat: 47.997542, lon: -4.097893 },
  { name: "La Seyne-sur-Mer", lat: 43.100556, lon: 5.884167 },
  { name: "Antony", lat: 48.753801, lon: 2.296537 },
  { name: "Villeneuve-d'Ascq", lat: 50.6233, lon: 3.1444 },
  { name: "Troyes", lat: 48.297345, lon: 4.074401 },
  { name: "Neuilly-sur-Seine", lat: 48.885, lon: 2.2686 },
  { name: "Sarcelles", lat: 48.9956, lon: 2.3764 },
  { name: "Niort", lat: 46.32313, lon: -0.46313 },
  { name: "Chambéry", lat: 45.564601, lon: 5.917781 },
  { name: "Pessac", lat: 44.8067, lon: -0.6311 },
  { name: "Lorient", lat: 47.7483, lon: -3.3642 },
  { name: "Beauvais", lat: 49.4317, lon: 2.0833 },
  { name: "Montauban", lat: 44.0175, lon: 1.355 },
  { name: "Hyères", lat: 43.1206, lon: 6.1286 },
  { name: "Saint-Quentin", lat: 49.8486, lon: 3.2867 },
  { name: "Bondy", lat: 48.9022, lon: 2.4828 },
  { name: "Ivry-sur-Seine", lat: 48.8131, lon: 2.3872 },
  { name: "Vannes", lat: 47.6559, lon: -2.7603 },
  { name: "Maisons-Alfort", lat: 48.8058, lon: 2.4378 },
  { name: "Clichy", lat: 48.9036, lon: 2.3064 },
  { name: "Arles", lat: 43.6767, lon: 4.6278 },
  { name: "La Roche-sur-Yon", lat: 46.6705, lon: -1.426 },
  { name: "Pantin", lat: 48.8911, lon: 2.4036 },
  { name: "Épinay-sur-Seine", lat: 48.9553, lon: 2.3092 },
  { name: "Fréjus", lat: 43.4331, lon: 6.7364 }
];

/**
 * Main function to seed the database with 100 unique city records.
 */
async function seedDatabase() {
  try {
    console.log('⏳ [INFO] Connexion pour le remplissage des données...');
    await sequelize.authenticate();

    // Re-sync with uniqueness constraint
    await Prevision.sync({ alter: true });

    const seedData = frenchCities.map((city) => {
      // Random ATMO index between 1 and 6
      const randomIndice = Math.floor(Math.random() * 6) + 1;
      
      // Random date within the last 10 days
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 10));

      return {
        name: city.name,
        indice: randomIndice,
        latitude: city.latitude || city.lat,
        longitude: city.longitude || city.lon,
        dateprevison: date
      };
    });

    console.log('⏳ [INFO] Insertion des 100 villes françaises...');
    await Prevision.bulkCreate(seedData, { ignoreDuplicates: true });
    
    console.log('✅ [SUCCÈS] 100 villes insérées avec succès (doublons ignorés).');
    process.exit(0);
  } catch (error) {
    console.error('❌ [ERREUR] Échec du remplissage :', error.message);
    process.exit(1);
  }
}

seedDatabase();