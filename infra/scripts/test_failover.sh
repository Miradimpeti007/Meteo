#!/bin/bash
echo "=== État initial du cluster ==="
docker exec postgres1 patronictl -c /home/postgres/patroni.yml list

echo "=== Arrêt du primary ==="
docker stop postgres1

echo "=== Attente élection nouveau leader (30s) ==="
sleep 30

echo "=== Nouveau leader ==="
docker exec postgres2 patronictl -c /home/postgres/patroni.yml list

echo "=== Redémarrage postgres1 comme replica ==="
docker start postgres1
sleep 15

echo "=== État final ==="
docker exec postgres2 patronictl -c /home/postgres/patroni.yml list