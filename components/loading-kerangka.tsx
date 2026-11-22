import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Kerangka loading bersama: bentuknya meniru layout asli supaya tidak ada lompatan.

function SidebarKerangka() {
  return (
    <div className="hidden w-64 shrink-0 flex-col gap-3 border-r bg-sidebar p-4 md:flex">
      <Skeleton className="h-9 w-40" />
      <div className="mt-4 flex flex-col gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  )
}

function KepalaKerangka({ aksi = true }: { aksi?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>
      {aksi ? (
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
      ) : null}
    </div>
  )
}

function TabelKerangka({ baris = 8, kolom = 5 }: { baris?: number; kolom?: number }) {
  return (
    <div className="rounded-xl border">
      <div className="flex gap-4 border-b bg-muted/40 p-3">
        {Array.from({ length: kolom }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      <div className="flex flex-col">
        {Array.from({ length: baris }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 border-b p-3 last:border-0">
            {Array.from({ length: kolom }).map((_, c) => (
              <Skeleton key={c} className={cn("h-4 flex-1", c === 0 && "max-w-56")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function KartuKerangka({ jumlah = 4 }: { jumlah?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: jumlah }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border p-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  )
}

function FormKerangka() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-xl border p-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full max-w-md" />
          <Skeleton className="h-3 w-48" />
        </div>
      ))}
      <Skeleton className="h-10 w-36" />
    </div>
  )
}

export function LoadingDaftar({ baris = 8, kolom = 5 }: { baris?: number; kolom?: number }) {
  return (
    <div
      className="flex min-h-svh bg-background"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Memuat halaman…</span>
      <SidebarKerangka />
      <div className="flex-1 p-4 md:p-6">
        <div className="flex flex-col gap-4">
          <KepalaKerangka />
          <TabelKerangka baris={baris} kolom={kolom} />
        </div>
      </div>
    </div>
  )
}

export function LoadingKartu({ denganSidebar = true }: { denganSidebar?: boolean }) {
  return (
    <div
      className={cn("flex min-h-svh bg-background", !denganSidebar && "flex-col")}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Memuat halaman…</span>
      {denganSidebar ? <SidebarKerangka /> : null}
      <div className="flex-1 p-4 md:p-6">
        <div className="flex flex-col gap-4">
          <KepalaKerangka />
          <KartuKerangka />
          <TabelKerangka baris={5} kolom={4} />
        </div>
      </div>
    </div>
  )
}

export function LoadingForm() {
  return (
    <div
      className="flex min-h-svh bg-background"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Memuat halaman…</span>
      <SidebarKerangka />
      <div className="flex-1 p-4 md:p-6">
        <div className="flex flex-col gap-4">
          <KepalaKerangka aksi={false} />
          <FormKerangka />
        </div>
      </div>
    </div>
  )
}

export function LoadingUjian() {
  return (
    <div
      className="flex min-h-svh flex-col gap-4 bg-background p-4 md:p-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Memuat soal…</span>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="h-2 w-full" />
      <div className="flex flex-col gap-4 rounded-xl border p-4">
        <Skeleton className="h-5 w-3/4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}
