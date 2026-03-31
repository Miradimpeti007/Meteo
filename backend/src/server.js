const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const express = require('express');
const { sequelize } = require('./models');
const errorMiddleware = require('./middlewares/ErrorMiddleware');
// 1. AJOUT DE L'IMPORT DU JOB (Le gestionnaire de tâches)
const initJobs = require('./jobs/syncJob'); 

const PORT = process.env.PORT || 8080;

/** Intervalle de synchronisation (toutes les 3 heures) */
const intTroisHeures = '0 */3 * * *'; 
const server = express();

server.use(express.json());

sequelize.authenticate()
    .then(() => console.log("✅ Connexion Sequelize OK"))
    .catch(err => {
        console.error("❌ Erreur Sequelize :", err);
        process.exit(1);
    });

server.get("/", function(req, res) {
    res.status(200).json({ message: "Bienvenue sur l'API Météo !" });
});

server.use('/api/previsions', require('./routes/PrevisionRoutes'));
server.use('/api/sync', require('./routes/syncRoutes'));

server.use(errorMiddleware);

// 2. MODIFICATION DU LISTEN POUR ACTIVER LES JOBS
server.listen(PORT, async () => {
    console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
    
    // C'EST ICI QUE TOUT SE DÉCLENCHE :
    // - Le cron des 3h est programmé
    // - Le check de la BDD (les 10 jours) est lancé
    await initJobs(intTroisHeures); 
});