CREATE TABLE IF NOT EXISTS "exam_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"scheduleId" text NOT NULL,
	"studentId" text NOT NULL,
	"startedAt" timestamp with time zone,
	"submittedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_scheduleId_exam_schedules_id_fk" FOREIGN KEY ("scheduleId") REFERENCES "exam_schedules"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_studentId_students_id_fk" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "exam_attempts_scheduleId_idx" ON "exam_attempts" ("scheduleId");
CREATE INDEX IF NOT EXISTS "exam_attempts_studentId_idx" ON "exam_attempts" ("studentId");
CREATE UNIQUE INDEX IF NOT EXISTS "exam_attempts_schedule_student_idx" ON "exam_attempts" ("scheduleId", "studentId");
