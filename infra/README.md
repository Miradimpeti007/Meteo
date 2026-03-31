# Infra Runbook (Validation Criteria)

Ce document couvre uniquement la partie Infrastructure: orchestration Docker, HA PostgreSQL, isolation reseau, monitoring, secrets, commandes de test et preuves attendues.

## 1) Architecture Infra

- Orchestrateur: Docker Compose ([infra/docker-compose.yml](infra/docker-compose.yml))
- Reverse proxy: Nginx ([infra/nginx/nginx.conf](infra/nginx/nginx.conf))
- Reseaux Docker:
  - `net_front`: reverse-proxy, frontend, backend
  - `net_data`: backend, data_service, postgres*, etcd, monitoring, pgadmin
- Base de donnees HA:
  - Cluster north: `postgres1`, `postgres2`
  - Cluster south: `postgres3`, `postgres4`
  - Coordination: `etcd`

## 2) Services, URLs, Ports

### Services publics (host)

- Application (Nginx): http://localhost
- API via Nginx: http://localhost/api/previsions
- API backend direct: http://localhost:8888/api/previsions
- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090
- cAdvisor: http://localhost:8081
- pgAdmin: http://localhost:5050
- HTTPS Nginx: https://localhost

### Ports exposes par Compose

- `80:80` reverse-proxy
- `443:443` reverse-proxy
- `8888:8080` backend
- `3000:3000` grafana
- `9090:9090` prometheus
- `8081:8080` cadvisor
- `5050:80` pgadmin

## 3) Commandes de lancement

### Lancer toute la stack

```bash
cd infra
docker compose --env-file .env up -d --build
```

### Recreer tous les conteneurs

```bash
cd infra
docker compose --env-file .env down
docker compose --env-file .env up -d --build --force-recreate
```

### Lancer une partie specifique

```bash
# Nginx + Front + Back
cd infra
docker compose --env-file .env up -d --build reverse-proxy frontend backend

# DB + Patroni + etcd
cd infra
docker compose --env-file .env up -d etcd postgres1 postgres2 postgres3 postgres4

# Monitoring
cd infra
docker compose --env-file .env up -d prometheus grafana cadvisor postgres_exporter

# Data service
cd infra
docker compose --env-file .env up -d --build data_service
```

### Etat et logs

```bash
cd infra
docker compose --env-file .env ps
docker logs -f backend
docker logs -f postgres1
```

## 4) Initialisation DB (important)

Le script de creation/sync DB doit etre execute dans le conteneur backend (reseau Docker), pas depuis l'hote.

```bash
cd infra
docker compose --env-file .env exec -T -e DB_HOST=postgres2 backend node scripts/init_db.js
```

Note:
- `postgres1` peut etre read-only selon l'etat Patroni.
- Utiliser le noeud writable (leader) pour les operations DDL.

## 4.1) Sharding geospatial (PostGIS)

Objectif:
- Router les donnees vers un shard physique selon la position GPS (lat/lon).
- Eviter un decoupage statique hardcode par ville.
- Prouver que la distribution est reelle sur deux serveurs PostgreSQL.

Composants utilises:
- GeoJSON des regions: [infra/postgres/regions.geojson](infra/postgres/regions.geojson)
- Script PostGIS/regions/fonctions: [infra/postgres/setup_postgis.py](infra/postgres/setup_postgis.py)
- Test de routing geospatial: [infra/scripts/test_sharding.sh](infra/scripts/test_sharding.sh)

Principe de fonctionnement:
1. Activation PostGIS sur les clusters cibles.
2. Creation de la table `regions(region_code, region_name, shard, geom)`.
3. Chargement des polygones GeoJSON en SRID 4326.
4. Attribution d'un shard logique (`nord` ou `sud`) par region.
5. Creation de la fonction SQL `get_shard_from_coords(lat, lon)`:
   - `ST_Contains(geom, ST_SetSRID(ST_MakePoint(lon, lat), 4326))`
   - retourne le shard correspondant, fallback `sud`.
6. Creation du trigger `route_to_shard()` sur `previsions`:
   - calcule automatiquement `NEW.shard` a l'insert.

Notes implementation:
- Dans le test infra, le routage est ensuite applique physiquement:
  - `nord` -> ecriture sur `postgres1`
  - `sud` -> ecriture sur `postgres3`
- Le script insere des stations de villes differentes et verifie la presence/absence sur chaque serveur.

## 4.2) Preuve de sharding

Execution:

```bash
cd infra
bash scripts/test_sharding.sh
```

Ce que le script prouve:
- Les regions GeoJSON sont chargees et interrogeables avec PostGIS.
- Le shard est calcule geospatialement (pas via if/else manuel sur les villes).
- Les lignes sont physiquement separees:
  - `postgres1` contient uniquement les enregistrements routes vers north
  - `postgres3` contient uniquement les enregistrements routes vers south
- Verifications negatives:
  - Paris non present sur `postgres3`
  - Marseille non presente sur `postgres1`

Commandes SQL de verification manuelle:

```bash
# Sur postgres1 (north)
docker exec -i postgres1 psql -U postgres -d meteo_db -c \
"SELECT station_id, region_code, lat, lon FROM stations ORDER BY station_id;"

# Sur postgres3 (south)
docker exec -i postgres3 psql -U postgres -d meteo_db -c \
"SELECT station_id, region_code, lat, lon FROM stations ORDER BY station_id;"

# Verifier le calcul geospatial d'un point
docker exec -i postgres1 psql -U postgres -d meteo_db -c \
"SELECT get_shard_from_coords(48.856614, 2.3522219) AS shard_paris;"
```

Resultat attendu:
- `shard_paris = nord`
- repartition non vide sur les deux serveurs
- total de lignes = somme des lignes sur `postgres1` + `postgres3`

## 5) Validation par critere (bareme)

## Dockerisation & Orchestration (/3)

Preuves:

```bash
cd infra
docker compose --env-file .env config
docker compose --env-file .env ps
```

Ce qui est attendu:
- Dockerfiles multi-stage (backend/frontend/data)
- Stack complete orchestree par Compose
- Services restart policy et healthcheck DB

## Haute Disponibilite DB (/4)

Tests:

```bash
cd infra
bash scripts/test_failover.sh
bash scripts/test_volumes.sh
```

Ce qui est attendu:
- Cluster DB en mode leader/replica
- Bascule/failover fonctionnelle
- Persistance volume apres restart

## Isolation & Segmentation Reseau (/4)

Tests:

```bash
cd infra
bash scripts/test_network.sh
```

Verification manuelle:

```bash
# Depuis l'hote: DB non exposee
nc -zv localhost 5432 || true

# Services publics OK
curl -I http://localhost
curl -I http://localhost/api/previsions
```

Ce qui est attendu:
- Separation front/data via deux reseaux Docker
- DB non routable directement depuis l'exterieur

## Monitoring & Observabilite (/2)

Checks:

```bash
curl -I http://localhost:9090   # Prometheus
curl -I http://localhost:3000   # Grafana
curl -I http://localhost:8081   # cAdvisor
```

Ce qui est attendu:
- Stack monitoring active (Prometheus/Grafana/cAdvisor)
- Metriques conteneurs disponibles

## Gestion des Secrets (/2)

Bonnes pratiques:
- Variables sensibles dans `.env` / `.env.example`
- Pas de mot de passe en dur dans les Dockerfiles
- Ne pas versionner de secrets reels

Verification rapide:

```bash
# Detecter patterns de secrets commits en clair
cd ..
git grep -nE "password|passwd|secret|token" -- . ':!*.md' || true
```

## 6) Commandes de demo rapide (jury)

```bash
# 1) stack up
cd infra
docker compose --env-file .env up -d --build

# 2) etat
docker compose --env-file .env ps

# 3) URL publiques
curl -I http://localhost
curl -I http://localhost/api/previsions
curl -I http://localhost:3000
curl -I http://localhost:9090
curl -I http://localhost:8081

# 4) tests infra
bash scripts/test_failover.sh
bash scripts/test_network.sh
bash scripts/test_volumes.sh
bash scripts/test_sharding.sh
```

## 7) Troubleshooting court

- `ENOTFOUND postgres1`:
  - Lancer les scripts DB dans le conteneur backend (`docker compose exec backend ...`).
- `cannot execute ALTER TABLE in a read-only transaction`:
  - Cible un replica, changer `DB_HOST` vers le leader writable.
- API inaccessible en direct:
  - Verifier mapping backend `8888:8080` dans [infra/docker-compose.yml](infra/docker-compose.yml).
- API via Nginx:
  - upstream backend sur `backend:8080` dans [infra/nginx/nginx.conf](infra/nginx/nginx.conf).
