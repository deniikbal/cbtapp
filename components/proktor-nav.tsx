"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, LayoutDashboard } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const MENU = [
  { href: "/proktor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/proktor/dashboard/pengerjaan", label: "Progres", icon: Activity },
] as const

function aktif(pathname: string, href: string) {
  if (href === "/proktor/dashboard") return pathname === href
  return pathname.startsWith(href)
}

/** Menu proktor untuk desktop: tautan datar di navbar. */
export function ProktorNav() {
  const pathname = usePathname()

  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Menu proktor">
      {MENU.map((item) => {
        const aktifItem = aktif(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={aktifItem ? "page" : undefined}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition-colors",
              aktifItem
                ? "bg-brand-foreground/15 font-medium text-brand-foreground"
                : "text-brand-foreground/80 hover:bg-brand-foreground/10 hover:text-brand-foreground",
            )}
          >
            <item.icon className="size-3.5" aria-hidden="true" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

/** Menu proktor untuk layar kecil: bottom nav menempel di bawah. */
export function ProktorBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Menu proktor"
    >
      <div className="mx-auto flex max-w-md">
        {MENU.map((item) => {
          const aktifItem = aktif(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={aktifItem ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] transition-colors",
                aktifItem ? "font-medium text-brand" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="size-5" aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
