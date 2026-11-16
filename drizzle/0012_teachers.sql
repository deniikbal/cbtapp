CREATE TABLE IF NOT EXISTS "teachers" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "nip" text NOT NULL,
  "nuptk" text DEFAULT '' NOT NULL,
  "gender" text DEFAULT '' NOT NULL,
  "birthPlace" text DEFAULT '' NOT NULL,
  "birthDate" text DEFAULT '' NOT NULL,
  "passwordHash" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "teachers_nip_idx" ON "teachers" USING btree ("nip");
