#!/usr/bin/env python3
"""Ambil refresh token Google dengan scope tulis (forms.body + drive.file).

Cara TERCEPAT (tanpa copy-paste):
  python3 scripts/google-refresh-token.py auto
      Cetak link otorisasi → buka di browser → setujui → script menangkap
      redirect localhost sendiri, tukar token, dan LANGSUNG tulis ke .env
      (file lama dibackup .env.bak-<waktu>). Selesai.

Cara lama (kalau auto tidak bisa jalan):
  python3 scripts/google-refresh-token.py url
      Cetak link otorisasi. Buka di browser, setujui, lalu browser mendarat di
      http://localhost:53682/?code=... (halaman error — itu normal, yang penting
      URL di address bar).

  python3 scripts/google-refresh-token.py tukar "<URL penuh atau kode>" [--write]
      Tuker kode jadi refresh token; --write langsung tulis ke .env.

Syarat di Google Cloud Console → Credentials → OAuth client yang dipakai:
  - tipe "Desktop app": redirect localhost otomatis diizinkan, tidak perlu apa-apa.
  - tipe "Web application": tambahkan http://localhost:53682/ ke Authorized
    redirect URIs.
  - OAuth consent screen → Publishing status "In production" — kalau masih
    "Testing", refresh token mati tiap 7 hari dan langkah ini harus diulang.
"""

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ENV = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
REDIRECT = "http://localhost:53682"
SCOPES = [
    "https://www.googleapis.com/auth/forms.body",
    "https://www.googleapis.com/auth/forms.responses.readonly",
    "https://www.googleapis.com/auth/drive.file",
]


def env(key: str) -> str:
    if not os.path.exists(ENV):
        sys.exit(f".env tidak ditemukan di {ENV}")
    for line in open(ENV):
        if line.startswith(key + "="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit(f"{key} tidak ada di .env")


def link_otorisasi() -> str:
    q = urllib.parse.urlencode(
        {
            "client_id": env("GOOGLE_CLIENT_ID"),
            "redirect_uri": REDIRECT,
            "response_type": "code",
            "scope": " ".join(SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "include_granted_scopes": "true",
        }
    )
    return f"https://accounts.google.com/o/oauth2/v2/auth?{q}"


def ambil_kode(arg: str) -> str:
    arg = arg.strip()
    if arg.startswith("http"):
        kode = urllib.parse.parse_qs(urllib.parse.urlparse(arg).query).get("code", [""])[0]
        if not kode:
            sys.exit("URL itu tidak memuat ?code=... — salin URL lengkap setelah halaman error terbuka.")
        return kode
    return urllib.parse.unquote(arg)


def tukar(kode: str) -> dict:
    body = urllib.parse.urlencode(
        {
            "client_id": env("GOOGLE_CLIENT_ID"),
            "client_secret": env("GOOGLE_CLIENT_SECRET"),
            "code": kode,
            "grant_type": "authorization_code",
            "redirect_uri": REDIRECT,
        }
    ).encode()
    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=body)
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return json.load(res)
    except urllib.error.HTTPError as e:
        pesan = json.loads(e.read().decode() or "{}").get("error_description", e.reason)
        sys.exit(f"Google menolak penukaran kode: {pesan}\nKode berlaku ~10 menit dan sekali pakai — ulangi dari langkah 'url'.")


def scope_token(access: str) -> str:
    try:
        with urllib.request.urlopen(f"https://oauth2.googleapis.com/tokeninfo?access_token={access}", timeout=20) as res:
            return json.load(res).get("scope", "(tidak diketahui)")
    except Exception:
        return "(gagal cek scope)"


def tulis_env(refresh: str) -> None:
    backup = f"{ENV}.bak-{time.strftime('%Y%m%d-%H%M%S')}"
    isi = open(ENV).read()
    baris = [l for l in isi.splitlines() if not l.startswith("GOOGLE_REFRESH_TOKEN=")]
    baris.append(f"GOOGLE_REFRESH_TOKEN={refresh}")
    open(backup, "w").write(isi)
    open(ENV, "w").write("\n".join(baris) + "\n")
    print(f"\n.env diperbarui (backup: {backup})")
    print("Lalu: pm2 restart cbtapp --update-env")


def jalankan_auto() -> None:
    """Satu perintah: buka link → setuju → token langsung masuk .env. Tanpa copy-paste."""
    from http.server import BaseHTTPRequestHandler, HTTPServer

    hasil: dict[str, str] = {}

    class Penangkap(BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            if "code" in qs:
                hasil["kode"] = qs["code"][0]
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"<h2>Berhasil.</h2><p>Token tersimpan ke .env. Boleh tutup tab ini.</p>")
            else:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"<h2>Gagal.</h2><p>Google tidak mengirim ?code=. Coba lagi dari terminal.</p>")

        def log_message(self, *args) -> None:
            pass

    server = HTTPServer(("127.0.0.1", 53682), Penangkap)
    print("Buka link ini di browser (login akun Google pemilik form sekolah), lalu setujui:\n")
    print(link_otorisasi())
    print("\nMenunggu persetujuan... (Ctrl+C untuk batal)")
    server.handle_request()  # satu request saja: redirect dari Google

    if not hasil.get("kode"):
        sys.exit("Kode tidak diterima. Ulangi perintah ini.")

    data = tukar(hasil["kode"])
    refresh = data.get("refresh_token")
    if not refresh:
        sys.exit("Google tidak mengirim refresh_token. Cabut akses app di https://myaccount.google.com/permissions lalu jalankan lagi perintah ini.")

    print("\nScope yang didapat:\n" + scope_token(data.get("access_token", "")))
    tulis_env(refresh)


def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else None
    if mode not in {"url", "tukar", "auto"}:
        sys.exit(__doc__)

    if mode == "auto":
        jalankan_auto()
        return

    if mode == "url":
        print("Buka link ini di browser (login akun Google pemilik form sekolah):\n")
        print(link_otorisasi())
        print("\nSetelah disetujui, browser mendarat di http://localhost:53682/?code=... dan")
        print("mungkin muncul 'This site can't be reached'. Itu normal.")
        print("Salin SELURUH URL dari address bar, lalu jalankan:\n")
        print('  python3 scripts/google-refresh-token.py tukar "<URL tadi>"')
        return

    if len(sys.argv) < 3:
        sys.exit('Butuh argumen kode/URL. Contoh: python3 scripts/google-refresh-token.py tukar "http://localhost:53682/?code=4/0A..."')

    data = tukar(ambil_kode(sys.argv[2]))
    refresh = data.get("refresh_token")
    if not refresh:
        sys.exit("Google tidak mengirim refresh_token. Biasanya karena akun itu sudah pernah menyetujui scope yang sama — jalankan lagi langkah 'url' (prompt=consent sudah dipaksa) atau cabut akses di https://myaccount.google.com/permissions lalu ulangi.")

    print("Refresh token baru:\n")
    print(refresh)
    print("\nScope yang didapat:\n" + scope_token(data.get("access_token", "")))

    if "--write" in sys.argv:
        tulis_env(refresh)
    else:
        print("\nBelum ditulis ke .env. Ulangi perintah yang sama dengan --write untuk menyimpan otomatis.")


if __name__ == "__main__":
    main()
