#!/bin/bash

echo "Setting up databases..."
docker exec -i postgres1 psql -U postgres -c "CREATE DATABASE meteo_db;" 2>/dev/null || true
docker exec -i postgres3 psql -U postgres -c "CREATE DATABASE meteo_db;" 2>/dev/null || true

echo "Enabling PostGIS on both clusters..."
docker exec -i postgres1 psql -U postgres -d meteo_db -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>/dev/null
docker exec -i postgres3 psql -U postgres -d meteo_db -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>/dev/null

echo "Creating tables on both clusters..."
docker exec -i postgres1 psql -U postgres -d meteo_db -c "
CREATE TABLE IF NOT EXISTS stations (
    id SERIAL PRIMARY KEY,
    station_id VARCHAR(20),
    region_code VARCHAR(100),
    indice FLOAT,
    lat FLOAT,
    lon FLOAT,
    recorded_at TIMESTAMP DEFAULT NOW()
);" 2>/dev/null

docker exec -i postgres3 psql -U postgres -d meteo_db -c "
CREATE TABLE IF NOT EXISTS stations (
    id SERIAL PRIMARY KEY,
    station_id VARCHAR(20),
    region_code VARCHAR(100),
    indice FLOAT,
    lat FLOAT,
    lon FLOAT,
    recorded_at TIMESTAMP DEFAULT NOW()
);" 2>/dev/null

echo "Loading regions GeoJSON on both clusters..."
docker cp ~/Meteo/infra/postgres/regions.geojson postgres1:/tmp/regions_geo.geojson
docker cp ~/Meteo/infra/postgres/regions.geojson postgres3:/tmp/regions_geo.geojson
docker cp ~/Meteo/infra/postgres/setup_postgis.py postgres1:/tmp/setup_postgis.py
docker cp ~/Meteo/infra/postgres/setup_postgis.py postgres3:/tmp/setup_postgis.py

docker exec -i postgres1 python3 /tmp/setup_postgis.py
docker exec -i postgres3 python3 /tmp/setup_postgis.py

echo "Cleaning previous test data..."
docker exec -i postgres1 psql -U postgres -d meteo_db -c "TRUNCATE stations;" 2>/dev/null
docker exec -i postgres3 psql -U postgres -d meteo_db -c "TRUNCATE stations;" 2>/dev/null

# SHARD ROUTER — uses PostGIS get_shard_from_coords
route_insert() {
  local station_id=$1
  local indice=$2
  local lat=$3
  local lon=$4

  SHARD=$(docker exec -i postgres1 psql -U postgres -d meteo_db -t -c \
    "SELECT get_shard_from_coords($lat, $lon);" | tr -d ' \n')

  REGION=$(docker exec -i postgres1 psql -U postgres -d meteo_db -t -c \
    "SELECT region_code FROM regions WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint($lon, $lat), 4326)) LIMIT 1;" | tr -d ' \n')

  if [ "$SHARD" = "nord" ]; then
    TARGET="postgres1"
  else
    TARGET="postgres3"
  fi

  echo "Routing $station_id (lat=$lat, lon=$lon) → region=$REGION → shard=$SHARD → $TARGET"

  docker exec -i $TARGET psql -U postgres -d meteo_db -c \
    "INSERT INTO stations (station_id, region_code, indice, lat, lon) VALUES ('$station_id', '$REGION', $indice, $lat, $lon);"
}

echo "Auto-routing inserts using PostGIS geospatial sharding..."
route_insert "ST_PARIS"     75.5 48.856614 2.3522219
route_insert "ST_LYON"      62.3 45.764043 4.835659
route_insert "ST_MARSEILLE" 88.1 43.296482 5.36978
route_insert "ST_TOULOUSE"  45.7 43.604652 1.444209
route_insert "ST_NICE"      91.2 43.710173 7.261953
route_insert "ST_GRENOBLE"  55.0 45.188529 5.724524

echo "PHYSICAL PROOF 1 — postgres1 (Nord) sees ONLY:"
docker exec -i postgres1 psql -U postgres -d meteo_db -c \
  "SELECT station_id, region_code, indice, lat, lon FROM stations;"

echo "PHYSICAL PROOF 2 — postgres3 (Sud) sees ONLY:"
docker exec -i postgres3 psql -U postgres -d meteo_db -c \
  "SELECT station_id, region_code, indice, lat, lon FROM stations;"

echo "PHYSICAL PROOF 3 — Paris introuvable sur postgres3:"
RESULT=$(docker exec -i postgres3 psql -U postgres -d meteo_db -t -c \
  "SELECT COUNT(*) FROM stations WHERE station_id='ST_PARIS';" | tr -d ' \n')
[ "$RESULT" -eq 0 ] && echo "OK - ST_PARIS not on postgres3" || echo "FAIL"

echo "PHYSICAL PROOF 4 — Marseille introuvable sur postgres1:"
RESULT=$(docker exec -i postgres1 psql -U postgres -d meteo_db -t -c \
  "SELECT COUNT(*) FROM stations WHERE station_id='ST_MARSEILLE';" | tr -d ' \n')
[ "$RESULT" -eq 0 ] && echo "OK - ST_MARSEILLE not on postgres1" || echo "FAIL"

echo "PHYSICAL PROOF 5 — Row count per server:"
NORD=$(docker exec -i postgres1 psql -U postgres -d meteo_db -t -c \
  "SELECT COUNT(*) FROM stations;" | tr -d ' \n')
SUD=$(docker exec -i postgres3 psql -U postgres -d meteo_db -t -c \
  "SELECT COUNT(*) FROM stations;" | tr -d ' \n')
echo "postgres1 (Nord) : $NORD rows"
echo "postgres3 (Sud)  : $SUD rows"
echo "Total            : $((NORD + SUD)) rows across 2 physical servers"

echo "Sharding PostGIS geospatial test complete"
