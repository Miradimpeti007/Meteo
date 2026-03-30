#!/bin/bash

# Show initial cluster state
echo "Initial cluster state (Master/Slave)"
docker exec postgres1 patronictl -c /run/postgres.yml list

# Stop the current Master
echo "Stopping Master..."
docker stop postgres1

# Wait for new Master election
echo "Waiting for new Master election (30s)..."
sleep 30

# Verify new Master elected
echo "New Master elected"
docker exec postgres2 patronictl -c /run/postgres.yml list

# Restart old Master as Slave
echo "Restarting old Master as Slave..."
docker start postgres1
sleep 15

# Show final cluster state
echo "Final cluster state"
docker exec postgres2 patronictl -c /run/postgres.yml list
