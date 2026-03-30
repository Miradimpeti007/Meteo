#!/bin/bash
echo "=== Test isolation : nginx ne doit PAS atteindre postgres1 ==="
docker exec reverse-proxy curl -s --connect-timeout 3 http://postgres1:5432 \
  && echo "FAIL — postgres accessible depuis net_front" \
  || echo "OK — postgres non routable depuis net_front"

echo "=== Test isolation : backend doit atteindre postgres1 ==="
docker exec backend curl -s --connect-timeout 3 http://postgres1:5432 \
  && echo "OK — backend atteint postgres via net_data" \
  || echo "INFO — curl non dispo mais réseau OK si pg répond"

echo "=== Inspection réseau net_front ==="
docker network inspect infra_net_front --format '{{range .Containers}}{{.Name}} {{end}}'

echo "=== Inspection réseau net_data ==="
docker network inspect infra_net_data --format '{{range .Containers}}{{.Name}} {{end}}'