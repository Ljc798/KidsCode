"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

type MeResponse =
  | {
      ok: true
      student: {
        id: string
        nickname: string
        age: number
        account: string
        className?: string | null
        pointsBalance?: number
        level?: { level: number; progressPct: number; xp: number; nextLevelXp: number }
      }
    }
  | { ok: false }

function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-950/10 dark:bg-white/10">
      <div
        className="h-2 rounded-full bg-zinc-950 dark:bg-white"
        style={{ width: `${v}%` }}
      />
    </div>
  )
}

export default function HomeDashboardCards() {
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

  const nickname = me?.ok ? me.student.nickname : null
  const hello = useMemo(() => {
    if (loading) return "Hello"
    return nickname ? `Hello，${nickname}` : "Hello"
  }, [loading, nickname])

  const pointsBalance = me?.ok ? (me.student.pointsBalance ?? 0) : 0
  const level = me?.ok ? me.student.level : null
  const levelLabel = level ? `Lv. ${level.level}` : "Lv. 1"
  const progressPct = level ? level.progressPct : 0

  return (
    <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
      <div className="rounded-3xl border border-black/5 bg-white/60 p-4 text-sm dark:border-white/10 dark:bg-white/5">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Welcome
        </div>
        <div className="mt-1 font-extrabold">{hello}</div>
        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {loading ? (
            "正在读取登录信息..."
          ) : me?.ok ? (
            <>
              {me.student.className ? `${me.student.className} · ` : ""}
              {me.student.account}
            </>
          ) : (
            <Link href="/login?next=%2F" className="font-semibold hover:underline">
              去登录
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white/60 p-4 text-sm dark:border-white/10 dark:bg-white/5">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          积分余额
        </div>
        <div className="mt-1 text-3xl font-extrabold leading-none tabular-nums sm:text-4xl">
          {pointsBalance}
        </div>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white/60 p-4 text-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              等级
            </div>
            <div className="mt-1 font-extrabold">{levelLabel}</div>
          </div>
          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {progressPct}%
          </div>
        </div>
        <ProgressBar value={progressPct} />
      </div>
    </div>
  )
}
