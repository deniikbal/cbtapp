import assert from "node:assert/strict"
import { parseSoalTeks } from "../lib/impor-docx.ts"

// Format berhuruf
const berhuruf = `1. Hasil dari 12 x 2 adalah ...
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
const a = parseSoalTeks(berhuruf)
assert.equal(a.soal.length, 3)
assert.equal(a.soal[0].opsi.length, 5, "opsi sebaris")
assert.equal(a.soal[0].opsi[2], "24")
assert.equal(a.soal[0].kunci, "c")
assert.equal(a.soal[1].kunci, "a", "penanda (kunci)")
assert.equal(a.soal[2].kunci, "c", "kunci massal")

// Format tanpa huruf opsi (Google Form menomori sendiri)
const polos = `1. Hasil dari 12 x 2 adalah ...
12
18
24
30
36
Kunci: C
2. Ibu kota Provinsi Jawa Barat adalah
Bandung
Bogor   Bekasi   Depok
Kunci: 1
`
const b = parseSoalTeks(polos)
assert.equal(b.soal.length, 2)
assert.equal(b.soal[0].opsi.length, 5, "lima opsi tanpa huruf")
assert.deepEqual(b.soal[0].opsi, ["12", "18", "24", "30", "36"])
assert.equal(b.soal[0].kunci, "c")
assert.equal(b.soal[1].opsi.length, 4, "opsi sebaris tanpa huruf (2+ spasi)")
assert.equal(b.soal[1].kunci, "a", "kunci angka 1 = opsi pertama")
assert.deepEqual(b.peringatan, [], "format polos tanpa peringatan")
console.log("OK: berhuruf 3 soal, polos 2 soal tanpa peringatan")
