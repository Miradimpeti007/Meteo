#!/bin/bash

echo "Setting up geospatial sharding on postgres1 (cluster-north)..."
docker cp ~/Meteo/infra/postgres/regions.geojson postgres1:/tmp/regions_geo.geojson
docker cp ~/Meteo/infra/postgres/setup_postgis.py postgres1:/tmp/setup_postgis.py
docker exec -it postgres1 python3 /tmp/setup_postgis.py

echo "Setting up geospatial sharding on postgres3 (cluster-south)..."
docker cp ~/Meteo/infra/postgres/regions.geojson postgres3:/tmp/regions_geo.geojson
docker cp ~/Meteo/infra/postgres/setup_postgis.py postgres3:/tmp/setup_postgis.py
docker exec -it postgres3 python3 /tmp/setup_postgis.py

echo "Geospatial sharding setup complete"
