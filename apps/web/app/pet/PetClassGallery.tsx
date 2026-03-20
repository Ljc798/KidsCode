"use client"

import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/app/lib/api"
import { petEmoji } from "@/app/lib/pet"

type PetGalleryResponse = {
  viewerRole: "STUDENT" | "ADMIN"
  className: string
  currentStudentId: string | null
  classes: string[]
  items: Array<{
    id: string
    nickname: string
    className: string | null
    pointsBalance: number
    pet: {
      name: string
      species: string
      meat: number
      meatPerLevel: number
      mood: number
      energy: number
      stage: string
      level: {
        level: number
        progressPct: number
        xp: number
        nextLevelXp: number
      }
    }
  }>
}

export default function PetClassGallery() {
  const [data, setData] = useState<PetGalleryResponse | null>(null)
  const [className, setClassName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rewardingId, setRewardingId] = useState<string | null>(null)

  const query = useMemo(
    () => (className ? `?className=${encodeURIComponent(className)}` : ""),
    [className]
  )

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const next = await apiFetch<PetGalleryResponse>(`/pets${query}`)
        setData(next)
        if (!className && next.className) setClassName(next.className)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "加载宠物图鉴失败")
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [query])

  return (
    <section className="mt-8 rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950/50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white">
            班级宠物图鉴
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            按班级查看同学们的电子宠物，每个同学一张宠物小卡片。
          </p>
          {data ? (
            <div className="mt-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              当前身份：{data.viewerRole === "ADMIN" ? "管理员" : "学生"}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {(data?.classes ?? []).map(item => (
            <button
              key={item}
              type="button"
              onClick={() => setClassName(item)}
              className={[
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                item === (className || data?.className)
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                  : "border border-black/10 text-zinc-700 dark:border-white/10 dark:text-zinc-200"
              ].join(" ")}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-48 animate-pulse rounded-[1.8rem] border border-black/10 bg-white/70 dark:border-white/10 dark:bg-zinc-900/40"
            />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="mt-5 rounded-[1.6rem] border border-black/10 bg-white/70 px-4 py-5 text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-900/40 dark:text-zinc-300">
          这个班级还没有宠物数据。
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map(item => (
            <div
              key={item.id}
              className={[
                "rounded-[1.8rem] border p-5 shadow-sm transition",
                item.id === data.currentStudentId
                  ? "border-amber-400/40 bg-[linear-gradient(145deg,#fff7e8,white_55%,#eaf8ff)] dark:border-amber-300/30 dark:bg-[linear-gradient(145deg,#2a1c12,#111827_55%,#0f172a)]"
                  : "border-black/10 bg-white/70 dark:border-white/10 dark:bg-zinc-900/40"
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-white text-4xl shadow-sm dark:bg-zinc-950">
                    {petEmoji(item.pet.species)}
                  </div>
                  <div>
                    <div className="text-lg font-black text-zinc-950 dark:text-white">
                      {item.pet.name}
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      {item.pet.species} · {item.pet.stage}
                    </div>
                  </div>
                </div>
                <div className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white dark:bg-white dark:text-zinc-950">
                  Lv. {item.pet.level.level}
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                  <span>{item.nickname}</span>
                  <span>{item.pet.level.progressPct}%</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-zinc-950/10 dark:bg-white/10">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-amber-400 via-lime-400 to-sky-400"
                    style={{ width: `${item.pet.level.progressPct}%` }}
                  />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
                <div className="rounded-2xl border border-black/10 bg-white/70 px-3 py-3 dark:border-white/10 dark:bg-zinc-950/50">
                  <div>积分</div>
                  <div className="mt-1 font-black text-zinc-950 dark:text-white">{item.pointsBalance}</div>
                </div>
                <div className="rounded-2xl border border-black/10 bg-white/70 px-3 py-3 dark:border-white/10 dark:bg-zinc-950/50">
                  <div>肉肉</div>
                  <div className="mt-1 font-black text-zinc-950 dark:text-white">
                    {item.pet.meat}/{item.pet.meatPerLevel}
                  </div>
                </div>
                <div className="rounded-2xl border border-black/10 bg-white/70 px-3 py-3 dark:border-white/10 dark:bg-zinc-950/50">
                  <div>心情</div>
                  <div className="mt-1 font-black text-zinc-950 dark:text-white">{item.pet.mood}%</div>
                </div>
                <div className="rounded-2xl border border-black/10 bg-white/70 px-3 py-3 dark:border-white/10 dark:bg-zinc-950/50">
                  <div>体力</div>
                  <div className="mt-1 font-black text-zinc-950 dark:text-white">{item.pet.energy}%</div>
                </div>
              </div>

              {data.viewerRole === "ADMIN" ? (
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={rewardingId === item.id}
                    onClick={async () => {
                      setRewardingId(item.id)
                      setError(null)
                      try {
                        const rewarded = await apiFetch<{
                          ok: true
                          rewardType: "POINTS" | "MEAT"
                          added: number
                          levelsGained: number
                          student: PetGalleryResponse["items"][number]
                        }>("/pets/rewards", {
                          method: "POST",
                          body: JSON.stringify({
                            studentId: item.id,
                            rewardType: "MEAT",
                            amount: 1
                          })
                        })
                        setData(current =>
                          current
                            ? {
                                ...current,
                                items: current.items.map(existing =>
                                  existing.id === rewarded.student.id ? rewarded.student : existing
                                )
                              }
                            : current
                        )
                      } catch (err: unknown) {
                        setError(err instanceof Error ? err.message : "奖励失败")
                      } finally {
                        setRewardingId(null)
                      }
                    }}
                    className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-50 px-4 text-sm font-extrabold text-amber-700 shadow-sm hover:bg-amber-100 disabled:opacity-50 dark:border-amber-300/20 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/50"
                  >
                    {rewardingId === item.id ? "奖励中..." : "奖励肉肉 +1"}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
