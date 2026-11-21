# DESIGN.md — CBT SMANSABA (asas.sman1bantarujeg.sch.id)

Design Read: aplikasi ujian sekolah untuk guru dan panitia, bahasa visual institusional tegas, dial ENERGY 2 / RHYTHM 1 / MOTION 1.

## Identitas
Tenang, rapi, dan berwarna. Warna dipakai untuk menandai jenis data (bank soal, jadwal, hasil), bukan hiasan. Tidak ada gradien, glow, orb, atau pola latar.

## Palet
- `--primary` lime oklch(0.768 0.233 130.85) dipilih pemilik aplikasi sebagai warna aksi dan fokus. Alasan: identitas sekolah yang segar dan mudah dikenali di semua halaman, termasuk login.
- `--color-brand` hijau oklch(0.453 0.124 130.933) tetap dipakai untuk header dan blok identitas sekolah, dibedakan dari lime aksi.
- `--color-token-jadwal` biru oklch(0.4244 0.1202 254.6), hanya untuk metrik jadwal ujian.
- `--color-token-respons` amber oklch(0.4551 0.0985 62.3), hanya untuk metrik respons masuk.
- Netral: background, card, muted dari tema shadcn yang sudah ada.
- Merah hanya untuk aksi destruktif, amber/rose hanya untuk peringatan. Maknanya fungsional, bukan dekorasi.

Batas: maksimal 3 warna inti + netral. Warna tidak boleh mengulang label teks.

## Tipografi
Outfit (bawaan tema), 11-14px untuk data padat, 16px untuk judul halaman. Tanpa uppercase ber-tracking lebar.

## Radius dan jarak
Dua tingkat radius, masing-masing punya alasan: `rounded-lg` untuk panel, wrapper tabel, kartu data, dan seksi dialog karena membungkus sekelompok informasi; `rounded-sm` untuk tombol, input, badge, dan kartu data padat karena berisi kontrol atau satu baris fakta. Jarak antar blok `gap-1.5` sampai `gap-3`, padding kartu data `p-4`.

## Ikon
Lucide yang relevan domain (BookOpen, CalendarDays, ClipboardList, ExternalLink, LogOut), selalu `aria-hidden`. Dilarang Sparkles, Star, Rocket, Magic, Lightning, Diamond, Orb, Robot.

## CTA
Verba spesifik berbahasa Indonesia: "Simpan identitas", "Edit form", "Analisis butir", "Keluar". Dilarang "Get Started", "Learn More".

## Dilarang
Gradien (termasuk bg-gradient-*), glassmorphism, glow, pola grid, em dash di teks produk, badge kapsul hiasan, ikon dekoratif tanpa makna, lebih dari 3 warna brand.
