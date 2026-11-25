// Cek penjaga isiSoalSama: hanya tata letak yang boleh berubah.
// Jalankan: node node_modules/.bin/tsx uji-rapikan-guard.ts  (offline, tanpa AI)
import { isiSoalSama } from "@/lib/rapikan-soal"

const gunung = `1) Gunung tertinggi di Jawa
a) Slamet
b) Semeru
c) Merapi
d) Ciremai
e) Gede
Jawaban: B`

// [nama, masukan, keluaran AI, harus diterima?]
const kasus: [string, string, string, boolean][] = [
  ["urai opsi + Kunci", gunung, `1. Gunung tertinggi di Jawa\nSlamet\nSemeru\nMerapi\nCiremai\nGede\nKunci: B`, true],
  [
    "opsi menempel diurai",
    `1. Ibu kota Jawa Barat Jawaban: Bandung\na. Bandung b. Semarang`,
    `1. Ibu kota Jawa Barat\nBandung\nSemarang\nKunci: Bandung`,
    true,
  ],
  [
    "masukan tanpa nomor soal",
    `Sungai terpanjang di Jawa Barat Citarum Ciliwung Cikarang Cisadane Cimanuk`,
    `1. Sungai terpanjang di Jawa Barat\nCitarum\nCiliwung\nCikarang\nCisadane\nCimanuk\nKunci: Cikarang`,
    true,
  ],
  ["soal dikarang", gunung, `1. Gunung tertinggi di Pulau Jawa yang masih aktif\nSlamet\nSemeru\nMerapi\nCiremai\nGede\nKunci: B`, false],
  ["opsi dihapus", gunung, `1. Gunung tertinggi di Jawa\nSlamet\nSemeru\nMerapi\nCiremai\nKunci: B`, false],
  ["opsi diganti isinya", gunung, `1. Gunung tertinggi di Jawa\nSlamet\nSemeru\nMerbabu\nCiremai\nGede\nKunci: B`, false],
]

let gagal = 0
for (const [nama, masukan, keluaran, harap] of kasus) {
  const dapat = isiSoalSama(masukan, keluaran)
  if (dapat !== harap) gagal += 1
  console.log(`${dapat === harap ? "OK  " : "SALAH"} ${nama}: ${dapat ? "diterima" : "ditolak"}`)
}
console.log(gagal ? `${gagal} kasus salah` : "semua kasus sesuai")
process.exit(gagal ? 1 : 0)
