import { boolean, date, index, integer, jsonb, numeric, pgTable, text, time, timestamp, uniqueIndex } from "drizzle-orm/pg-core"
import type { AnyPgColumn } from "drizzle-orm/pg-core"

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  /** admin | superadmin — superadmin saja yang boleh kelola akun user */
  role: text("role").notNull().default("admin"),
  image: text("image"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
})

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
)

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
)

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
)

export const majors = pgTable(
  "majors",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("majors_code_idx").on(table.code)],
)

export const classrooms = pgTable(
  "classrooms",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    grade: text("grade").notNull(),
    majorId: text("majorId")
      .notNull()
      .references(() => majors.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("classrooms_majorId_idx").on(table.majorId),
    uniqueIndex("classrooms_name_idx").on(table.name),
  ],
)

export const subjects = pgTable(
  "subjects",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("subjects_code_idx").on(table.code)],
)

export const questionBanks = pgTable(
  "question_banks",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    title: text("title").notNull(),
    teacherName: text("teacherName").notNull().default(""),
    teacherId: text("teacherId").references((): AnyPgColumn => teachers.id, { onDelete: "set null" }),
    // Semua guru pengampu mapel ini (multi-select); teacherId tetap guru pertama untuk kompatibilitas.
    teacherIds: jsonb("teacherIds").$type<string[]>().notNull().default([]),
    grade: text("grade").notNull().default("X"),
    googleFormUrl: text("googleFormUrl").notNull(),
    formId: text("formId").notNull().default(""),
    formItems: jsonb("formItems"),
    // Kapan terakhir sync dari Google Form (null = belum pernah).
    syncedAt: timestamp("syncedAt", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    subjectId: text("subjectId")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("question_banks_code_idx").on(table.code),
    index("question_banks_subjectId_idx").on(table.subjectId),
    index("question_banks_teacherId_idx").on(table.teacherId),
  ],
)

export const examSchedules = pgTable(
  "exam_schedules",
  {
    id: text("id").primaryKey(),
    questionBankId: text("questionBankId")
      .notNull()
      .references(() => questionBanks.id, { onDelete: "restrict" }),
    classroomId: text("classroomId")
      .notNull()
      .references(() => classrooms.id, { onDelete: "restrict" }),
    examDate: date("examDate").notNull(),
    startTime: time("startTime").notNull(),
    durationMinutes: integer("durationMinutes").notNull(),
    active: boolean("active").notNull().default(true),
    // Sesi ujian: jadwal per (kelas + sesi). Siswa sesi N hanya melihat jadwal sesi N.
    session: integer("session").notNull().default(1),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("exam_schedules_questionBankId_idx").on(table.questionBankId),
    index("exam_schedules_classroomId_idx").on(table.classroomId),
    uniqueIndex("exam_schedules_unique_slot_idx").on(
      table.questionBankId,
      table.classroomId,
      table.examDate,
      table.startTime
    ),
  ],
)

export const examBrowserSettings = pgTable("exam_browser_settings", {
  id: text("id").primaryKey(),
  forceExamBrowser: boolean("forceExamBrowser").notNull().default(false),
  allowedUserAgentPattern: text("allowedUserAgentPattern").notNull().default(""),
  blockedMessage: text("blockedMessage")
    .notNull()
    .default("Akses assesmen hanya bisa dibuka melalui aplikasi ExamBro Android."),
  downloadUrl: text("downloadUrl").notNull().default(""),
  configCode: text("configCode").notNull().default(""),
  // Email (pisahkan koma/baris) yang diberi akses edit ke semua Google Form buatan sistem.
  formEditorEmails: text("formEditorEmails").notNull().default(""),
  // true = form dibuat dengan akses "siapa saja dengan link bisa edit".
  formPublicEdit: boolean("formPublicEdit").notNull().default(false),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
})

export const students = pgTable(
  "students",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    nis: text("nis").notNull(),
    passwordHash: text("passwordHash").notNull(),
    // Password asli khusus kartu ujian. Null = kartu belum dibuat ulang.
    kartuPassword: text("kartuPassword"),
    active: boolean("active").notNull().default(true),
    classroomId: text("classroomId")
      .notNull()
      .references(() => classrooms.id, { onDelete: "restrict" }),
    // Ruangan ujian (opsional): satu ruangan boleh berisi kelas campuran.
    roomId: text("roomId").references((): AnyPgColumn => examRooms.id, { onDelete: "set null" }),
    // Sesi ujian (1, 2, ...): siswa hanya melihat jadwal dengan sesi yang sama.
    session: integer("session").notNull().default(1),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("students_nis_idx").on(table.nis),
    index("students_classroomId_idx").on(table.classroomId),
    index("students_roomId_idx").on(table.roomId),
  ],
)

export const examRooms = pgTable(
  "exam_rooms",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("exam_rooms_name_idx").on(table.name)],
)

export const teachers = pgTable(
  "teachers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    nip: text("nip").notNull(),
    nuptk: text("nuptk").notNull().default(""),
    gender: text("gender").notNull().default(""),
    birthPlace: text("birthPlace").notNull().default(""),
    birthDate: text("birthDate").notNull().default(""),
    passwordHash: text("passwordHash").notNull(),
    active: boolean("active").notNull().default(true),
    /** Akses unduh PDF analisis butir (sekali bayar): belum | menunggu | aktif | ditolak */
    aksesPdf: text("aksesPdf").notNull().default("belum"),
    aksesPdfPada: timestamp("aksesPdfPada", { withTimezone: true }),
    aksesPdfCatatan: text("aksesPdfCatatan").notNull().default(""),
  /** Kode unik 1..999 → nominal tagihan = NOMINAL_PDF + kode, dipakai mencocokkan mutasi. */
  aksesPdfKode: integer("aksesPdfKode").notNull().default(0),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("teachers_nip_idx").on(table.nip)],
)

export const reportSettings = pgTable(
  "report_settings",
  {
    id: text("id").primaryKey(),
    teacherId: text("teacherId")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    namaTes: text("namaTes").notNull().default(""),
    tahunPelajaran: text("tahunPelajaran").notNull().default(""),
    semester: text("semester").notNull().default(""),
    kkm: integer("kkm").notNull().default(75),
    kepalaSekolah: text("kepalaSekolah").notNull().default(""),
    nipKepalaSekolah: text("nipKepalaSekolah").notNull().default(""),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("report_settings_teacher_idx").on(table.teacherId)],
)

export const examAttempts = pgTable(
  "exam_attempts",
  {
    id: text("id").primaryKey(),
    scheduleId: text("scheduleId")
      .notNull()
      .references(() => examSchedules.id, { onDelete: "cascade" }),
    studentId: text("studentId")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    startedAt: timestamp("startedAt", { withTimezone: true }),
    submittedAt: timestamp("submittedAt", { withTimezone: true }),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("exam_attempts_scheduleId_idx").on(table.scheduleId),
    index("exam_attempts_studentId_idx").on(table.studentId),
    uniqueIndex("exam_attempts_schedule_student_idx").on(table.scheduleId, table.studentId),
  ],
)

export const examResults = pgTable(
  "exam_results",
  {
    id: text("id").primaryKey(),
    scheduleId: text("scheduleId")
      .notNull()
      .references(() => examSchedules.id, { onDelete: "cascade" }),
    studentId: text("studentId").references(() => students.id, { onDelete: "set null" }),
    responseId: text("responseId").notNull().unique(),
    nis: text("nis").notNull().default(""),
    nama: text("nama").notNull().default(""),
    respondentEmail: text("respondentEmail").notNull().default(""),
    startedAt: timestamp("startedAt", { withTimezone: true }),
    submittedAt: timestamp("submittedAt", { withTimezone: true }),
    answers: jsonb("answers").notNull().default({}),
    total: integer("total").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    wrong: integer("wrong").notNull().default(0),
    score: numeric("score", { precision: 6, scale: 2 }).notNull().default("0"),
    matchVia: text("matchVia").notNull().default("nis"), // nis | nama | manual | belum
    syncedAt: timestamp("syncedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("exam_results_schedule_idx").on(table.scheduleId),
    index("exam_results_nis_idx").on(table.nis),
  ],
)
