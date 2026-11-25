// Cek penjaga isiSoalSama: hanya tata letak yang boleh berubah.
import { isiSoalSama } from "@/lib/rapikan-soal"

const asli = `1) Gunung tertinggi di Jawa
a) Slamet
b) Semeru
c) Merapi
d) Ciremai
e) Gede
Jawaban: B`

const kasus: [string, string, boolean][] = [
  ["urai opsi + Kunci", `1. Gunung tertinggi di Jawa\nSlamet\nSemeru\nMerapi\nCiremai\nGede\nKunci: B`, true],
  [
    "opsi menempel diurai",
    `1. Ibu kota Jawa Barat Jawaban: Bandung\na. Bandung b. Semarang`,
    true,
  ],
  ["soal dikarang", `1. Gunung tertinggi di Pulau Jawa yang masih aktif\nSlamet\nSemeru\nMerapi\nCiremai\nGede\nKunci: B`, false],
  ["opsi dihapus", `1. Gunung tertinggi di Jawa\nSlamet\nSemeru\nMerapi\nCiremai\nKunci: B`, false],
  ["opsi diganti isinya", `1. Gunung tertinggi di Jawa\nSlamet\nSemeru\nMerbabu\nCiremai\nGede\nKunci: B`, false],
]

let gagal = 0
for (const [nama, hasil, harap] of kasus) {
  // untuk kasus ke-2, masukan dan keluaran berbeda teks; uji keduanya terpisah
  const [masukan, keluaran] = nama === "opsi menempel diurai" ? [hasil, `1. Ibu kota Jawa Barat\nBandung\nSemarang\nKunci: Bandung`] : [asli, hasil]
  const dapat = isiSoalSama(masukan, keluaran)
  if (dapat !== harap) gagal += 1
  console.log(`${dapat === harap ? "OK  " : "SALAH"} ${nama}: ${dapat ? "diterima" : "ditolak"}`)
}
console.log(gagal ? `${gagal} kasus salah` : "semua kasus sesuai")
process.exit(gagal ? 1 : 0)
