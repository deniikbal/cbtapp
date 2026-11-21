# Catatan Desain — Redesign Dashboard Siswa

Tanggal: 2026-11-21
Skills: antislop, antislop-ui, antislop-layoutmobile, antislop-copywriting, antislop-human

## Design Read

Aplikasi ujian sekolah untuk siswa, bahasa visual institusional tegas dengan aksen lime, dial ENERGY 2 / RHYTHM 1 / MOTION 1. Dials mengikuti `DESIGN.md`, tidak diubah oleh redesign ini.

## Keputusan dan alasan (R-31)

- **Menu Beranda dan Hasil ujian** ditempatkan sebagai dua tab yang sama: bottom nav di ponsel, tab atas di desktop. Alasan: dua tujuan utama sesuai permintaan, tidak perlu sidebar; bottom nav menempatkan tujuan di jangkauan ibu jari, tab atas memanfaatkan ruang desktop.
- **Tautan memakai `/siswa/dashboard` dan `?tab=hasil`**, bukan anchor kosong. Alasan: R-24, tiap menu punya tujuan nyata dan state bisa di-bookmark.
- **Beranda tetap menampilkan ringkasan + jadwal**, hasil dipindah ke tab khusus dengan kartu ringkasan satu hasil di Beranda. Alasan: keputusan utama siswa di Beranda adalah "ujian mana yang bisa dikerjakan", bukan membaca seluruh rekap nilai.
- **Hasil ujian menampilkan empat angka ringkasan dan daftar nilai lengkap**. Alasan: angka berasal dari DB nyata, bukan metrik rekaan (R-17).
- **Warna**: brand hijau untuk identitas, lime untuk aksi dan nilai, amber untuk peringatan waktu, merah hanya untuk aksi selesai destruktif. Alasan: palet sudah ditetapkan pemilik dan ditulis di `DESIGN.md`.
- **Radius `rounded-lg` untuk panel/kartu**, `rounded-sm` untuk kontrol. Alasan: dua tingkat radius sudah didokumentasikan.
- **Teks Indonesia, kalimat pendek, tanpa buzzword dan em dash**. Alasan: R-02/R-16 dan kejelasan untuk siswa.
- **Tidak ada animasi masuk atau pulse**. Alasan: MOTION 1, transisi hover saja.

## Delivery Gate

- R-02/R-16: PASS, tidak ada em dash, tidak ada buzzword, CTA spesifik ("Lihat semua hasil", "Lihat jadwal ujian").
- R-24/R-26: PASS secara kode, kedua menu punya `href` nyata dan `aria-current`; empty state hasil punya tautan ke jadwal.
- R-03: PASS secara kode, target nav 64px di ponsel, `pb-24` mencegah konten tertutup bottom nav, state lebar 2/2/4 kolom dipertahankan.
- R-27: PASS, loading dan error state tersedia di `app/siswa`.
- R-25/R-32/R-39: PASS secara kode, kontras token sesuai sistem, focus ring ada, ikon `aria-hidden`, label menu terlihat.
- R-35: **[CONFIRM]** tampilan terautentikasi belum dirender di browser karena tidak ada kredensial siswa di vault. Perlu verifikasi visual dan klik dua menu dengan akun nyata.
- Build: PASS (`tsc --noEmit`, `npm run build`).
