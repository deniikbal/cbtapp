import { ambilForm, ambilRespons, cariNis, hitungNilai, normNis, soalDariItems } from "@/lib/google-forms"

export type RingkasRespons = {
  terjawab: number
  total: number
  skor: number
  waktu: string
}

// Respons Google Form mahal (~2 detik) dan monitor dipoll tiap 3 detik, jadi:
// data disimpan 60 detik dan pengambilan dilakukan di latar belakang.
const TTL_MS = 60_000
const cache = new Map<string, { sampai: number; peta: Map<string, RingkasRespons> }>()
const sedangMuat = new Set<string>()

async function muat(formId: string) {
  const peta = new Map<string, RingkasRespons>()
  try {
    const [form, respons] = await Promise.all([ambilForm(formId), ambilRespons(formId)])
    const soal = soalDariItems(form.items)
    for (const r of respons) {
      const nis = normNis(cariNis(soal, r))
      if (!nis) continue
      const nilai = hitungNilai(soal, r)
      const terjawab = Object.values(r.answers ?? {}).filter((a) =>
        (a.textAnswers?.answers ?? []).some((x) => (x.value ?? "").trim().length > 0)
      ).length
      peta.set(nis, { terjawab, total: nilai.total, skor: nilai.skor, waktu: r.lastSubmittedTime ?? r.createTime ?? "" })
    }
  } catch {
    // Forms tidak terjangkau / kuota habis: monitor tetap jalan dari data lokal.
  }
  cache.set(formId, { sampai: Date.now() + TTL_MS, peta })
}

/**
 * Ringkasan respons per NIS — tidak pernah menunggu jaringan.
 * Panggilan pertama mengembalikan peta kosong sambil memuat di latar belakang.
 */
export function responsPerNis(formId: string): Map<string, RingkasRespons> {
  const simpan = cache.get(formId)
  if (simpan && simpan.sampai > Date.now()) return simpan.peta

  if (!sedangMuat.has(formId)) {
    sedangMuat.add(formId)
    void muat(formId).finally(() => sedangMuat.delete(formId))
  }
  return simpan?.peta ?? new Map()
}
