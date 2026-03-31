#!/bin/bash

# Test that Nginx cannot reach PostgreSQL (net_front isolation)
echo "Testing Nginx cannot reach PostgreSQL..."
docker exec reverse-proxy curl -s --connect-timeout 3 http://postgres1:5432 \
  && echo "FAIL - postgres reachable from net_front" \
  || echo "OK - postgres not routable from net_front"

# Test that Backend can reach PostgreSQL (net_data access)
echo "Testing Backend can reach PostgreSQL..."
docker exec backend curl -s --connect-timeout 3 http://postgres1:5432 \
  && echo "OK - backend reaches postgres via net_data" \
  || echo "INFO - curl unavailable but checking pg_isready instead"
docker exec backend sh -c "nc -zv postgres1 5432 2>&1" \
  && echo "OK - backend reaches postgres1:5432" \
  || echo "FAIL - backend cannot reach postgres1"

# List containers on net_front
echo "Containers on net_front:"
docker network inspect infra_net_front --format '{{range .Containers}}{{.Name}} {{end}}'

# List containers on net_data
echo "Containers on net_data:"
docker network inspect infra_net_data --format '{{range .Containers}}{{.Name}} {{end}}'

# Confirm postgres1 is NOT on net_front
echo "Confirming postgres1 is not on net_front..."
docker network inspect infra_net_front --format '{{range .Containers}}{{.Name}} {{end}}' | grep -q postgres1 \
  && echo "FAIL - postgres1 found on net_front" \
  || echo "OK - postgres1 not on net_front"

echo "Network isolation test complete"
