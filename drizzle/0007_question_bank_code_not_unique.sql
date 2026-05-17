DROP INDEX IF EXISTS "question_banks_code_idx";
CREATE INDEX IF NOT EXISTS "question_banks_code_idx" ON "question_banks" ("code");
