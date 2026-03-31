#!/bin/bash
set -e

echo "Running PostGIS setup..."
python3 /docker-entrypoint-initdb.d/setup_postgis.py
echo "PostGIS setup complete"
