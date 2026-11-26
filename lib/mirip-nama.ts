/** Kata nama yang layak dibandingkan: buang token pendek dan tanda baca. */
export function kataKunci(nama: string) {
  return [
    ...new Set(
      nama
        .toUpperCase()
        .replace(/[^A-Z ]/g, " ")
        .split(/\s+/)
        .filter((k) => k.length >= 3)
    ),
  ]
}

/**
 * Nama, NISN, dan kelas yang diketik di form sering salah, jadi kemiripan dihitung
 * dari kata nama (bobot besar) dan NISN (bobot kecil) — bukan dicocokkan persis.
 */
export function skorMirip(diketik: { nama: string; nis: string }, siswa: { name: string; nis: string }) {
  const kataDiketik = kataKunci(diketik.nama)
  const kataSiswa = kataKunci(siswa.name)
  const sama = kataDiketik.filter((k) => kataSiswa.some((lain) => lain.includes(k) || k.includes(lain))).length
  const skorNama = kataDiketik.length ? sama / kataDiketik.length : 0

  const digitDiketik = (diketik.nis ?? "").replace(/\D/g, "")
  const digitSiswa = siswa.nis.replace(/\D/g, "")
  let skorNis = 0
  if (digitDiketik.length >= 4 && digitSiswa) {
    if (digitDiketik === digitSiswa) skorNis = 1
    else if (digitSiswa.includes(digitDiketik) || digitDiketik.includes(digitSiswa)) skorNis = 0.5
    else {
      const set = new Set(digitSiswa)
      skorNis = ([...new Set(digitDiketik)].filter((c) => set.has(c)).length / digitDiketik.length) * 0.4
    }
  }

  return skorNama * 0.75 + skorNis * 0.25
}
