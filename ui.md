# UI Standard — Rekap Nilai 2026

Dokumen ini adalah **acuan standar tampilan** seluruh halaman dashboard agar konsisten dengan halaman `/dashboard/siswa`. Semua halaman CRUD (kelas, mapel, periode, jurnal, kehadiran, penilaian, nilai, dst.) wajib mengikuti pola yang dijelaskan di sini.

Stack: **Next.js (App Router) + Tailwind CSS + shadcn/ui + lucide-react**.

---

## 1. Prinsip Desain

1. **Modern & ringkas** — gunakan kartu (Card), badge, dan spacing yang lega.
2. **User-friendly** — search + filter selalu disediakan untuk daftar > 10 baris.
3. **Konsisten** — komponen, jarak, ukuran ikon, dan warna mengikuti pola di bawah.
4. **Aksesibel** — selalu sertakan `Label` untuk input, `sr-only` untuk tombol ikon, `aria-*` ketika perlu.
5. **Responsif** — mobile-first; layout grid runtuh ke 1 kolom di < `md`.
6. **Hindari setState dalam useEffect** untuk mereset state turunan; gunakan handler eksplisit (lihat §10).

---

## 2. Anatomi Halaman

Setiap halaman dashboard harus memiliki struktur berikut, **berurutan dari atas**:

```
<DashboardNavbar />
<main max-w-7xl>
  1. Header halaman      (judul + periode aktif)
  2. Stat Cards          (4 kartu statistik)
  3. Alert (kondisional) (error / empty-state global)
  4. Main Content Card   (tabel + filter + action buttons)
  5. Dialogs             (Create/Edit, Import, Confirm Delete)
</main>
```

### Container utama

```tsx
<div className="flex flex-1 flex-col bg-muted/30">
  <DashboardNavbar title="..." description="..." />
  <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
    {/* sections */}
  </main>
</div>
```

Aturan:
- `max-w-7xl` — lebar konten maksimum.
- `gap-6` antar section (header → stats → alert → card).
- Padding responsif: `px-4 md:px-6 lg:px-8`.

---

## 3. Header Halaman

Hanya berisi **judul + info periode aktif**. Tombol aksi (Tambah/Import) **TIDAK** di sini, melainkan di dalam Card tabel (§5).

```tsx
<section className="space-y-1">
  <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
    Data Siswa
  </h1>
  <p className="text-sm text-muted-foreground">
    Periode aktif:{" "}
    <span className="font-medium text-foreground">
      {selectedPeriod ? periodLabel(selectedPeriod) : "—"}
    </span>
  </p>
</section>
```

---

## 4. Stat Cards (Kartu Statistik)

4 kartu sejajar, responsive: 2 kolom di mobile, 4 kolom di `lg`.

```tsx
<section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
  <StatCard label="Total ..." value={...} icon={Users} accent="..." ringClass="..." description="..." />
  ...
</section>
```

### Komponen `StatCard` (taruh di bagian bawah file halaman)

```tsx
type StatCardProps = {
  label: string
  value: number
  description: string
  icon: React.ComponentType<{ className?: string }>
  accent: string      // gradient + text color, misal "from-sky-500/10 to-sky-500/0 text-sky-600 dark:text-sky-400"
  ringClass: string   // ring color, misal "ring-sky-500/20"
}

function StatCard({ label, value, description, icon: Icon, accent, ringClass }: StatCardProps) {
  return (
    <Card className={cn("relative overflow-hidden transition-shadow hover:shadow-md", ringClass)}>
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100", accent)} />
      <CardHeader className="relative">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-semibold tracking-tight tabular-nums md:text-3xl">
              {value.toLocaleString("id-ID")}
            </p>
          </div>
          <div className={cn(
            "flex size-9 items-center justify-center rounded-lg bg-background/80 ring-1 ring-foreground/5 backdrop-blur",
            accent.split(" ").find((c) => c.startsWith("text-")) ?? ""
          )}>
            <Icon className="size-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
```

### Palet warna stat card (gunakan urutan ini)

| Slot | accent | ringClass | Contoh penggunaan |
|---|---|---|---|
| 1 | `from-sky-500/10 to-sky-500/0 text-sky-600 dark:text-sky-400` | `ring-sky-500/20` | Total / metrik utama |
| 2 | `from-blue-500/10 to-blue-500/0 text-blue-600 dark:text-blue-400` | `ring-blue-500/20` | Sub-metrik 1 (mis. Laki-laki) |
| 3 | `from-pink-500/10 to-pink-500/0 text-pink-600 dark:text-pink-400` | `ring-pink-500/20` | Sub-metrik 2 (mis. Perempuan) |
| 4 | `from-emerald-500/10 to-emerald-500/0 text-emerald-600 dark:text-emerald-400` | `ring-emerald-500/20` | Metrik pendukung (kelas/total entitas lain) |

Alternatif jika konteks berbeda: `amber` (warning/pending), `violet` (analitik), `rose` (penurunan).

Aturan:
- `value` selalu `number`, diformat dengan `toLocaleString("id-ID")`.
- `description` ringkas (≤ 60 karakter), boleh menampilkan persentase relatif.
- Ikon dari `lucide-react`, ukuran `size-4`.

---

## 5. Main Content Card (Tabel + Aksi + Filter)

Pola:

```
CardHeader (border-b)
  ┌─ Title + badge "X hasil"           Tombol: Import + Tambah
  ├─ CardDescription
  └─ Filter row (search + select + reset)
CardContent
  ┌─ <Table>
  └─ Pagination + page-size selector
```

### 5.1 Card Header — title + tombol aksi sejajar

```tsx
<Card>
  <CardHeader className="border-b">
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <CardTitle>Daftar Siswa</CardTitle>
          <Badge variant="secondary" className="font-normal">
            {filteredItems.length} hasil
          </Badge>
        </div>
        <CardDescription>
          Cari dan filter siswa berdasarkan kelas atau jenis kelamin.
        </CardDescription>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
        <Button variant="outline" className="gap-2" onClick={openImport}>
          <Upload className="size-4" />
          Import Excel
        </Button>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="size-4" />
          Tambah Siswa
        </Button>
      </div>
    </div>

    {/* Filter row */}
    <div className="mt-4 grid gap-3 md:grid-cols-12">
      {/* … */}
    </div>
  </CardHeader>
  <CardContent>{/* table + pagination */}</CardContent>
</Card>
```

Aturan tombol aksi:
- Tombol primer (mis. **Tambah**) = `<Button>` default.
- Tombol sekunder (mis. **Import**) = `<Button variant="outline">`.
- Selalu dengan ikon `lucide-react` di kiri (`Plus`, `Upload`, `Download`, `Filter`, dst.) dan kelas `gap-2`.
- Disable bila prasyarat belum terpenuhi (mis. `classrooms.length === 0`).

### 5.2 Filter Row

Gunakan grid 12-kolom agar fleksibel:

```tsx
<div className="mt-4 grid gap-3 md:grid-cols-12">
  {/* Search */}
  <div className="relative md:col-span-5">
    <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    <Input value={search} onChange={(e) => handleSearchChange(e.target.value)}
      placeholder="Cari ..." className="pl-8" />
  </div>

  {/* Filter 1 */}
  <div className="md:col-span-3">
    <Select value={filter1} onValueChange={handleFilter1Change}>
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2 truncate">
          <Filter className="size-4 text-muted-foreground" />
          <span className="truncate">{label1}</span>
        </div>
      </SelectTrigger>
      <SelectContent align="start">
        <SelectItem value="ALL">Semua</SelectItem>
        {/* options */}
      </SelectContent>
    </Select>
  </div>

  {/* Filter 2 */}
  <div className="md:col-span-2">{/* Select */}</div>

  {/* Reset */}
  <div className="md:col-span-2">
    <Button variant="outline" className="w-full gap-2"
      onClick={resetFilters} disabled={!hasActiveFilter}>
      <RotateCcw className="size-4" />
      Reset
    </Button>
  </div>
</div>
```

Aturan filter:
- Sediakan **search** + **minimal 1 filter** untuk daftar yang difilter.
- Nilai default filter selalu `"ALL"` (jangan `""` agar `Select` tetap controlled).
- Sertakan **tombol Reset** yang `disabled` saat tidak ada filter aktif.
- Setiap perubahan filter/search **harus reset `currentPage` ke 1** (lakukan di handler, bukan `useEffect` — lihat §10).

---

## 6. Tabel

```tsx
<div className="overflow-hidden rounded-lg border">
  <Table>
    <TableHeader>
      <TableRow className="bg-muted/40 hover:bg-muted/40">
        <TableHead className="w-12 text-center">#</TableHead>
        <TableHead>Kolom Utama</TableHead>
        {/* ... */}
        <TableHead className="w-32 text-right">Aksi</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {/* state: loading | empty | data */}
    </TableBody>
  </Table>
</div>
```

### State tabel (urutan wajib)

1. **Loading** — colspan penuh, `Loader2 animate-spin` + teks "Memuat data...".
2. **Empty** — colspan penuh, ikon dalam lingkaran, judul, deskripsi, tombol "Reset filter" jika `hasActiveFilter`.
3. **Data** — baris dengan `transition-colors hover:bg-muted/40`.

```tsx
{loading ? (
  <TableRow>
    <TableCell colSpan={N} className="h-32 text-center">
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Memuat data...
      </div>
    </TableCell>
  </TableRow>
) : filteredItems.length === 0 ? (
  <TableRow className="hover:bg-transparent">
    <TableCell colSpan={N} className="h-48 text-center">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-muted-foreground">
        <div className="rounded-full bg-muted p-4">
          <GraduationCap className="size-7" />
        </div>
        <div className="space-y-1">
          <div className="font-medium text-foreground">
            {hasActiveFilter ? "Tidak ada hasil yang cocok" : "Belum ada data"}
          </div>
          <p className="text-sm">
            {hasActiveFilter
              ? "Coba ubah kata kunci atau atur ulang filter."
              : "Tambahkan data untuk mulai."}
          </p>
        </div>
        {hasActiveFilter && (
          <Button size="sm" variant="outline" onClick={resetFilters}>
            <RotateCcw className="size-4" />
            Reset filter
          </Button>
        )}
      </div>
    </TableCell>
  </TableRow>
) : (
  paginatedItems.map((row, index) => (
    <TableRow key={row.id} className="transition-colors hover:bg-muted/40">
      <TableCell className="text-center text-sm text-muted-foreground tabular-nums">
        {(activePage - 1) * pageSize + index + 1}
      </TableCell>
      {/* … */}
      <TableCell>
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="icon-sm" onClick={() => onEdit(row)}>
            <Edit className="size-4" /><span className="sr-only">Edit</span>
          </Button>
          <Button variant="ghost" size="icon-sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleting(row)}>
            <Trash2 className="size-4" /><span className="sr-only">Hapus</span>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  ))
)}
```

### Konvensi kolom

- **Kolom pertama** = nomor urut, `w-12 text-center`, bukan ID asli.
- **Kolom kedua** = identitas utama (nama). Bila ada Avatar, kombinasikan dengan inisial.
- **Kolom kode/NIS** = `font-mono text-xs text-muted-foreground`.
- **Kolom kategori** = `<Badge variant="outline">` atau colored badge (lihat §7).
- **Kolom Aksi** = `w-32 text-right`, isinya `Button variant="ghost" size="icon-sm"` (bukan filled/destructive penuh) — jangan ramai.

---

## 7. Badge & Avatar

### Badge kategori

Default: `<Badge variant="outline" className="font-normal">{label}</Badge>`.

Untuk kategori dengan makna semantik (gender, status), gunakan **colored badge**:

```tsx
<Badge
  variant="secondary"
  className={cn(
    "font-normal",
    isMale
      ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
      : "bg-pink-500/10 text-pink-700 dark:text-pink-300"
  )}
>
  {label}
</Badge>
```

Palet badge semantik:
- **Sukses / aktif**: `bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`
- **Info / netral**: `bg-sky-500/10 text-sky-700 dark:text-sky-300`
- **Peringatan / pending**: `bg-amber-500/10 text-amber-700 dark:text-amber-300`
- **Error / nonaktif**: `bg-rose-500/10 text-rose-700 dark:text-rose-300`
- **Maskulin**: `bg-blue-500/10 text-blue-700 dark:text-blue-300`
- **Feminin**: `bg-pink-500/10 text-pink-700 dark:text-pink-300`

### Avatar inisial (untuk daftar yang berisi orang)

```tsx
<Avatar size="sm">
  <AvatarFallback className={cn(
    "text-xs font-medium",
    isMale
      ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
      : "bg-pink-500/15 text-pink-700 dark:text-pink-300"
  )}>
    {getInitials(name)}
  </AvatarFallback>
</Avatar>
```

```ts
function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()
}
```

---

## 8. Pagination

Pakai pagination smart dengan ellipsis + page-size selector. Helper `buildPageRange`:

```ts
function buildPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const range: (number | "...")[] = [1]
  const left = Math.max(2, current - 1)
  const right = Math.min(total - 1, current + 1)
  if (left > 2) range.push("...")
  for (let i = left; i <= right; i++) range.push(i)
  if (right < total - 1) range.push("...")
  range.push(total)
  return range
}
```

Konstanta wajib: `const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const`.

Layout di bawah tabel:

```tsx
<div className="mt-4 flex flex-col items-center justify-between gap-3 md:flex-row">
  <div className="flex flex-col items-center gap-3 sm:flex-row">
    <p className="text-sm text-muted-foreground">
      Menampilkan <span className="font-medium text-foreground">{from}</span>
      –<span className="font-medium text-foreground">{to}</span> dari{" "}
      <span className="font-medium text-foreground">{total}</span> entri
    </p>
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Per halaman</span>
      <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
        <SelectTrigger className="h-8 w-[80px]"><span>{pageSize}</span></SelectTrigger>
        <SelectContent align="end">
          {PAGE_SIZE_OPTIONS.map((opt) => (
            <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>

  {totalPages > 1 && (
    <Pagination className="mx-0 w-auto">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" text="Sebelumnya"
            className={activePage === 1 ? "pointer-events-none opacity-50" : undefined}
            onClick={(e) => { e.preventDefault(); setCurrentPage((p) => Math.max(1, p - 1)) }} />
        </PaginationItem>
        {pageRange.map((page, idx) =>
          page === "..." ? (
            <PaginationItem key={`e-${idx}`}><PaginationEllipsis /></PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink href="#" isActive={page === activePage}
                onClick={(e) => { e.preventDefault(); setCurrentPage(page) }}>
                {page}
              </PaginationLink>
            </PaginationItem>
          )
        )}
        <PaginationItem>
          <PaginationNext href="#" text="Berikutnya"
            className={activePage === totalPages ? "pointer-events-none opacity-50" : undefined}
            onClick={(e) => { e.preventDefault(); setCurrentPage((p) => Math.min(totalPages, p + 1)) }} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )}
</div>
```

---

## 9. Dialogs (Form, Import, Delete)

### Dialog Create / Edit

- Title: `"Tambah X"` / `"Edit X"`.
- Description ringkas.
- Body: `<form className="space-y-4">` dengan `Label + Input/Select` untuk setiap field; gunakan `grid sm:grid-cols-2` jika ada 2 field sejajar.
- Footer: tombol kiri `variant="outline"` (Batal), kanan default (Simpan), keduanya `disabled={saving}`.
- Tampilkan `<Loader2 className="size-4 animate-spin" />` saat `saving`.

### Dialog Import (jika ada)

- Step 1: form upload (`<Input type="file" accept=".xlsx,.xls,.csv">`).
- Step 2: preview tabel dengan pagination yang sama.
- Tombol Konfirmasi: `Simpan {N} Item`.

### Konfirmasi Delete

Pakai `AlertDialog`:

```tsx
<AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogMedia><Trash2 className="size-5" /></AlertDialogMedia>
      <AlertDialogTitle>Hapus X?</AlertDialogTitle>
      <AlertDialogDescription>...</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
      <AlertDialogAction
        className="bg-destructive/10 text-destructive hover:bg-destructive/20"
        disabled={deleting}
        onClick={handleDelete}>
        {isDeleting && <Loader2 className="size-4 animate-spin" />}
        {isDeleting ? "Menghapus..." : "Hapus"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 10. Pola State & Handler

### Aturan filter & pagination

- Simpan filter sebagai state lokal: `search`, `filterX` (default `"ALL"`), `pageSize` (default `10`), `currentPage` (default `1`).
- **Reset `currentPage` di handler**, **bukan** dalam `useEffect` (ESLint `react-hooks/set-state-in-effect` akan menolaknya):

```ts
function handleSearchChange(value: string) {
  setSearch(value)
  setCurrentPage(1)
}

function handleFilterXChange(value: string | null) {
  setFilterX(value || "ALL")
  setCurrentPage(1)
}

function handlePageSizeChange(value: string | null) {
  if (!value) return
  setPageSize(Number(value))
  setCurrentPage(1)
}

function resetFilters() {
  setSearch("")
  setFilterX("ALL")
  setCurrentPage(1)
}
```

> Catatan: tipe `onValueChange` shadcn `Select` adalah `(value: string | null) => void`. Selalu deklarasikan `string | null`.

### Filtering memo

```ts
const filteredItems = useMemo(() => {
  const keyword = search.toLowerCase().trim()
  return items.filter((item) => {
    if (filterX !== "ALL" && item.x !== filterX) return false
    if (!keyword) return true
    return [item.a, item.b, item.c].join(" ").toLowerCase().includes(keyword)
  })
}, [items, search, filterX])
```

### Stat cards memo

```ts
const stats = useMemo(() => ({
  total: items.length,
  groupA: items.filter((i) => i.kind === "A").length,
  // ...
}), [items])
```

### Sinkron periode aktif

Halaman yang bergantung pada periode akademik harus mendengarkan event global:

```ts
useEffect(() => {
  function handlePeriodChanged(event: Event) {
    const periodId = (event as CustomEvent<{ id: string }>).detail?.id
    if (periodId) {
      setSelectedPeriodId(periodId)
      setCurrentPage(1)
      // reset filter relevan ke "ALL" jika perlu
    }
  }
  window.addEventListener("academic-period-changed", handlePeriodChanged)
  return () => window.removeEventListener("academic-period-changed", handlePeriodChanged)
}, [])
```

### Error & Alert global

Tampilkan error fetch/submit di atas Card utama dengan `<Alert variant="destructive">`. Empty-state global (mis. periode/kelas belum dibuat) pakai `<Alert>` informatif (default variant).

---

## 11. Komponen shadcn yang Wajib Diimport

```ts
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia,
  AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
```

Tambahkan komponen lain (Tabs, Tooltip, Switch, dll.) sesuai kebutuhan halaman.

---

## 12. Ikon (lucide-react)

| Kategori | Ikon |
|---|---|
| Tambah | `Plus` |
| Edit | `Edit` |
| Hapus | `Trash2` |
| Pencarian | `Search` |
| Filter | `Filter` |
| Reset | `RotateCcw` |
| Import / Upload | `Upload` |
| Export / Download | `Download` |
| Loading | `Loader2` (selalu `animate-spin`) |
| Total / users | `Users`, `UserRound`, `UsersRound` |
| Kelas / sekolah | `School`, `GraduationCap` |
| Mapel / buku | `BookOpen` |
| Periode / kalender | `CalendarDays` |
| Nilai / dokumen | `FileText` |
| Tren | `TrendingUp` |
| Sukses | `CheckCircle2` |

Default size: `size-4`. Jangan campur dengan ikon set lain.

---

## 13. Spacing & Tipografi

- Section gap: `gap-6` di main.
- Padding card konten: gunakan default shadcn (`px-4`/`py-4`).
- Heading h1: `text-2xl md:text-3xl font-semibold tracking-tight`.
- Description: `text-sm text-muted-foreground`.
- Caption / label kecil: `text-xs text-muted-foreground`.
- Angka penting: `tabular-nums`.

---

## 14. Daftar Periksa untuk Halaman Baru

Sebelum PR/commit, pastikan:

- [ ] Container `max-w-7xl` + padding responsif.
- [ ] Header halaman (judul + periode aktif).
- [ ] 4 Stat Cards dengan urutan warna sky → blue → pink → emerald (atau yang setara konteks).
- [ ] Card tabel dengan: title + badge "X hasil", deskripsi, **tombol aksi sejajar** dengan title, filter row.
- [ ] Search + minimal 1 filter Select + tombol Reset.
- [ ] Tabel: kolom `#`, hover row, badge kategori, kolom Aksi `ghost icon-sm`.
- [ ] State **Loading**, **Empty (dengan filter & tanpa filter)**, dan **Data** ditangani.
- [ ] Pagination smart + page-size selector (`10/25/50/100`).
- [ ] Reset `currentPage` di handler, **bukan** di `useEffect`.
- [ ] Dialog Create/Edit memakai `space-y-4`, footer `Batal/Simpan`, `Loader2` saat `saving`.
- [ ] AlertDialog untuk delete dengan `AlertDialogMedia` + `Trash2`.
- [ ] Listener `academic-period-changed` jika halaman bergantung periode.
- [ ] `npx tsc --noEmit` + `npx eslint <file>` lulus tanpa error.

---

## 15. Referensi Implementasi

Lihat **`app/dashboard/siswa/page.tsx`** sebagai **referensi kanonik**. Halaman lain harus selaras dengan struktur, penamaan handler, urutan section, dan kelas Tailwind di file tersebut. Bila perlu pola baru (mis. tabel hierarkis, tab, chart), tambahkan section baru di `ui.md` ini setelah disetujui agar tetap menjadi sumber kebenaran tunggal.
