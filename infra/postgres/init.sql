-- Replication slot for replica
SELECT pg_create_physical_replication_slot('replication_slot') WHERE NOT EXISTS (
  SELECT 1 FROM pg_replication_slots WHERE slot_name = 'replication_slot'
);
