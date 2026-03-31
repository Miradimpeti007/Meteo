# Meteo — Challenge 48h

## Prérequis
- Docker Engine
- Docker Compose v2

## Installation

### 1. Cloner le repo
git clone https://github.com/Miradimpeti007/Meteo.git
cd Meteo

### 2. Configurer les variables d'environnement
cp .env.example .env
# Editer .env et remplir les mots de passe

### 3. Générer le certificat TLS
mkdir -p infra/nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout infra/nginx/certs/key.pem \
  -out infra/nginx/certs/cert.pem \
  -subj "/CN=localhost"

### 4. Lancer la stack
cd infra
docker compose --env-file ../.env up -d

### 5. Vérifier
docker compose --env-file ../.env ps

## Services accessibles
| Service   | URL                        |
|-----------|----------------------------|
| App       | http://localhost            |
| Grafana   | http://localhost:3000       |
| pgAdmin   | http://localhost:5050       |
| Prometheus| http://localhost:9090       |

## Tests
bash scripts/test_failover.sh
bash scripts/test_network.sh
bash scripts/test_volumes.sh
