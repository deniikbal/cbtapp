import { BarChart3, BookOpen, BookOpenCheck, Building2, CalendarDays, ChevronRight, Database, FileText, GraduationCap, Home, LayoutDashboard, Lock, Settings, UserCog, UserRound, Users } from "lucide-react"
import Link from "next/link"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { bolehKelolaUser } from "@/lib/peran"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const masterData = [
  { href: "/dashboard/jurusan", label: "Jurusan", icon: Building2 },
  { href: "/dashboard/kelas", label: "Kelas", icon: GraduationCap },
  { href: "/dashboard/guru", label: "Guru", icon: UserRound },
  { href: "/dashboard/peserta", label: "Peserta", icon: Users },
  { href: "/dashboard/mapel", label: "Mapel", icon: BookOpen },
]

const menuUtama = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/bank-soal", label: "Bank Soal", icon: FileText },
  { href: "/dashboard/jadwal", label: "Jadwal", icon: CalendarDays },
  { href: "/dashboard/pengerjaan", label: "Pengerjaan", icon: BookOpenCheck },
  { href: "/dashboard/hasil", label: "Hasil Ujian", icon: BarChart3 },
]

const menuSistem = [
  { href: "/dashboard/user", label: "User", icon: UserCog },
  { href: "/dashboard/akses-pdf", label: "Akses Unduh PDF", icon: Lock },
  { href: "/dashboard/pengaturan", label: "Pengaturan", icon: Settings },
]

export async function DashboardSidebar({ active }: { active: string }) {
  // Menu sistem sensitif (kelola user & verifikasi akses PDF) hanya untuk superadmin.
  const khususSuperadmin = ["/dashboard/user", "/dashboard/akses-pdf"]
  const menu = (await bolehKelolaUser())
    ? menuSistem
    : menuSistem.filter((item) => !khususSuperadmin.includes(item.href))
  const masterAktif = masterData.some((item) => item.href === active)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Home className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">SMANSABA Assesmen</span>
                <span className="truncate text-xs text-muted-foreground">Manajemen Assesmen</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Item href="/dashboard" label="Dashboard" icon={menuUtama[0].icon} active={active === "/dashboard"} />

              <Collapsible defaultOpen={masterAktif} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger render={<SidebarMenuButton tooltip="Master Data" isActive={masterAktif} />}>
                    <Database className="size-4" />
                    <span className="truncate">Master Data</span>
                    <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {masterData.map((item) => (
                        <SidebarMenuSubItem key={item.href}>
                          <SidebarMenuSubButton isActive={active === item.href} render={<Link href={item.href} />}>
                            <span className="truncate">{item.label}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {menuUtama.slice(1).map((item) => (
                <Item key={item.href} href={item.href} label={item.label} icon={item.icon} active={active === item.href} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sistem</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menu.map((item) => (
                <Item key={item.href} href={item.href} label={item.label} icon={item.icon} active={active === item.href} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
  )
}

function Item({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive={active} tooltip={label} render={<Link href={href} />}>
        <Icon className="size-4" />
        <span className="truncate">{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
