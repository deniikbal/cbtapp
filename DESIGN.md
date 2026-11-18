# DESIGN.md — CBT SMANSABA (asas.sman1bantarujeg.sch.id)

Design Read: aplikasi ujian sekolah untuk guru dan panitia, bahasa visual institusional tegas, dial ENERGY 2 / RHYTHM 1 / MOTION 1.

## Identitas
Tenang, rapi, dan berwarna. Warna dipakai untuk menandai jenis data (bank soal, jadwal, hasil), bukan hiasan. Tidak ada gradien, glow, orb, atau pola latar.

## Palet
- `--brand` oklch(0.3616 0.0689 166.5) hijau tua sekolah, header dan blok utama. Teks di atasnya putih.
- `--token-jadwal` oklch(0.4244 0.1202 254.6) biru, hanya untuk metrik jadwal ujian.
- `--token-respons` oklch(0.4551 0.0985 62.3) amber tua, hanya untuk metrik respons masuk.
- Netral: background, card, muted dari tema shadcn yang sudah ada.
- Status hasil: emerald (mencapai KKM) dan amber (di bawah KKM), hanya pada angka rata-rata.

Batas: maksimal 3 warna brand + netral. Warna tidak boleh mengulang label teks.

## Tipografi
Outfit (bawaan tema), 11-14px untuk data padat, 16px untuk judul halaman. Tanpa uppercase ber-tracking lebar.

## Radius dan jarak
Radius `rounded-sm` (4.8px) untuk kartu, input, tombol, badge. Jarak antar blok `gap-1.5` sampai `gap-2`, padding kartu `px-2.5 py-1.5`.

## Ikon
Lucide yang relevan domain (BookOpen, CalendarDays, ClipboardList, ExternalLink, LogOut), selalu `aria-hidden`. Dilarang Sparkles, Star, Rocket, Magic, Lightning, Diamond, Orb, Robot.

## CTA
Verba spesifik berbahasa Indonesia: "Simpan identitas", "Edit form", "Analisis butir", "Keluar". Dilarang "Get Started", "Learn More".

## Dilarang
Gradien (termasuk bg-gradient-*), glassmorphism, glow, pola grid, em dash di teks produk, badge kapsul hiasan, ikon dekoratif tanpa makna, lebih dari 3 warna brand.
