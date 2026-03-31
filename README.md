cat > ~/Meteo/README.md << 'EOF'
# Meteo — Challenge 48h

Application web de visualisation de la pollution atmosphérique et météorologique en temps réel, construite en 48h par 3 équipes.

---

## Prérequis

- Docker Engine 26+
- Docker Compose v2
- Git

---

## Installation

### 1. Cloner le repo
```bash
git clone https://github.com/Miradimpeti007/Meteo.git
cd Meteo
```

### 2. Configurer les variables d'environnement
```bash
cp .env.example .env
nano .env  # remplir tous les mots de passe
```

### 3. Générer le certificat TLS
```bash
mkdir -p infra/nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout infra/nginx/certs/key.pem \
  -out infra/nginx/certs/cert.pem \
  -subj "/CN=localhost"
```

### 4. Lancer la stack
```bash
cd infra
docker compose --env-file ../.env up -d
```

### 5. Vérifier
```bash
docker compose --env-file ../.env ps
```

---

## URLs accessibles

| Service | URL | Credentials |
|---|---|---|
| Application | http://localhost | — |
| Grafana | http://localhost:3000 | admin / voir .env |
| pgAdmin | http://localhost:5050 | voir .env |
| Prometheus | http://localhost:9090 | — |
| cAdvisor | http://localhost:8080 | — |
| Data API | http://localhost/api/data | — |

---

## Fréquence de rafraîchissement des données

| Source | Fréquence |
|---|---|
| Collecte OpenData (polluants + météo) | toutes les 5 minutes |
| Mise à jour de la carte Leaflet | temps réel (sans rechargement) |
| Métriques Prometheus | toutes les 15 secondes |
| Dashboards Grafana | toutes les 10 secondes |

---

## Calcul de l'indice pollution/météo

L'indice combiné est calculé par l'équipe Data à partir de deux sources OpenData :
- **Polluants** : concentrations NO2, PM10, PM2.5, O3 depuis data.gouv.fr
- **Météo** : données SYNOP (température, vent, pression) depuis data.gouv.fr

### Méthodologie de pondération
1. Normalisation de chaque indicateur sur une échelle 0-100
2. Jointure géospatiale entre stations météo et stations pollution par proximité GPS
3. Calcul de l'indice combiné avec pondération :
   - Polluants : 60%
   - Météo : 40%
4. Résultat final normalisé sur 0-100

### Interprétation de l'indice
| Valeur | Qualité | Couleur carte |
|---|---|---|
| 0-25 | Très bonne | Vert |
| 26-50 | Bonne | Jaune |
| 51-75 | Moyenne | Orange |
| 76-100 | Mauvaise | Rouge |

---

## Architecture

### Réseaux Docker
- `net_front` : Nginx + Frontend + Backend (zone publique)
- `net_data` : Backend + Data service + PostgreSQL + Monitoring (zone interne)

### Base de données HA
- **postgres1** : Master (Leader Patroni) — région IDF + AURA
- **postgres2** : Slave (Replica Patroni) — région PACA + OCCI
- Failover automatique via Patroni + etcd en moins de 30 secondes

### Sharding
Les données sont réparties sur 2 serveurs selon la région géographique :

| Serveur | Régions | Table |
|---|---|---|
| postgres1 | IDF, Île-de-France | shard_nord |
| postgres2 | PACA, OCCI, Sud | shard_sud |


## Setup PostGIS Sharding

Après le premier démarrage de la stack, lancer :
```bash
bash infra/scripts/setup_geospatial.sh
```

Cela charge les polygones des régions françaises et configure le routing géospatial automatique.
EOF

---

## Tests infra
```bash
# Test failover Master/Slave
bash infra/scripts/test_failover.sh

# Test isolation réseau
bash infra/scripts/test_network.sh

# Test persistance volumes
bash infra/scripts/test_volumes.sh

# Test sharding
bash infra/scripts/test_sharding.sh
```

---

## Structure du projet
```
Meteo/
├── .env.example          # Variables d'environnement (template)
├── .gitignore
├── README.md
├── data/                 # Équipe Data/IA
│   ├── api/              # FastAPI endpoints
│   ├── src/              # Pipeline traitement données
│   ├── data/processed/   # CSV générés
│   └── Dockerfile
├── backend/              # Équipe Dev — API Node.js
│   ├── src/
│   └── Dockerfile
├── frontend/             # Équipe Dev — React + Leaflet
│   ├── src/
│   └── Dockerfile
└── infra/                # Équipe Infra
    ├── docker-compose.yml
    ├── nginx/
    ├── patroni/
    ├── monitoring/
    ├── pgadmin/
    ├── postgres/
    └── scripts/
```
