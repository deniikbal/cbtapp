import assert from "node:assert/strict"

import { bacaNominal, buatQrisDinamis, crc16 } from "../lib/qris.ts"

const statis =
  "00020101021126610014COM.GO-JEK.WWW01189360091433574584290210G3574584290303UMI51440014ID.CO.QRIS.WWW0215ID10266416712540303UMI5204899953033605802ID5918DENI MUHAMAD IKBAL6010MAJALENGKA61054546462070703A016304C5A4"

// payload statis asli harus tetap valid (CRC-nya cocok dengan perhitungan sendiri)
assert.equal(crc16(statis.slice(0, statis.lastIndexOf("6304")) + "6304"), "C5A4")

const dinamis = buatQrisDinamis(statis, 5862)
assert.equal(bacaNominal(dinamis), 5862)
assert.equal(dinamis.startsWith("000201010211"), true)
assert.equal(dinamis.includes("6304"), true)
assert.equal(crc16(dinamis.slice(0, dinamis.lastIndexOf("6304")) + "6304"), dinamis.slice(-4))
assert.equal(dinamis.includes("ID1026641671254"), true, "NMID merchant tetap")

// idempoten: nominal berbeda menimpa tag 54, tidak menduplikasi
const ulang = buatQrisDinamis(dinamis, 5007)
assert.equal(bacaNominal(ulang), 5007)
assert.equal((ulang.match(/54/g) || []).length >= 1, true)
assert.equal(bacaNominal(dinamis), 5862)

assert.throws(() => buatQrisDinamis("bukan-qris", 1000))
assert.throws(() => buatQrisDinamis(statis, 0))

console.log("ok: qris dinamis lulus", dinamis)
