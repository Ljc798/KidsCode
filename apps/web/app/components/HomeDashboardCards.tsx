"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { petEmoji } from "@/app/lib/pet"

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
        pet: {
          name: string
          species: string
          stage: string
          mood: number
          energy: number
          level: { level: number; progressPct: number; xp: number; nextLevelXp: number }
        }
      }
    }
  | { ok: false }

function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-950/10 dark:bg-white/10">
      <div
        className="h-2 rounded-full bg-gradient-to-r from-amber-400 via-lime-400 to-sky-400"
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

  const pet = me?.ok ? me.student.pet : null
  const levelLabel = pet ? `Lv. ${pet.level.level}` : "Lv. 1"
  const progressPct = pet ? pet.level.progressPct : 0

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
          宠物伙伴
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-4xl shadow-sm dark:bg-zinc-900">
            {petEmoji(pet?.species ?? "云朵龙")}
          </div>
          <div>
            <div className="font-extrabold text-zinc-950 dark:text-white">
              {pet?.name ?? "小码兽"}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {pet?.species ?? "云朵龙"} · {pet?.stage ?? "新手伙伴"}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white/60 p-4 text-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              宠物成长
            </div>
            <div className="mt-1 font-extrabold">{levelLabel}</div>
          </div>
          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {progressPct}%
          </div>
        </div>
        <ProgressBar value={progressPct} />
        <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span>{pet?.species ?? "云朵龙"} · {pet?.stage ?? "新手伙伴"}</span>
          <Link href="/pet" className="font-semibold text-zinc-700 hover:underline dark:text-zinc-200">
            查看宠物
          </Link>
        </div>
      </div>
    </div>
  )
}
