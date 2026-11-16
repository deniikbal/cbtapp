ALTER TABLE "question_banks" ADD COLUMN IF NOT EXISTS "teacherId" text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'question_banks_teacherId_fkey') THEN
    ALTER TABLE "question_banks"
      ADD CONSTRAINT "question_banks_teacherId_fkey"
      FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "question_banks_teacherId_idx" ON "question_banks" USING btree ("teacherId");

-- isi relasi untuk data lama berdasarkan nama guru yang sama
UPDATE "question_banks" qb
SET "teacherId" = t.id
FROM "teachers" t
WHERE qb."teacherId" IS NULL
  AND lower(trim(qb."teacherName")) = lower(trim(t.name));
