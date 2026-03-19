"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"

type EarnResponse =
  | {
      ok: true
      added: number
      pointsBalance: number
      earnedToday: number
      dailyCap: number
    }
  | { ok: false; error?: string }

type MeResponse =
  | { ok: true; student: { pointsBalance: number; earnedToday: number; dailyCap: number } }
  | { ok: false }

type OutfitId = "A" | "B" | "C"

type Outfit = {
  id: OutfitId
  title: string
  emoji: string
  desc: string
}

type Branch = {
  key: string
  kind: "IF" | "ELIF" | "ELSE"
  condition?: string
  body: string
  outfitId: OutfitId
}

type Scenario = {
  weather: "下雨" | "晴天" | "多云"
  tempC: number
}

type LevelInstance = {
  id: string
  title: string
  story: string
  scenario: Scenario
  branches: Branch[]
  correctBranchKey: Branch["key"]
  correctOutfitId: OutfitId
  rewardByOutfit: Record<OutfitId, number>
  outfits: Outfit[]
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomSeed() {
  try {
    const a = new Uint32Array(1)
    crypto.getRandomValues(a)
    return a[0]!
  } catch {
    return Date.now() >>> 0
  }
}

function pickOne<T>(rand: () => number, items: T[]) {
  return items[Math.floor(rand() * items.length)]!
}

function shuffle<T>(rand: () => number, items: T[]) {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

function RuleCard({
  branches,
  activeBranchKey
}: {
  branches: Branch[]
  activeBranchKey: string | null
}) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white/60 p-5 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        分支规则 (if / else if / else)
      </div>
      <div className="mt-3 grid gap-2 font-mono text-[13px] leading-6 text-zinc-800 dark:text-zinc-100">
        {branches.map(b => {
          const active = activeBranchKey != null && b.key === activeBranchKey
          const header =
            b.kind === "IF"
              ? "if"
              : b.kind === "ELIF"
                ? "else if"
                : "else"
          return (
            <div
              key={b.key}
              className={[
                "rounded-2xl px-3 py-2",
                active
                  ? "bg-emerald-500/10 ring-1 ring-emerald-500/20"
                  : "bg-zinc-950/5 dark:bg-white/5"
              ].join(" ")}
            >
              <span className="font-semibold">{header}</span>
              {b.kind !== "ELSE" ? (
                <>
                  {" "}
                  <span className="text-zinc-500 dark:text-zinc-400">(</span>
                  {b.condition}
                  <span className="text-zinc-500 dark:text-zinc-400">)</span>
                </>
              ) : null}{" "}
              <span className="text-zinc-500 dark:text-zinc-400">{"{"}</span>
              <div className="pl-4">{b.body}</div>
              <span className="text-zinc-500 dark:text-zinc-400">{"}"}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function weatherEmoji(w: Scenario["weather"]) {
  if (w === "下雨") return "🌧️"
  if (w === "晴天") return "☀️"
  return "⛅️"
}

export default function WeatherOutfitClient() {
  const [seed, setSeed] = useState<number>(() => randomSeed())
  const toastTimerRef = useRef<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (message: string | null, autoHideMs?: number) => {
    if (toastTimerRef.current != null) {
      window.clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
    setToast(message)
    if (message && autoHideMs && autoHideMs > 0) {
      toastTimerRef.current = window.setTimeout(() => {
        toastTimerRef.current = null
        setToast(null)
      }, autoHideMs)
    }
  }

  const levels: LevelInstance[] = useMemo(() => {
    const rand = mulberry32(seed)
    const baseOutfits: Outfit[] = [
      {
        id: "A",
        title: "雨天装备",
        emoji: "🧥",
        desc: "雨衣/雨伞，防淋湿"
      },
      {
        id: "B",
        title: "保暖外套",
        emoji: "🧣",
        desc: "外套/围巾，防着凉"
      },
      {
        id: "C",
        title: "清爽短袖",
        emoji: "👕",
        desc: "短袖/短裤，凉快一点"
      }
    ]

    const makeReward = (correct: OutfitId) => {
      const highs = [20, 30, 40]
      const lows = [0, 5, 10, 15]
      const others = (["A", "B", "C"] as const).filter(id => id !== correct)
      const high = pickOne(rand, highs)
      const [l1, l2] = shuffle(rand, lows).slice(0, 2) as [number, number]
      return { [correct]: high, [others[0]!]: l1, [others[1]!]: l2 } as Record<
        OutfitId,
        number
      >
    }

    const genScenario = (): Scenario => {
      const weather = pickOne(rand, ["下雨", "晴天", "多云"] as const)
      const tempC =
        weather === "下雨"
          ? pickOne(rand, [12, 14, 16, 18, 20])
          : pickOne(rand, [6, 10, 18, 24, 28, 32])
      return { weather, tempC }
    }

    const decide = (s: Scenario) => {
      // Branch teaching:
      // 1) if raining => rain outfit
      // 2) else if cold (< 10) => warm coat
      // 3) else if hot (>= 28) => t-shirt
      // 4) else => warm coat (simple default)
      if (s.weather === "下雨") return { key: "IF", outfitId: "A" as const }
      if (s.tempC < 10) return { key: "ELIF_COLD", outfitId: "B" as const }
      if (s.tempC >= 28) return { key: "ELIF_HOT", outfitId: "C" as const }
      return { key: "ELSE", outfitId: "B" as const }
    }

    const makeLevel = (i: number): LevelInstance => {
      const scenario = genScenario()
      const pick = decide(scenario)
      const rewardByOutfit = makeReward(pick.outfitId)
      // Keep A/B/C order stable for kids.
      const outfits = baseOutfits
      return {
        id: `L${i + 1}`,
        title: `第 ${i + 1} 关：天气穿搭`,
        story: "先查看天气，再用分支规则做选择。",
        scenario,
        branches: [
          {
            key: "IF",
            kind: "IF",
            condition: `weather == "下雨"`,
            body: "选 雨天装备",
            outfitId: "A"
          },
          {
            key: "ELIF_COLD",
            kind: "ELIF",
            condition: `tempC < 10`,
            body: "选 保暖外套",
            outfitId: "B"
          },
          {
            key: "ELIF_HOT",
            kind: "ELIF",
            condition: `tempC >= 28`,
            body: "选 清爽短袖",
            outfitId: "C"
          },
          {
            key: "ELSE",
            kind: "ELSE",
            body: "选 保暖外套",
            outfitId: "B"
          }
        ],
        correctBranchKey: pick.key,
        correctOutfitId: pick.outfitId,
        rewardByOutfit,
        outfits
      }
    }

    return Array.from({ length: 5 }).map((_, i) => makeLevel(i))
  }, [seed])

  const [levelIndex, setLevelIndex] = useState(0)
  const level = levels[levelIndex]

  const [revealed, setRevealed] = useState(false)
  const [picked, setPicked] = useState<OutfitId | null>(null)
  const [pointsBalance, setPointsBalance] = useState(0)
  const [earnedToday, setEarnedToday] = useState(0)
  const [dailyCap, setDailyCap] = useState(1000)

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/auth/student/me", { cache: "no-store" })
        const data = (await res.json().catch(() => ({ ok: false }))) as MeResponse
        if (res.ok && data.ok) {
          setPointsBalance(data.student.pointsBalance)
          setEarnedToday(data.student.earnedToday)
          setDailyCap(data.student.dailyCap)
        }
      } catch {
        // ignore
      }
    }
    run()
  }, [])

  const correctOutfit = revealed ? level.correctOutfitId : null
  const activeBranchKey = picked && revealed ? level.correctBranchKey : null

  const resetLevelUi = () => {
    setRevealed(false)
    setPicked(null)
    showToast(null)
  }

  const reveal = () => {
    setRevealed(true)
    showToast("天气出现了！现在可以用 if / else if / else 做判断。")
  }

  const pick = (id: OutfitId) => {
    if (picked) return
    if (!revealed) {
      showToast("先点“查看天气”，再做选择。", 1800)
      return
    }
    setPicked(id)
    const isCorrect = id === correctOutfit
    const reward = level.rewardByOutfit[id]
    if (isCorrect) {
      void (async () => {
        try {
          const res = await fetch("/api/auth/student/earn", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ points: reward })
          })
          const data = (await res.json().catch(() => ({ ok: false }))) as EarnResponse
          if (!res.ok || !data.ok) {
            showToast(
              data && "error" in data && data.error
                ? data.error
                : "请先登录再领取积分。",
              2000
            )
            return
          }
          setPointsBalance(data.pointsBalance)
          setEarnedToday(data.earnedToday)
          setDailyCap(data.dailyCap)
          if (data.added > 0) {
            const clipped = data.added !== reward
            showToast(
              clipped
                ? `今日积分接近上限，获得 +${data.added} 积分（上限 ${data.dailyCap}/天）。`
                : `正确！获得 +${data.added} 积分。`
            )
          } else {
            showToast(`今日已达到 ${data.dailyCap} 积分上限，明天再来吧！`)
          }
        } catch {
          showToast("网络错误：领取积分失败。", 2000)
        }
      })()
    } else {
      showToast("差一点！看右边规则卡再试试。")
    }
  }

  const next = () => {
    if (levelIndex >= levels.length - 1) return
    setLevelIndex(i => i + 1)
    resetLevelUi()
  }

  const newRun = () => {
    setSeed(randomSeed())
    setLevelIndex(0)
    resetLevelUi()
  }

  const finished = levelIndex === levels.length - 1 && picked != null

  return (
    <div className="grid gap-4">
      <div className="rounded-[2rem] border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              ⛅️ 天气穿搭师 · 点击版
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
              {level.title}
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              {level.story}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-3xl border border-black/5 bg-white/60 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5 sm:min-w-56 sm:flex-col sm:items-end sm:justify-center">
            <div className="flex w-full items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                积分
              </div>
              <div className="text-xl font-extrabold tabular-nums">{pointsBalance}</div>
            </div>
            <div className="mt-1 w-full text-right text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              今日已得 {earnedToday}/{dailyCap}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-black/5 bg-white/60 p-5 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              天气
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-zinc-800 dark:text-zinc-100">
                {revealed ? (
                  <>
                    <span className="text-2xl" aria-hidden>
                      {weatherEmoji(level.scenario.weather)}
                    </span>{" "}
                    <span className="font-extrabold">{level.scenario.weather}</span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {" "}
                      ·{" "}
                    </span>
                    <span className="font-extrabold tabular-nums">
                      {level.scenario.tempC}°C
                    </span>
                  </>
                ) : (
                  <span className="font-extrabold">未显示</span>
                )}
              </div>
              <button
                type="button"
                onClick={reveal}
                disabled={revealed}
                className="inline-flex h-10 items-center justify-center rounded-2xl bg-zinc-950 px-4 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {revealed ? "已查看" : "查看天气"}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {level.outfits.map(o => {
                const isPicked = picked === o.id
                const isCorrect =
                  picked && correctOutfit ? o.id === correctOutfit : false
                const border =
                  picked == null
                    ? "border-black/10 dark:border-white/10"
                    : isPicked && isCorrect
                      ? "border-emerald-500/40"
                      : isPicked && !isCorrect
                        ? "border-red-500/35"
                        : "border-black/5 dark:border-white/10"
                const bg =
                  picked == null
                    ? "bg-white/70 dark:bg-zinc-950/30"
                    : isPicked && isCorrect
                      ? "bg-emerald-500/10"
                      : isPicked && !isCorrect
                        ? "bg-red-500/10"
                        : "bg-white/50 dark:bg-white/5"

                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => pick(o.id)}
                    className={[
                      "group rounded-3xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed",
                      border,
                      bg
                    ].join(" ")}
                    disabled={picked != null}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      方案 {o.id}
                    </div>
                    <div className="mt-2 flex items-start gap-2">
                      <div className="text-3xl" aria-hidden>
                        {o.emoji}
                      </div>
                      <div className="min-w-0">
                        <div className="whitespace-normal break-words text-sm font-extrabold leading-snug text-zinc-900 dark:text-white">
                          {o.title}
                        </div>
                        <div className="mt-0.5 whitespace-normal break-words text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                          {o.desc}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {picked == null
                        ? "奖励已隐藏"
                        : isPicked
                          ? `选择后获得: +${level.rewardByOutfit[o.id]} 积分`
                          : "未选择"}
                    </div>
                  </button>
                )
              })}
            </div>

            {toast ? (
              <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-black/5 bg-zinc-950/5 px-4 py-3 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
                <div>{toast}</div>
                <button
                  type="button"
                  onClick={() => showToast(null)}
                  className="shrink-0 rounded-lg border border-black/10 bg-white/60 px-2 py-1 text-xs font-semibold text-zinc-800 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-zinc-100 dark:hover:bg-white/10"
                  aria-label="关闭提示"
                >
                  关闭
                </button>
              </div>
            ) : null}
          </div>

          <RuleCard branches={level.branches} activeBranchKey={activeBranchKey} />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/games/weather-outfit`}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-5 text-sm font-extrabold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            返回
          </Link>
          <button
            type="button"
            onClick={resetLevelUi}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-5 text-sm font-extrabold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            重试本关
          </button>
          <button
            type="button"
            onClick={newRun}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-5 text-sm font-extrabold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            随机一局
          </button>

          {picked ? (
            levelIndex < levels.length - 1 ? (
              <button
                type="button"
                onClick={next}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                下一关
              </button>
            ) : null
          ) : null}
        </div>

        {finished ? (
          <div className="mt-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-sm text-emerald-900 dark:text-emerald-100">
            <div className="text-xs font-semibold uppercase tracking-wider opacity-70">
              通关总结
            </div>
            <div className="mt-2 font-extrabold">
              你已经用 if / else if / else 做了 {levels.length} 次选择！
            </div>
            <div className="mt-2 text-emerald-800/90 dark:text-emerald-100/90">
              先看天气和温度 → 按条件判断 → 选择穿搭，这就是“分支”。积分由老师统一兑换星空币。
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
