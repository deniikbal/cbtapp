CREATE UNIQUE INDEX IF NOT EXISTS "exam_schedules_unique_slot_idx"
ON "exam_schedules" ("questionBankId", "classroomId", "examDate", "startTime");
