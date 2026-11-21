// Alat sekali pakai: membuat form template ASAS dan menguji salinan via Drive API.
// Jalankan: node --env-file=.env scripts/setup-form-template.mjs
const clientId = process.env.GOOGLE_CLIENT_ID
const clientSecret = process.env.GOOGLE_CLIENT_SECRET
const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

if (!clientId || !clientSecret || !refreshToken) {
  throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN belum diisi")
}

async function token() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) throw new Error(`Gagal token: ${data.error ?? res.status}`)
  return data.access_token
}

const access = await token()
const headers = { Authorization: `Bearer ${access}`, "Content-Type": "application/json" }

const judulTemplate = "TEMPLATE ASAS (JANGAN DIHAPUS)"
const created = await fetch("https://forms.googleapis.com/v1/forms", {
  method: "POST",
  headers,
  body: JSON.stringify({ info: { title: judulTemplate, documentTitle: judulTemplate } }),
})
const form = await created.json()
if (!created.ok || !form.formId) throw new Error(`Gagal buat template: ${form.error?.message ?? created.status}`)

const templateId = form.formId
console.log("TEMPLATE_ID:", templateId)
console.log("EDIT_URL:", `https://docs.google.com/forms/d/${templateId}/edit`)

// Uji apakah refresh token yang ada bisa menyalin file milik aplikasi ini.
const copied = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(templateId)}/copy`, {
  method: "POST",
  headers,
  body: JSON.stringify({ name: "UJI COPY TEMPLATE ASAS" }),
})
const copy = await copied.json()
if (!copied.ok) {
  console.log("COPY_TEST: GAGAL", copied.status, copy.error?.message ?? "")
  process.exit(0)
}
console.log("COPY_TEST: OK", copy.id)
const removed = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(copy.id)}`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${access}` },
})
console.log("COPY_CLEANUP:", removed.ok ? "OK" : removed.status)
