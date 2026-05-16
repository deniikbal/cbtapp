import { boolean, date, index, integer, pgTable, text, time, timestamp, uniqueIndex } from "drizzle-orm/pg-core"

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
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
    googleFormUrl: text("googleFormUrl").notNull(),
    active: boolean("active").notNull().default(true),
    subjectId: text("subjectId")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("question_banks_code_idx").on(table.code),
    index("question_banks_subjectId_idx").on(table.subjectId),
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
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("exam_schedules_questionBankId_idx").on(table.questionBankId),
    index("exam_schedules_classroomId_idx").on(table.classroomId),
  ],
)

export const examBrowserSettings = pgTable("exam_browser_settings", {
  id: text("id").primaryKey(),
  forceExamBrowser: boolean("forceExamBrowser").notNull().default(false),
  allowedUserAgentPattern: text("allowedUserAgentPattern").notNull().default(""),
  blockedMessage: text("blockedMessage")
    .notNull()
    .default("Akses ujian hanya bisa dibuka melalui aplikasi ExamBro Android."),
  downloadUrl: text("downloadUrl").notNull().default(""),
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
    active: boolean("active").notNull().default(true),
    classroomId: text("classroomId")
      .notNull()
      .references(() => classrooms.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("students_nis_idx").on(table.nis),
    index("students_classroomId_idx").on(table.classroomId),
  ],
)
