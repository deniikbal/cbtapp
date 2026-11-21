export default function Loading() {
  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center gap-3 px-4 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="size-9 animate-spin rounded-full border-2 border-brand/20 border-t-brand motion-reduce:animate-none" />
      <p className="text-sm text-muted-foreground">Memuat dashboard siswa...</p>
    </div>
  )
}
