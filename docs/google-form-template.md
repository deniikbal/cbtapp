# Template Google Form ASAS

Aplikasi membuat form ujian dengan **menyalin** template, bukan memanggil `forms.create` langsung. Tujuannya supaya setelan yang tidak tersedia di Forms API ikut terbawa.

## Template

- ID: `1afaL69J7-CEvYGAiB4Rn7GRdqPqx2pw6f2yHY100N1A`
- Link edit: https://docs.google.com/forms/d/1afaL69J7-CEvYGAiB4Rn7GRdqPqx2pw6f2yHY100N1A/edit
- Variabel lingkungan: `GOOGLE_FORM_TEMPLATE_ID` di `.env`

Setelan yang diatur manual sekali di template (tidak bisa lewat API v1):
- Settings → Quizzes → Release grades: **Later, after manual review**
- Settings → Respondent settings: matikan *missed questions*, *correct answers*, dan *point values*

## Alur

1. `buatFormKosong()` menyalin template lewat Drive API `files.copy` dengan nama judul form.
2. Form salinan dibersihkan butirnya, lalu diisi ulang: judul, deskripsi, NIS, Nama Lengkap, Kelas (dropdown sesuai angkatan), dan page break "SOAL PILIHAN GANDA".
3. Mode kuis tetap diaktifkan lewat `updateSettings`.
4. Template tidak boleh dihapus atau diisi soal. Jika `GOOGLE_FORM_TEMPLATE_ID` kosong, aplikasi menolak membuat form dengan pesan jelas.

Catatan: scope Drive saat ini `drive.file` sudah cukup selama template dibuat oleh OAuth client yang sama. Jika template dibuat akun/client lain, copy akan 404 dan token perlu di-re-auth dengan scope `drive` penuh.
