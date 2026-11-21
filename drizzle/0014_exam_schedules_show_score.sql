ALTER TABLE "exam_schedules"
  ADD COLUMN IF NOT EXISTS "showScore" boolean NOT NULL DEFAULT true;
