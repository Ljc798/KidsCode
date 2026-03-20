"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

export default function StudentLoginClient() {
  const router = useRouter()
  const sp = useSearchParams()
  const next = useMemo(() => sp.get("next") || "/", [sp])
  const wantsAdmin = next.startsWith("/admin")

  const [account, setAccount] = useState("")
  const [password, setPassword] = useState("123456")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, password })
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        isAdmin?: boolean
      }
      if (!res.ok) throw new Error(data.error ?? "账号或密码错误")
      if (wantsAdmin && !data.isAdmin) {
        setError("你不是管理员哦")
        return
      }

      if (data.isAdmin && next === "/") {
        router.replace("/admin")
        return
      }

      router.replace(next)
    } catch (e2: unknown) {
      setError(e2 instanceof Error ? e2.message : "账号或密码错误")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-[2rem] border border-black/5 bg-white/70 p-7 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50">
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Unified Login
      </div>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">统一登录</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        系统会自动识别你是学生还是老师。老师登录后可直接进入管理员后台，学生没有管理员权限。
      </p>
      {wantsAdmin ? (
        <p className="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
          当前正在进入管理员入口，只有老师账号可以继续。
        </p>
      ) : null}
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        账号支持字母/数字/下划线/横杠，管理员也可以输入手机号，密码默认是{" "}
        <span className="font-mono">123456</span>。
      </p>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <form onSubmit={submit} className="mt-6 grid gap-4">
        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            账号或手机号
          </span>
          <input
            value={account}
            onChange={e => setAccount(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="例如：yang_jingchen-01 / 13800000000"
            className="h-11 rounded-2xl border border-black/10 bg-white/70 px-4 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
            required
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            密码
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
        <div className="text-xs text-zinc-500 dark:text-zinc-400">KidsCode</div>
      </div>
    </div>
  )
}
