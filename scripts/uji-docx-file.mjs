import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { parseSoalDocx } from "../lib/impor-docx.ts"

const { soal, peringatan } = await parseSoalDocx(readFileSync(process.argv[2]))
assert.equal(soal.length, 4, "4 soal terbaca dari .docx nyata")
assert.equal(soal[0].opsi.length, 5)
assert.equal(soal[0].kunci, "c")
assert.equal(soal[1].kunci, "a")
assert.equal(soal[2].kunci, "", "soal 3 kunci kosong (tidak ada di dokumen)")
assert.ok(peringatan.some((p) => p.includes("Soal 3")), "peringatan kunci hilang")
assert.ok(peringatan.some((p) => p.includes("Soal 4")), "peringatan opsi kurang")
console.log("OK docx:", soal.map((s) => `${s.no}:${s.opsi.length}/${s.kunci || "-"}`).join(" "), "|", peringatan.length, "peringatan")
