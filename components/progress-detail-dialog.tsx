"use client"

import { useMemo, useState } from "react"
import { Eye } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type ProgressStudent = {
  id: string
  name: string
  nis: string
  status: "NOT_STARTED" | "STARTED" | "SUBMITTED"
  startedAt: string | null
  submittedAt: string | null
}

type StatusFilter = "ALL" | ProgressStudent["status"]

export function ProgressDetailDialog({
  title,
  className,
  students,
}: {
  title: string
  className: string
  students: ProgressStudent[]
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<StatusFilter>("ALL")
  const stats = useMemo(
    () => ({
      total: students.length,
      notStarted: students.filter((student) => student.status === "NOT_STARTED").length,
      started: students.filter((student) => student.status === "STARTED").length,
      submitted: students.filter((student) => student.status === "SUBMITTED").length,
    }),
    [students]
  )
  const filteredStudents = useMemo(() => {
    if (filter === "ALL") return students

    return students.filter((student) => student.status === filter)
  }, [filter, students])

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setFilter("ALL")
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Eye className="size-4" />
        <span className="sr-only">Lihat detail pengerjaan</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Detail Pengerjaan</DialogTitle>
          <DialogDescription>{title} • {className}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <SummaryItem label="Target" value={stats.total} active={filter === "ALL"} accent="sky" onClick={() => setFilter("ALL")} />
          <SummaryItem label="Belum" value={stats.notStarted} active={filter === "NOT_STARTED"} accent="rose" onClick={() => setFilter("NOT_STARTED")} />
          <SummaryItem label="Sedang" value={stats.started} active={filter === "STARTED"} accent="amber" onClick={() => setFilter("STARTED")} />
          <SummaryItem label="Selesai" value={stats.submitted} active={filter === "SUBMITTED"} accent="emerald" onClick={() => setFilter("SUBMITTED")} />
        </div>
        <div className="max-h-[60vh] overflow-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>NIS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mulai</TableHead>
                <TableHead>Selesai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Tidak ada peserta pada filter ini.
                  </TableCell>
                </TableRow>
              ) : filteredStudents.map((student, index) => (
                <TableRow key={student.id} className="transition-colors hover:bg-muted/40">
                  <TableCell className="text-center text-sm text-muted-foreground tabular-nums">{index + 1}</TableCell>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{student.nis}</TableCell>
                  <TableCell><StatusBadge status={student.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(student.startedAt)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(student.submittedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SummaryItem({ label, value, active, accent, onClick }: { label: string; value: number; active: boolean; accent: "sky" | "rose" | "amber" | "emerald"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm",
        accent === "sky" && "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
        accent === "rose" && "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
        accent === "amber" && "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        accent === "emerald" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        active && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value.toLocaleString("id-ID")}</p>
    </button>
  )
}

function StatusBadge({ status }: { status: ProgressStudent["status"] }) {
  const label = status === "SUBMITTED" ? "Selesai" : status === "STARTED" ? "Sedang" : "Belum"

  return (
    <Badge variant="secondary" className={cn("font-normal", status === "SUBMITTED" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : status === "STARTED" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300")}>{label}</Badge>
  )
}

function formatDateTime(value: string | null) {
  if (!value) return "—"

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}
