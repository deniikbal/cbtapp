// Pesan error DB yang ramah dibaca; dipakai lintas server action.
export function getDatabaseErrorMessage(error: unknown, fallback = "Terjadi kesalahan database.") {
  const message = error instanceof Error ? error.message : String(error)

  if (
    message.includes("exam_schedules_unique_slot_idx") ||
    message.includes("duplicate key") ||
    message.includes("unique constraint")
  ) {
    return "Jadwal duplikat: bank soal, kelas, tanggal, dan jam mulai sudah ada."
  }

  return error instanceof Error && error.message ? error.message : fallback
}
