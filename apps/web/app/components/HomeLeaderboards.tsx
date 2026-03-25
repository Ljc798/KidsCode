"use client"

import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/app/lib/api"

type LeaderboardCategory = "daily" | "xp" | "games"

type MeResponse =
  | {
      ok: true
      student: {
        className?: string | null
      }
    }
  | { ok: false }

type LeaderboardItem = {
  rank: number
  id: string
  nickname: string
  value: number
  xp: number
  level: number
}

type LeaderboardResponse = {
  ok: true
  category: LeaderboardCategory
  className: string
  date: string
  leaderboard: LeaderboardItem[]
}

type ClassesResponse = {
  ok: true
  classes: string[]
}

function categoryLabel(c: LeaderboardCategory) {
  if (c === "daily") return "今日积分"
  if (c === "xp") return "宠物等级"
  return "通关数"
}

function valueLabel(c: LeaderboardCategory) {
  if (c === "daily") return "分"
  if (c === "xp") return "级"
  return "关"
}

export default function HomeLeaderboards() {
  const [category, setCategory] = useState<LeaderboardCategory>("daily")
  const [classOptions, setClassOptions] = useState<string[]>(["C1", "C2", "C3", "C4", "S1", "S2", "S3", "S4"])
  const [className, setClassName] = useState<string>("C1")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<LeaderboardItem[]>([])

  useEffect(() => {
    const run = async () => {
      let classes: string[] = classOptions
      try {
        const classesData = await apiFetch<ClassesResponse>("/leaderboard/classes")
        if (classesData.ok && Array.isArray(classesData.classes) && classesData.classes.length > 0) {
          classes = classesData.classes
          setClassOptions(classesData.classes)
        }
      } catch {
        // ignore
      }
      try {
        const me = await apiFetch<MeResponse>("/auth/student/me")
        if (me.ok) {
          const fromMe = (me.student.className ?? "").trim().toUpperCase()
          if (fromMe && classes.includes(fromMe)) {
            setClassName(fromMe)
            return
          }
        }
      } catch {
        // ignore
      }
      setClassName(current => (classes.includes(current) ? current : classes[0] ?? current))
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const query = useMemo(
    () => `/leaderboard/${category}?className=${encodeURIComponent(className)}`,
    [category, className]
  )

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await apiFetch<LeaderboardResponse>(query)
        setItems(Array.isArray(data.leaderboard) ? data.leaderboard.slice(0, 10) : [])
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "网络错误"
        setError(message)
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [query])

  return (
    <div className="mt-4 rounded-[2rem] border border-black/5 bg-white/60 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/40 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xl font-extrabold tracking-tight">排行榜</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            按班级查看：{className} · {categoryLabel(category)}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex overflow-hidden rounded-2xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5">
            {classOptions.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setClassName(c)}
                className={[
                  "h-9 px-3 text-sm font-extrabold",
                  c === className
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                    : "text-zinc-800 hover:bg-white dark:text-zinc-200 dark:hover:bg-white/10"
                ].join(" ")}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="flex overflow-hidden rounded-2xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5">
            {(["daily", "xp", "games"] as const).map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={[
                  "h-9 px-3 text-sm font-extrabold",
                  c === category
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                    : "text-zinc-800 hover:bg-white dark:text-zinc-200 dark:hover:bg-white/10"
                ].join(" ")}
              >
                {categoryLabel(c)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-5 grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-2xl border border-black/5 bg-white/60 dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-black/5 bg-white/60 px-4 py-3 text-sm text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
          暂无数据
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5">
          <div className="grid grid-cols-[72px_1fr_96px] gap-2 border-b border-black/10 px-4 py-2 text-xs font-extrabold text-zinc-600 dark:border-white/10 dark:text-zinc-300">
            <div>名次</div>
            <div>同学</div>
            <div className="text-right">{categoryLabel(category)}</div>
          </div>
          <div className="divide-y divide-black/10 dark:divide-white/10">
            {items.map(it => (
              <div
                key={it.id}
                className="grid grid-cols-[72px_1fr_96px] gap-2 px-4 py-2 text-sm"
              >
                <div className="font-extrabold tabular-nums text-zinc-900 dark:text-white">
                  #{it.rank}
                </div>
                <div className="truncate font-semibold text-zinc-900 dark:text-white">
                  {it.nickname}
                </div>
                <div className="text-right font-extrabold tabular-nums text-zinc-900 dark:text-white">
                  {it.value}
                  {valueLabel(category)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
