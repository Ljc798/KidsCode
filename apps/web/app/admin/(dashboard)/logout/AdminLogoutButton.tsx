"use client"

import { useRouter } from "next/navigation"

export default function AdminLogoutButton({ compact }: { compact?: boolean }) {
  const router = useRouter()

  const logout = async () => {
    await fetch("/api/auth/admin/logout", { method: "POST" })
    router.push("/")
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={logout}
      className={[
        "rounded-xl border border-black/10 bg-white/60 font-semibold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10",
        compact ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs"
      ].join(" ")}
    >
      Logout
    </button>
  )
}

