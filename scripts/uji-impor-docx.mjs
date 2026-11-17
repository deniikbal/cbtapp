import assert from "node:assert/strict"
import { parseSoalTeks } from "../lib/impor-docx.ts"

const contoh = `Bacalah dengan teliti.
1. Hasil dari 12 x 2 adalah ...
a. 12   b. 18   c. 24   d. 30   e. 36
Kunci: C
2. Ibu kota Jawa Barat adalah
a. Bandung (kunci)
b. Bogor
c. Bekasi
d. Depok
e. Cimahi
3. Nilai x dari 2x = 8 adalah ...
a. 2
b. 3
c. 4
d. 5
e. 6
Kunci Jawaban: 1.C 2.A 3.C
`
const { soal, peringatan } = parseSoalTeks(contoh)
assert.equal(soal.length, 3, "harus 3 soal")
assert.equal(soal[0].no, 1)
assert.equal(soal[0].opsi.length, 5, "soal 1 lima opsi (satu baris)")
assert.equal(soal[0].opsi[2], "24")
assert.equal(soal[0].kunci, "c")
assert.equal(soal[0].pertanyaan, "Hasil dari 12 x 2 adalah ...", "kunci inline dibuang dari pertanyaan")
assert.equal(soal[1].opsi[0], "Bandung", "penanda (kunci) dibuang dari teks opsi")
assert.equal(soal[1].kunci, "a")
assert.equal(soal[2].kunci, "c", "kunci dari daftar kunci massal")
assert.deepEqual(peringatan.filter((p) => p.includes("belum ada")), [], "semua kunci terisi")
console.log("OK: 3 soal, opsi terpisah & sebaris, kunci inline & massal")
