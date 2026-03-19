import AdminLoginClient from "@/app/admin/login/AdminLoginClient"

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const sp = await searchParams
  const next = sp?.next ?? "/admin"
  return <AdminLoginClient next={next} />
}

