-- Satu kelas boleh punya sesi 1 dan sesi 2 dengan bank, tanggal, dan jam yang sama.
-- Kunci unik sebelumnya tidak memuat `session`, sehingga menyamakan jam sesi 1
-- dengan jam sesi 2 milik kelas yang sama gagal dengan duplicate key.
DROP INDEX IF EXISTS "exam_schedules_unique_slot_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "exam_schedules_unique_slot_idx" ON "exam_schedules" USING btree ("questionBankId","classroomId","examDate","startTime","session");
