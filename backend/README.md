🌦️ Meteo Backend - Challenge 48Ce projet est l'API centrale du Challenge 48. 

Elle permet de collecter, stocker et distribuer des données météorologiques. Le serveur tourne en local avec Node.js et communique avec une base de données PostgreSQL.

🛠️ 1. Pré-requis indispensablesAvant de lancer l'application, assure-toi d'avoir installé :Node.js (v18 ou +)PostgreSQL : La base de données doit être installée et active sur ton système (ou via un container Docker) sur le port 5432.⚙️ 2. Configuration de l'environnement (.env)Crée un fichier .env à la racine du dossier backend/ (au même niveau que le package.json) :Extrait de code# --- Base de données (PostgreSQL) ---

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=meteo_db
DB_USER=meteo_user
DB_PASSWORD=posq$12!
DB_DIALECT=postgres
PORT=8080

# Data Team API Endpoints
API_URL_RECENT=http://api.data-meteo.com/v1/recent
API_URL_HISTORY=http://api.data-meteo.com/v1/history
API_URL_RANGE=http://api.data-meteo.com/v1/range

# Security
SYNC_API_KEY=KeyForSyncAPI

# Config
DAYS_TO_RETRIEVE=10

# Sync API Key
SYNC_API_KEY=KeyForSyncAPI

# --- Configuration Serveur ---
PORT=8080

# --- API de la Data Team ---
API_URL_RECENT=http://api.data-meteo.com/v1/recent
API_URL_HISTORY=http://api.data-meteo.com/v1/history
API_URL_RANGE=http://api.data-meteo.com/v1/range

# --- Sécurité & Synchronisation ---
SYNC_API_KEY=KeyForSyncAPI
DAYS_TO_RETRIEVE=10


🚀 3. Installation et Initialisation (Étapes clés)Suis scrupuleusement cet ordre pour que l'application fonctionne :Étape 1 : Installation des dépendancesOuvre un terminal dans le dossier backend/src :Bashnpm install
Étape 2 : Création et Population de la base (Scripts)Avant de lancer le serveur, tu dois créer les tables et injecter les données de test. Utilise les scripts situés dans le dossier scripts/ :Créer les tables (Synchronisation des modèles Sequelize) :Bashnode scripts/init_db.js
Peupler la base (Injection des données initiales) :Bashnode scripts/init_db_data.js
Étape 3 : Lancement du serveur localUne fois la base prête, démarre l'API :Bashnode server.js
L'API est maintenant disponible sur : http://localhost:8080

🛰️ 4. Catalogue des Routes API📊 Prévisions (Préfixe: /api/previsions)RouteMéthodeDescription/getAllGETRécupère tout l'historique en base./getActualGETRécupère le dernier relevé pour chaque ville (DISTINCT ON)./getDate/:date/:hourGETRecherche par date (YYYY-MM-DD) et heure (HH) avec une marge de $\pm 1.5$h./getByIndiceGETFiltre par indice via Query Params (?min=2&max=4 ou ?eq=5).

🔄 Synchronisation (Préfixe: /api/sync)RouteMéthodeDescription/rangePOSTDéclenche une synchronisation manuelle.Note Sécurité : Pour la route /range, tu dois ajouter le header x-api-key: KeyForSyncAPI dans Postman.📂 5. Structure du dossier srccontrollers/ : Logique métier et requêtes Sequelize.routes/ : Définition des chemins et des protections.models/ : Schémas des tables PostgreSQL.scripts/ : Utilitaires pour l'initialisation (init_db) et le remplissage (init_db_data) de la base.jobs/ : Planification des tâches automatiques (Cron toutes les 3h).middlewares/ : Sécurité et vérification des clés API.🛠️ MaintenanceSi tu modifies la structure d'une table dans le dossier models/, n'oublie pas de relancer node scripts/init_db.js pour mettre à jour ta base PostgreSQL locale.