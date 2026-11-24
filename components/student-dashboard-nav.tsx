"use client"

import Link from "next/link"
import { ClipboardCheck, House } from "lucide-react"

import { StudentLogoutButton } from "@/components/student-logout-button"

type MenuSiswa = "beranda" | "hasil"

const MENU: { id: MenuSiswa; label: string; href: string; icon: typeof House }[] = [
  { id: "beranda", label: "Jadwal", href: "/siswa/dashboard", icon: House },
  { id: "hasil", label: "Hasil ujian", href: "/siswa/dashboard?tab=hasil", icon: ClipboardCheck },
]

/** Navigasi siswa gaya M3: tab di layar lebar, bottom nav di ponsel. */
export function StudentDashboardNav({ active }: { active: MenuSiswa }) {
  return (
    <>
      <nav aria-label="Menu siswa" className="m3-nav hidden md:block">
        <div className="m3-nav-inner">
          {MENU.map(({ id, label, href, icon: Icon }) => (
            <Link key={id} href={href} aria-current={active === id ? "page" : undefined} className="m3-tab">
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <nav
        aria-label="Menu siswa"
        className="m3-navbawah"
        style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom))" }}
      >
        {MENU.map(({ id, label, href, icon: Icon }) => (
          <Link key={id} href={href} aria-current={active === id ? "page" : undefined}>
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </Link>
        ))}
        <div className="flex-1 py-1">
          <StudentLogoutButton />
        </div>
      </nav>
    </>
  )
}
