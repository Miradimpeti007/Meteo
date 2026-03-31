#!/bin/bash

echo "Testing sharding by region..."

# Insert test data for different regions
docker exec postgres1 psql -U postgres -d meteo_db -c "
INSERT INTO previsions (name, indice, longitude, latitude, dateprevision, \"createdAt\", \"updatedAt\")
VALUES
  ('Paris',     5, 2.3522219,  48.856614,  NOW(), NOW(), NOW()),
  ('Marseille', 1, 5.36978,    43.296482,  NOW(), NOW(), NOW()),
  ('Lyon',      3, 4.835659,   45.764043,  NOW(), NOW(), NOW()),
  ('Toulouse',  5, 1.444209,   43.604652,  NOW(), NOW(), NOW()),
  ('Nice',      4, 7.2619532,  43.7101728, NOW(), NOW(), NOW());
"

echo "Data by region:"
docker exec postgres1 psql -U postgres -d meteo_db -c "SELECT name, latitude, longitude, region_code FROM previsions;"

echo "IDF partition:"
docker exec postgres1 psql -U postgres -d meteo_db -c "SELECT name, region_code FROM previsions WHERE region_code = 'IDF';"

echo "AURA partition:"
docker exec postgres1 psql -U postgres -d meteo_db -c "SELECT name, region_code FROM previsions WHERE region_code = 'AURA';"

echo "PACA partition:"
docker exec postgres1 psql -U postgres -d meteo_db -c "SELECT name, region_code FROM previsions WHERE region_code = 'PACA';"

echo "OCCI partition:"
docker exec postgres1 psql -U postgres -d meteo_db -c "SELECT name, region_code FROM previsions WHERE region_code = 'OCCI';"

echo "Sharding test complete"
