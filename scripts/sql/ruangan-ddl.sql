-- Ruangan ujian: satu ruangan bisa berisi siswa dari kelas campuran.
CREATE TABLE IF NOT EXISTS exam_rooms (
  id text PRIMARY KEY,
  name text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS exam_rooms_name_idx ON exam_rooms (name);

ALTER TABLE students ADD COLUMN IF NOT EXISTS "roomId" text REFERENCES exam_rooms(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS students_roomId_idx ON students ("roomId");
