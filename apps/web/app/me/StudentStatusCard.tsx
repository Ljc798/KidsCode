"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

type MeResponse =
  | {
      ok: true
      student: {
        id: string
        nickname: string
        age: number
        account: string
        className?: string | null
        concept?: "BRANCH" | "LOOP"
        pointsBalance?: number
        starCoinsBalance?: number
        earnedToday?: number
        dailyCap?: number
        level?: { level: number; progressPct: number }
      }
    }
  | { ok: false }

export default function StudentStatusCard() {
  const router = useRouter()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/auth/student/me", { cache: "no-store" })
        const data = (await res.json().catch(() => ({ ok: false }))) as MeResponse
        setMe(res.ok ? data : { ok: false })
      } catch {
        setMe({ ok: false })
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const logout = async () => {
    await fetch("/api/auth/student/logout", { method: "POST" })
    setMe({ ok: false })
    router.refresh()
  }

  return (
    <div className="rounded-3xl border border-black/5 bg-white/60 p-5 dark:border-white/10 dark:bg-zinc-950/40">
      <div className="text-sm font-extrabold">账号</div>
      <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        {loading ? (
          "加载中..."
        ) : me?.ok ? (
          <>
            你好，<span className="font-extrabold">{me.student.nickname}</span>{" "}
            <span className="text-zinc-500 dark:text-zinc-400">
              ({me.student.account})
            </span>
            {me.student.className ? (
              <span className="text-zinc-500 dark:text-zinc-400">
                {" "}
                · {me.student.className}
              </span>
            ) : null}
          </>
        ) : (
          "还没有登录。"
        )}
      </div>

      {me?.ok ? (
        <div className="mt-3 grid gap-2 text-xs text-zinc-500 dark:text-zinc-400 sm:grid-cols-2">
          <div>
            积分：<span className="font-semibold">{me.student.pointsBalance ?? 0}</span>
          </div>
          <div>
            星空币：<span className="font-semibold">{me.student.starCoinsBalance ?? 0}</span>
          </div>
          <div>
            今日已得：{" "}
            <span className="font-semibold">
              {me.student.earnedToday ?? 0}/{me.student.dailyCap ?? 1000}
            </span>
          </div>
          <div>
            等级：<span className="font-semibold">Lv. {me.student.level?.level ?? 1}</span>
          </div>
          <div className="sm:col-span-2">
            学习进度：{" "}
            <span className="font-semibold">
              {me.student.concept === "LOOP" ? "循环" : "分支"}
            </span>{" "}
            <span className="text-zinc-400 dark:text-zinc-500">（由老师设置）</span>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {me?.ok ? (
          <button
            type="button"
            onClick={logout}
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-4 text-sm font-extrabold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            退出登录
          </button>
        ) : (
          <Link
            href="/login?next=%2Fme"
            className="inline-flex h-10 items-center justify-center rounded-2xl bg-zinc-950 px-4 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            去登录
          </Link>
        )}
      </div>
    </div>
  )
}
