#!/bin/bash

# Find the Master container
echo "Finding Master node..."
if docker exec postgres1 patronictl -c /run/postgres.yml list 2>/dev/null | grep -q "postgres1.*Leader"; then
  MASTER_CTR=postgres1
else
  MASTER_CTR=postgres2
fi
echo "Master container: $MASTER_CTR"

# Insert test data into Master
echo "Inserting test data into Master..."
docker exec $MASTER_CTR psql -U postgres -d meteo_db -c "CREATE TABLE IF NOT EXISTS volume_test (id SERIAL PRIMARY KEY, value TEXT, created_at TIMESTAMP DEFAULT NOW());"
docker exec $MASTER_CTR psql -U postgres -d meteo_db -c "INSERT INTO volume_test (value) VALUES ('persistence_check_$(date +%s)');"
docker exec $MASTER_CTR psql -U postgres -d meteo_db -c "SELECT * FROM volume_test;"

# Stop all containers
echo "Stopping all containers..."
cd ~/Meteo/infra && docker compose --env-file ../.env down

# Restart without -v to keep volumes
echo "Restarting containers..."
docker compose --env-file ../.env up -d postgres1 postgres2
sleep 30

# Check data persisted
echo "Checking data persisted after restart..."
docker exec $MASTER_CTR psql -U postgres -d meteo_db -c "SELECT * FROM volume_test;"

# Cleanup
echo "Cleaning up..."
docker exec $MASTER_CTR psql -U postgres -d meteo_db -c "DROP TABLE volume_test;"

echo "Volume persistence test complete"
