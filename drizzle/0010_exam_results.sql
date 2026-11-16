-- Hasil ujian dari Google Forms
alter table question_banks add column if not exists form_id text not null default '';
alter table question_banks add column if not exists form_items jsonb;

create table if not exists exam_results (
  id text primary key,
  "scheduleId" text not null references exam_schedules(id) on delete cascade,
  "studentId" text references students(id) on delete set null,
  "responseId" text not null unique,
  nis text not null default '',
  nama text not null default '',
  "respondentEmail" text not null default '',
  "startedAt" timestamptz,
  "submittedAt" timestamptz,
  answers jsonb not null default '{}'::jsonb,
  total integer not null default 0,
  correct integer not null default 0,
  wrong integer not null default 0,
  score numeric(6,2) not null default 0,
  "syncedAt" timestamptz not null default now()
);

create index if not exists exam_results_schedule_idx on exam_results ("scheduleId");
create index if not exists exam_results_nis_idx on exam_results (nis);
