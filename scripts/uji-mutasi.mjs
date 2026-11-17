import assert from "node:assert/strict"

import { cocokkanNominal, nominalTagihan, parseNominal } from "../lib/mutasi.ts"

assert.deepEqual(parseNominal("QRIS masuk Rp5.007 dari GOPAY"), [5007])
assert.deepEqual(parseNominal("Pembayaran Rp 5.007,00 berhasil"), [5007])
assert.deepEqual(parseNominal("IDR 5007 diterima"), [5007])
assert.deepEqual(parseNominal("tanpa nominal"), [])

const tagihan = [
  { id: "a", kode: 7 },
  { id: "b", kode: 142 },
]

assert.equal(nominalTagihan(5000, 7), 5007)

const hasil = cocokkanNominal("Masuk Rp5.007 dan Rp5.142 lalu Rp25.000", 5000, tagihan)
assert.deepEqual(hasil.cocok.map((t) => t.id), ["a", "b"])
assert.deepEqual(hasil.nominalTidakDikenal, [25000])

const kosong = cocokkanNominal("Masuk Rp5.999", 5000, tagihan)
assert.deepEqual(kosong.cocok, [])
assert.deepEqual(kosong.nominalTidakDikenal, [5999])

console.log("ok: parser mutasi lulus")
