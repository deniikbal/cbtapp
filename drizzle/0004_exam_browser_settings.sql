CREATE TABLE IF NOT EXISTS "exam_browser_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"forceExamBrowser" boolean DEFAULT false NOT NULL,
	"allowedUserAgentPattern" text DEFAULT '' NOT NULL,
	"blockedMessage" text DEFAULT 'Akses assesmen hanya bisa dibuka melalui aplikasi ExamBro Android.' NOT NULL,
	"downloadUrl" text DEFAULT '' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
