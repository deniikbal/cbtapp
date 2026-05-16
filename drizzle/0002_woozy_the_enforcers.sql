CREATE TABLE "question_banks" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"googleFormUrl" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"subjectId" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "question_banks" ADD CONSTRAINT "question_banks_subjectId_subjects_id_fk" FOREIGN KEY ("subjectId") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "question_banks_code_idx" ON "question_banks" USING btree ("code");--> statement-breakpoint
CREATE INDEX "question_banks_subjectId_idx" ON "question_banks" USING btree ("subjectId");