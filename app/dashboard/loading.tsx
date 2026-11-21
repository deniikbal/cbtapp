export default function Loading() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="size-9 animate-spin rounded-full border-2 border-primary/20 border-t-primary motion-reduce:animate-none" />
      <p className="text-sm text-muted-foreground">Memuat data dashboard...</p>
    </div>
  )
}
