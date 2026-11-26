-- Status terbit Google Form per bank soal (null = belum pernah dicek).
ALTER TABLE "question_banks" ADD COLUMN IF NOT EXISTS "published" boolean;
