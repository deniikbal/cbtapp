export { cn } from "cn"

export function relWaktu(iso: string | null | undefined): string {
  if (!iso) return "belum pernah"
  const selisih = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (selisih < 60) return "baru saja"
  if (selisih < 3600) return `${Math.floor(selisih / 60)} mnt lalu`
  if (selisih < 86400) return `${Math.floor(selisih / 3600)} jam lalu`
  return `${Math.floor(selisih / 86400)} hari lalu`
}
