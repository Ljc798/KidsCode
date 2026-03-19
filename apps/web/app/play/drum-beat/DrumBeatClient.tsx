"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"

type EarnResponse =
  | { ok: true; added: number; pointsBalance: number; earnedToday: number; dailyCap: number }
  | { ok: false; error?: string }

type MeResponse =
  | { ok: true; student: { pointsBalance: number; earnedToday: number; dailyCap: number } }
  | { ok: false }

type Beat = "DON" | "PA" | "REST"

type Level = {
  id: string
  title: string
  story: string
  pattern: Beat[]
  repeats: number
  reward: number
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

function beatLabel(b: Beat) {
  if (b === "DON") return "咚"
  if (b === "PA") return "啪"
  return "停"
}

function beatEmoji(b: Beat) {
  if (b === "DON") return "🥁"
  if (b === "PA") return "🪘"
  return "·"
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(n)))
}

function CodeCard({
  patternLen,
  repeats,
  activeLine
}: {
  patternLen: number
  repeats: number
  activeLine: number | null
}) {
  const lines = [
    `Beat pattern[${patternLen}] = {...};`,
    `for (int round = 0; round < ${repeats}; round++) {`,
    `  for (int i = 0; i < ${patternLen}; i++) {`,
    `    play(pattern[i]);`,
    `  }`,
    `}`
  ]
  return (
    <div className="rounded-3xl border border-black/5 bg-white/60 p-5 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        循环规则 (嵌套循环)
      </div>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-black/10 bg-white/70 p-3 font-mono text-[13px] leading-6 text-zinc-800 whitespace-pre dark:border-white/10 dark:bg-zinc-950/30 dark:text-zinc-100">
        {lines.map((line, i) => {
          const active = activeLine === i
          return (
            <div
              key={i}
              className={[
                "rounded-lg px-2",
                active ? "bg-emerald-500/10 ring-1 ring-emerald-500/20" : ""
              ].join(" ")}
            >
              {line}
            </div>
          )
        })}
      </div>
      <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        一个小节要循环很多次时，用外层循环控制“重复几轮”。
      </div>
    </div>
  )
}

function Chip({ label, active }: { label: string; active?: boolean }) {
  return (
    <div
      className={[
        "rounded-2xl border px-3 py-2 text-sm font-extrabold",
        active
          ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
          : "border-black/10 bg-white/70 text-zinc-800 dark:border-white/10 dark:bg-zinc-950/30 dark:text-zinc-100"
      ].join(" ")}
    >
      {label}
    </div>
  )
}

export default function DrumBeatClient() {
  const [seed, setSeed] = useState<number>(() => randomSeed())

  const levels = useMemo<Level[]>(() => {
    const rand = mulberry32(seed)
    const genPattern = (len: number) => {
      const beats: Beat[] = []
      const pool: Beat[] = ["DON", "PA", "REST"]
      while (beats.length < len) beats.push(pool[Math.floor(rand() * pool.length)]!)
      if (!beats.includes("DON")) beats[0] = "DON"
      if (!beats.includes("PA")) beats[Math.min(1, len - 1)] = "PA"
      return beats
    }
    return [
      {
        id: "L1",
        title: "第一关：两拍一停",
        story: "把节奏小节循环 2 次，按顺序敲出来。",
        pattern: genPattern(3),
        repeats: 2,
        reward: 30
      },
      {
        id: "L2",
        title: "第二关：四拍循环",
        story: "小节变长了，用循环更容易不出错。",
        pattern: genPattern(4),
        repeats: 2,
        reward: 40
      },
      {
        id: "L3",
        title: "第三关：更长的节拍",
        story: "挑战 3 轮循环。把每一拍都敲对就通关。",
        pattern: genPattern(5),
        repeats: 3,
        reward: 70
      }
    ]
  }, [seed])

  const [levelIndex, setLevelIndex] = useState(0)
  const level = levels[levelIndex]
  const expected = useMemo(() => {
    const out: Beat[] = []
    for (let r = 0; r < level.repeats; r++) out.push(...level.pattern)
    return out
  }, [level])

  const [pointsBalance, setPointsBalance] = useState(0)
  const [earnedToday, setEarnedToday] = useState(0)
  const [dailyCap, setDailyCap] = useState(1000)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  const [cursor, setCursor] = useState(0)
  const [history, setHistory] = useState<Beat[]>([])
  const [activeLine, setActiveLine] = useState<number | null>(null)
  const [finished, setFinished] = useState(false)
  const [demoRunning, setDemoRunning] = useState(false)
  const demoTimerRef = useRef<number | null>(null)

  const round = Math.floor(cursor / level.pattern.length)
  const stepInRound = cursor % level.pattern.length

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

  useEffect(() => {
    return () => {
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current)
      if (demoTimerRef.current != null) window.clearTimeout(demoTimerRef.current)
      toastTimerRef.current = null
      demoTimerRef.current = null
    }
  }, [])

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
      }
    }
    run()
  }, [])

  const reset = ({ keepToast }: { keepToast?: boolean } = {}) => {
    setCursor(0)
    setHistory([])
    setFinished(false)
    setActiveLine(null)
    if (!keepToast) showToast(null)
    setDemoRunning(false)
    if (demoTimerRef.current != null) {
      window.clearTimeout(demoTimerRef.current)
      demoTimerRef.current = null
    }
  }

  const gotoLevel = (idx: number) => {
    reset()
    setLevelIndex(idx)
  }

  const award = async () => {
    try {
      const res = await fetch("/api/auth/student/earn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: level.reward })
      })
      const data = (await res.json().catch(() => ({ ok: false }))) as EarnResponse
      if (!res.ok || !data.ok) {
        showToast(data && "error" in data && data.error ? data.error : "请先登录再领取积分。", 2000)
        return
      }
      setPointsBalance(data.pointsBalance)
      setEarnedToday(data.earnedToday)
      setDailyCap(data.dailyCap)
      if (data.added > 0) {
        const clipped = data.added !== level.reward
        showToast(
          clipped
            ? `今日积分接近上限，获得 +${data.added} 积分（上限 ${data.dailyCap}/天）。`
            : `通关！获得 +${data.added} 积分。`
        )
      } else {
        showToast(`今日已达到 ${data.dailyCap} 积分上限，明天再来吧！`)
      }
    } catch {
      showToast("网络错误：领取积分失败。", 2000)
    }
  }

  const updateActiveLine = (nextCursor: number) => {
    if (nextCursor === 0) {
      setActiveLine(0)
      return
    }
    const nextRound = Math.floor(nextCursor / level.pattern.length)
    const nextStep = nextCursor % level.pattern.length
    setActiveLine(2)
    if (nextRound >= 0 && nextRound < level.repeats) {
      setActiveLine(2)
      if (nextStep === 0) setActiveLine(1)
    }
    setActiveLine(3)
  }

  const hit = async (b: Beat) => {
    if (demoRunning) return
    if (finished) {
      showToast("已经通关啦，去下一关吧。", 1600)
      return
    }
    if (cursor >= expected.length) return

    const need = expected[cursor]!
    setActiveLine(1)
    await new Promise<void>(resolve => window.setTimeout(resolve, 60))
    setActiveLine(2)
    await new Promise<void>(resolve => window.setTimeout(resolve, 60))
    setActiveLine(3)

    if (b !== need) {
      showToast(`这一拍应该是「${beatLabel(need)}」，你按成了「${beatLabel(b)}」。`, 2200)
      setCursor(0)
      setHistory([])
      setActiveLine(null)
      return
    }

    const nextCursor = cursor + 1
    setHistory(h => [...h, b])
    setCursor(nextCursor)
    updateActiveLine(nextCursor)

    if (nextCursor >= expected.length) {
      setFinished(true)
      setActiveLine(null)
      await award()
    }
  }

  const playDemo = () => {
    if (demoRunning) return
    reset({ keepToast: true })
    setDemoRunning(true)
    showToast("演示开始：看节奏如何被循环重复。")

    let i = 0
    const tick = () => {
      if (i >= expected.length) {
        setDemoRunning(false)
        reset({ keepToast: true })
        showToast("演示结束：已经重置，轮到你来敲！", 2200)
        return
      }
      const b = expected[i]!
      setHistory(h => [...h, b])
      const nextCursor = i + 1
      setCursor(nextCursor)
      updateActiveLine(nextCursor)
      i++
      demoTimerRef.current = window.setTimeout(tick, 480)
    }
    demoTimerRef.current = window.setTimeout(tick, 480)
  }

  const percent = expected.length === 0 ? 0 : Math.round((cursor / expected.length) * 100)
  const canNext = finished && levelIndex < levels.length - 1

  return (
    <div className="grid gap-4">
      <div className="rounded-[2rem] border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              🥁 节奏小鼓手 · 循环版
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight">{level.title}</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{level.story}</p>
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
          <div className="grid gap-4">
            <div className="rounded-3xl border border-black/5 bg-white/60 p-5 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-zinc-800 dark:text-zinc-100">
                  小节：{" "}
                  <span className="font-extrabold">
                    {level.pattern.map(beatLabel).join(" ")}
                  </span>{" "}
                  · 循环{" "}
                  <span className="font-extrabold tabular-nums">{level.repeats}</span>{" "}
                  次
                </div>
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  进度 {percent}%
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {level.pattern.map((b, i) => (
                  <Chip key={i} label={`${beatEmoji(b)} ${beatLabel(b)}`} active={demoRunning && i === stepInRound} />
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-black/5 bg-white/70 px-4 py-3 text-sm text-zinc-700 dark:border-white/10 dark:bg-zinc-950/30 dark:text-zinc-200">
                当前：第{" "}
                <span className="font-extrabold tabular-nums">
                  {clampInt(round + 1, 1, level.repeats)}
                </span>{" "}
                轮 · 第{" "}
                <span className="font-extrabold tabular-nums">
                  {clampInt(stepInRound + 1, 1, level.pattern.length)}
                </span>{" "}
                拍 · 已完成{" "}
                <span className="font-extrabold tabular-nums">
                  {cursor}/{expected.length}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {(["DON", "PA", "REST"] as const).map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => void hit(b)}
                    disabled={demoRunning}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-4 text-sm font-extrabold text-zinc-900 shadow-sm transition hover:bg-white disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  >
                    {beatEmoji(b)} {beatLabel(b)}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={playDemo}
                  disabled={demoRunning}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  {demoRunning ? "演示中..." : "一键演示"}
                </button>
                <button
                  type="button"
                  onClick={() => reset()}
                  disabled={demoRunning}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-5 text-sm font-extrabold text-zinc-900 hover:bg-white disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  重置
                </button>
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

            <div className="rounded-3xl border border-black/5 bg-white/60 p-5 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                你敲的节拍
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {history.length === 0 ? (
                  <div className="text-sm text-zinc-600 dark:text-zinc-300">还没开始。</div>
                ) : (
                  history.slice(-20).map((b, i) => (
                    <Chip key={`${i}-${b}`} label={`${beatEmoji(b)} ${beatLabel(b)}`} />
                  ))
                )}
              </div>
            </div>
          </div>

          <CodeCard patternLen={level.pattern.length} repeats={level.repeats} activeLine={activeLine} />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/games/drum-beat"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-5 text-sm font-extrabold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            返回
          </Link>
          <button
            type="button"
            onClick={() => {
              setSeed(randomSeed())
              gotoLevel(0)
            }}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-5 text-sm font-extrabold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            随机一局
          </button>
          {canNext ? (
            <button
              type="button"
              onClick={() => gotoLevel(levelIndex + 1)}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              下一关
            </button>
          ) : levelIndex === levels.length - 1 && finished ? (
            <button
              type="button"
              onClick={() => gotoLevel(0)}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              再玩一遍
            </button>
          ) : null}
        </div>

        {levelIndex === levels.length - 1 && finished ? (
          <div className="mt-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-sm text-emerald-900 dark:text-emerald-100">
            <div className="text-xs font-semibold uppercase tracking-wider opacity-70">通关总结</div>
            <div className="mt-2 font-extrabold">你把节奏循环敲得又稳又准！</div>
            <div className="mt-2 text-emerald-800/90 dark:text-emerald-100/90">
              外层循环控制重复轮数，内层循环播放小节里的每一拍，这就是“嵌套循环”。
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
