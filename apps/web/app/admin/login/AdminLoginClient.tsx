"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function AdminLoginClient({ next }: { next: string }) {
  const router = useRouter()

  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password })
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? "Login failed")
      router.replace(next)
    } catch (e2: unknown) {
      setError(e2 instanceof Error ? e2.message : "Login failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.sky.100),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.amber.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.sky.950),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.amber.950),transparent)]">
      <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-[2rem] border border-black/5 bg-white/70 p-7 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Admin
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
            登录管理后台
          </h1>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <form onSubmit={submit} className="mt-6 grid gap-4">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                Phone
              </span>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                type="tel"
                inputMode="numeric"
                className="h-11 rounded-2xl border border-black/10 bg-white/70 px-4 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                Password
              </span>
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                type="password"
                className="h-11 rounded-2xl border border-black/10 bg-white/70 px-4 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
                required
              />
            </label>

            <button
              disabled={submitting}
              className="mt-2 inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {submitting ? "登录中..." : "登录"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link
              href="/"
              className="font-semibold text-zinc-700 hover:underline dark:text-zinc-200"
            >
              返回首页
            </Link>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              KidsCode
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
