import json
import psycopg2
import os
import time

def wait_for_postgres():
    for i in range(30):
        try:
            conn = psycopg2.connect(
                dbname=os.environ.get("POSTGRES_DB", "meteo_db"),
                user="postgres",
                host="/var/run/postgresql"
            )
            conn.close()
            return True
        except:
            print(f"Waiting for postgres... ({i+1}/30)")
            time.sleep(2)
    return False

def setup():
    if not wait_for_postgres():
        print("Postgres not available")
        exit(1)

    conn = psycopg2.connect(
        dbname=os.environ.get("POSTGRES_DB", "meteo_db"),
        user="postgres",
        host="/var/run/postgresql"
    )
    conn.autocommit = True
    cur = conn.cursor()

    # Enable PostGIS
    cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
    print("PostGIS enabled")

    # Create regions table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS regions (
        id SERIAL PRIMARY KEY,
        region_code VARCHAR(10),
        region_name VARCHAR(100),
        shard VARCHAR(10),
        geom GEOMETRY(GEOMETRY, 4326)
    );
    """)

    # Check if already loaded
    cur.execute("SELECT COUNT(*) FROM regions;")
    count = cur.fetchone()[0]
    if count > 0:
        print(f"Regions already loaded ({count} regions)")
    else:
        # Load regions from GeoJSON
        geojson_path = os.path.join(os.path.dirname(__file__), 'regions_geo.geojson')
        with open(geojson_path) as f:
            data = json.load(f)

        nord_regions = ['11', '84']

        for feature in data['features']:
            props = feature['properties']
            code = props.get('code', '')
            name = props.get('nom', '')
            shard = 'nord' if code in nord_regions else 'sud'
            geom = json.dumps(feature['geometry'])

            cur.execute("""
                INSERT INTO regions (region_code, region_name, shard, geom)
                VALUES (%s, %s, %s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))
                ON CONFLICT DO NOTHING;
            """, (code, name, shard, geom))
            print(f"Loaded {code} ({name}) → {shard}")

    # Create sharding function
    cur.execute("""
    CREATE OR REPLACE FUNCTION get_shard_from_coords(lat FLOAT, lon FLOAT)
    RETURNS VARCHAR AS $$
    DECLARE
      v_shard VARCHAR;
    BEGIN
      SELECT shard INTO v_shard
      FROM regions
      WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(lon, lat), 4326))
      LIMIT 1;
      RETURN COALESCE(v_shard, 'sud');
    END;
    $$ LANGUAGE plpgsql;
    """)
    print("Sharding function created")

    # Create trigger on previsions if exists
    cur.execute("""
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'previsions') THEN
        ALTER TABLE previsions ADD COLUMN IF NOT EXISTS shard VARCHAR(10);

        CREATE OR REPLACE FUNCTION route_to_shard()
        RETURNS TRIGGER AS $func$
        BEGIN
          NEW.shard := get_shard_from_coords(NEW.latitude, NEW.longitude);
          RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trg_route_shard ON previsions;
        CREATE TRIGGER trg_route_shard
          BEFORE INSERT ON previsions
          FOR EACH ROW EXECUTE FUNCTION route_to_shard();

        RAISE NOTICE 'Trigger created on previsions';
      ELSE
        RAISE NOTICE 'Table previsions does not exist yet - trigger will be applied later';
      END IF;
    END $$;
    """)

    cur.close()
    conn.close()
    print("Setup complete")

if __name__ == "__main__":
    setup()
