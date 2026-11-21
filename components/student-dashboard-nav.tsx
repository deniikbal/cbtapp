"use client"

import Link from "next/link"
import { ClipboardCheck, House } from "lucide-react"

import { cn } from "@/lib/utils"

type MenuSiswa = "beranda" | "hasil"

const MENU: { id: MenuSiswa; label: string; href: string; icon: typeof House }[] = [
  { id: "beranda", label: "Beranda", href: "/siswa/dashboard", icon: House },
  { id: "hasil", label: "Hasil ujian", href: "/siswa/dashboard?tab=hasil", icon: ClipboardCheck },
]

export function StudentDashboardNav({ active }: { active: MenuSiswa }) {
  return (
    <>
      {/* Menu utama di desktop: dua tab di bawah header, bukan sidebar penuh. */}
      <nav aria-label="Menu siswa" className="hidden border-b bg-card md:block">
        <div className="mx-auto flex w-full max-w-3xl gap-1 px-6">
          {MENU.map(({ id, label, href, icon: Icon }) => {
            const aktif = active === id
            return (
              <Link
                key={id}
                href={href}
                aria-current={aktif ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-2 border-b-2 px-4 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
                  aktif
                    ? "border-primary font-medium text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Navigasi bawah di ponsel: dua tujuan utama, masih bisa dijangkau ibu jari. */}
      <nav
        aria-label="Menu siswa"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-2 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {MENU.map(({ id, label, href, icon: Icon }) => {
          const aktif = active === id
          return (
            <Link
              key={id}
              href={href}
              aria-current={aktif ? "page" : undefined}
              className={cn(
                "relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs focus-visible:ring-2 focus-visible:ring-ring/40",
                aktif ? "font-medium text-primary" : "text-muted-foreground"
              )}
            >
              {aktif && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-primary" aria-hidden="true" />}
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
