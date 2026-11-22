import { redirect } from "next/navigation"

// Login guru pindah ke /guru; alamat lama tetap diarahkan ke sana.
export default function GuruLoginLamaPage() {
  redirect("/guru")
}
