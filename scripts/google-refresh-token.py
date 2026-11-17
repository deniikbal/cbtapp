#!/usr/bin/env python3
"""Ambil refresh token Google dengan scope tulis (forms.body + drive.file).

Pakai:
  python3 scripts/google-refresh-token.py url
      Cetak link otorisasi. Buka di browser, setujui, lalu browser mendarat di
      http://localhost:53682/?code=... (halaman error — itu normal, yang penting
      URL di address bar).

  python3 scripts/google-refresh-token.py tukar "<URL penuh atau kode>"
      Tuker kode jadi refresh token, tampilkan, sekalian cek scope-nya.

  python3 scripts/google-refresh-token.py tukar "<...>" --write
      Sama, tapi langsung tulis ke .env (file lama dibackup .env.bak-<waktu>).

Syarat di Google Cloud Console → Credentials → OAuth client yang dipakai:
  - tipe "Desktop app": redirect localhost otomatis diizinkan, tidak perlu apa-apa.
  - tipe "Web application": tambahkan http://localhost:53682/ ke Authorized
    redirect URIs.
"""

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ENV = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
REDIRECT = "http://localhost:53682/"
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


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] not in {"url", "tukar"}:
        sys.exit(__doc__)

    if sys.argv[1] == "url":
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
