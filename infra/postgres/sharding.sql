-- Add region_code column to previsions if not exists
ALTER TABLE previsions ADD COLUMN IF NOT EXISTS region_code VARCHAR(10);

-- Function to derive region from coordinates
CREATE OR REPLACE FUNCTION get_region_code(lat FLOAT, lon FLOAT)
RETURNS VARCHAR(10) AS $$
BEGIN
  -- Île-de-France (Paris area)
  IF lat BETWEEN 48.1 AND 49.2 AND lon BETWEEN 1.4 AND 3.6 THEN
    RETURN 'IDF';
  -- AURA (Lyon area)
  ELSIF lat BETWEEN 44.1 AND 46.8 AND lon BETWEEN 2.1 AND 7.2 THEN
    RETURN 'AURA';
  -- PACA (Marseille, Nice area)
  ELSIF lat BETWEEN 43.0 AND 44.5 AND lon BETWEEN 4.2 AND 7.7 THEN
    RETURN 'PACA';
  -- OCCI (Toulouse area)
  ELSIF lat BETWEEN 42.3 AND 44.9 AND lon BETWEEN 0.0 AND 4.0 THEN
    RETURN 'OCCI';
  ELSE
    RETURN 'OTHER';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update existing rows
UPDATE previsions SET region_code = get_region_code(latitude, longitude)
WHERE region_code IS NULL;

-- Create trigger to auto-assign region on insert
CREATE OR REPLACE FUNCTION assign_region()
RETURNS TRIGGER AS $$
BEGIN
  NEW.region_code := get_region_code(NEW.latitude, NEW.longitude);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_region ON previsions;
CREATE TRIGGER trg_assign_region
  BEFORE INSERT OR UPDATE ON previsions
  FOR EACH ROW EXECUTE FUNCTION assign_region();

-- Verify
SELECT name, latitude, longitude, region_code FROM previsions;
