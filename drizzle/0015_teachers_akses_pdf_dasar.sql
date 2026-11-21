ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "aksesPdfDasar" integer DEFAULT 0 NOT NULL;

-- Backfill pengajuan "menunggu" lama (nominal dasar 5000) agar tetap bisa dicocokkan.
UPDATE "teachers"
SET "aksesPdfDasar" = 5000
WHERE "aksesPdf" = 'menunggu' AND "aksesPdfKode" > 0 AND "aksesPdfDasar" = 0;
