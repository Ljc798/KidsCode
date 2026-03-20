import { redirect } from "next/navigation"

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const sp = await searchParams
  const next = sp?.next ?? "/admin"
  redirect(`/login?next=${encodeURIComponent(next)}`)
}
