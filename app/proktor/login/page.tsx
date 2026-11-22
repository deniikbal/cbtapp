import { redirect } from "next/navigation"

// Alamat lama tetap hidup supaya tautan yang sudah dibagikan tidak mati.
export default function ProktorLoginLama() {
  redirect("/proktor")
}
