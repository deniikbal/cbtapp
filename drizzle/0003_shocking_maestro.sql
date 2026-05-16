CREATE TABLE "exam_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"questionBankId" text NOT NULL,
	"classroomId" text NOT NULL,
	"examDate" date NOT NULL,
	"startTime" time NOT NULL,
	"durationMinutes" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_questionBankId_question_banks_id_fk" FOREIGN KEY ("questionBankId") REFERENCES "public"."question_banks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_schedules" ADD CONSTRAINT "exam_schedules_classroomId_classrooms_id_fk" FOREIGN KEY ("classroomId") REFERENCES "public"."classrooms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exam_schedules_questionBankId_idx" ON "exam_schedules" USING btree ("questionBankId");--> statement-breakpoint
CREATE INDEX "exam_schedules_classroomId_idx" ON "exam_schedules" USING btree ("classroomId");