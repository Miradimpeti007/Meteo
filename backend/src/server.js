
require('dotenv').config();

const express = require('express');
const { sequelize } = require('./models');
const errorMiddleware = require('./middlewares/ErrorMiddleware');

const PORT = process.env.PORT || 8080;

// Initialisation de l'application Express
const server = express();

/**
 * Configuration des middlewares globaux.
 * Permet l'analyse des requêtes entrantes avec des payloads au format JSON.
 */
server.use(express.json());

/**
 * Vérification de la connexion à la base de données.
 * Authentifie l'instance Sequelize et interrompt le processus en cas d'échec critique.
 */
sequelize.authenticate()
    .then(() => console.log("✅ Connexion Sequelize OK"))
    .catch(err => {
        console.error("❌ Erreur Sequelize :", err);
        process.exit(1);
    });

/**
 * Point d'entrée principal de l'API.
 * Renvoie un message de bienvenue confirmant l'état opérationnel du serveur.
 */
server.get("/", function(req, res) {
    res.status(200).json({ message: "Bienvenue sur l'API Météo !" });
});

/**
 * Nos endpoints d'API sont organisés dans des routes dédiées.
 * Chaque route est associée à un contrôleur spécifique pour une meilleure modularité.
 */
server.use('/api/previsions', require('./routes/PrevisionRoutes'));


/**
 * Middleware global de gestion des erreurs.
 * Intercepte et formate toutes les exceptions non gérées par les contrôleurs.
 */
server.use(errorMiddleware);

/**
 * Démarrage du serveur.
 * Initialise l'écoute des requêtes HTTP sur le port configuré.
 */
server.listen(PORT, () => {
    console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
});
