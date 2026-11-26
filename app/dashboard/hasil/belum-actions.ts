"use server"

import { ambilBelumMengerjakan, type BelumMengerjakan } from "@/lib/belum-mengerjakan"

/** Dipanggil modal saat dibuka; data tidak dihitung di render halaman supaya halaman tetap ringan. */
export async function ambilBelumMengerjakanAction(bankId: string): Promise<BelumMengerjakan> {
  return ambilBelumMengerjakan(bankId)
}
