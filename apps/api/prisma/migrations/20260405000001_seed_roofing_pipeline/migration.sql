-- Seed Roofing Pipeline record (separate transaction so enum value is committed)
INSERT INTO "pipelines" ("id", "name", "type", "created_at")
VALUES ('00000000-0000-0000-0000-000000000005', 'Roofing Pipeline', 'ROOFING', NOW())
ON CONFLICT DO NOTHING;
