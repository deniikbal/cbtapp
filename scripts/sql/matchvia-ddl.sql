-- Penanda sumber pencocokan respons: nis | nama | manual | belum
alter table exam_results add column if not exists "matchVia" text not null default 'nis';
