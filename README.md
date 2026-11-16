# Next.js template

This is a Next.js template with shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button";
```

## Sync hasil ujian dari Google Forms

Isi `.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` (scope `forms.body.readonly` + `forms.responses.readonly`).
Isi **Form ID** per bank soal di menu Bank Soal (ambil dari URL `/d/<ID>/edit`), lalu buka menu **Hasil Ujian** dan tekan ikon sync.
Respons dicocokkan ke siswa lewat field NIS, dinilai dari kunci jawaban form (mode kuis).
