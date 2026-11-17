/**
 * QRIS statis (MPM) tidak membawa nominal. Dengan menyisipkan tag 54 pada payload
 * statis, QRIS menjadi dinamis: nominal terkunci sehingga guru tidak bisa salah bayar.
 * Catatan: pembuatan QR dinamis di sisi merchant tidak menambah webhook apa pun —
 * pencocokan pembayaran tetap lewat mutasi (lib/mutasi.ts).
 */
const TAG_NOMINAL = "54"
const TAG_CRC = "6304"

type TlV = { tag: string; value: string }

function bacaTlv(payload: string): TlV[] {
  const hasil: TlV[] = []
  let posisi = 0
  while (posisi + 4 <= payload.length) {
    const tag = payload.slice(posisi, posisi + 2)
    const panjang = Number(payload.slice(posisi + 2, posisi + 4))
    if (!Number.isFinite(panjang)) break
    const value = payload.slice(posisi + 4, posisi + 4 + panjang)
    if (value.length !== panjang) break
    hasil.push({ tag, value })
    posisi += 4 + panjang
  }
  return hasil
}

/** CRC16-CCITT (FALSE) sesuai spesifikasi QRIS/EMVCo. */
export function crc16(payload: string) {
  let crc = 0xffff
  for (let index = 0; index < payload.length; index++) {
    crc ^= payload.charCodeAt(index) << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0")
}

/**
 * Hasilkan payload QRIS dinamis dengan nominal tertentu dari payload statis.
 * Tag 54 disisipkan sebelum tag 58 (kode negara) bila belum ada, lalu CRC dihitung ulang.
 */
export function buatQrisDinamis(payloadStatis: string, nominal: number) {
  if (!Number.isInteger(nominal) || nominal <= 0) throw new Error("Nominal QRIS harus bilangan bulat positif.")

  const bersih = payloadStatis.trim()
  if (!bersih.startsWith("000201")) throw new Error("Payload QRIS tidak valid.")

  const tanpaCrc = bersih.includes(TAG_CRC) ? bersih.slice(0, bersih.lastIndexOf(TAG_CRC)) : bersih
  const items = bacaTlv(tanpaCrc).filter((item) => item.tag !== TAG_NOMINAL)
  if (items.length === 0) throw new Error("Payload QRIS tidak bisa dibaca.")

  const nilai = String(nominal)
  const nominalItem: TlV = { tag: TAG_NOMINAL, value: nilai }
  const sebelum = items.filter((item) => Number(item.tag) < Number(TAG_NOMINAL))
  const sesudah = items.filter((item) => Number(item.tag) > Number(TAG_NOMINAL))
  const urut = [...sebelum, nominalItem, ...sesudah]

  const rakit = urut.map((item) => `${item.tag}${String(item.value.length).padStart(2, "0")}${item.value}`).join("")
  const tanpaCrcBaru = `${rakit}${TAG_CRC}`
  return `${tanpaCrcBaru}${crc16(tanpaCrcBaru)}`
}

/** Ambil nominal (tag 54) dari payload QRIS, atau null bila statis. */
export function bacaNominal(payload: string) {
  const item = bacaTlv(payload).find((entry) => entry.tag === TAG_NOMINAL)
  if (!item) return null
  const nilai = Number(item.value)
  return Number.isFinite(nilai) ? nilai : null
}
