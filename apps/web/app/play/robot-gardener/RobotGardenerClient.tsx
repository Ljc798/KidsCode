"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"

type EarnResponse =
  | { ok: true; added: number; pointsBalance: number; earnedToday: number; dailyCap: number }
  | { ok: false; error?: string }

type MeResponse =
  | { ok: true; student: { pointsBalance: number; earnedToday: number; dailyCap: number } }
  | { ok: false }

type Operation = "ROW" | "COL" | "ALL"

type Level = {
  id: string
  title: string
  story: string
  target: Set<number>
  targetHint: { kind: "ROW" | "COL" | "ALL"; index?: number }
  reward: number
  maxActions: number
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(n)))
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

function gridIndex(r: number, c: number, size: number) {
  return r * size + c
}

function makeTargetRow(row: number, size: number) {
  const s = new Set<number>()
  for (let c = 0; c < size; c++) s.add(gridIndex(row, c, size))
  return s
}

function makeTargetCol(col: number, size: number) {
  const s = new Set<number>()
  for (let r = 0; r < size; r++) s.add(gridIndex(r, col, size))
  return s
}

function makeTargetAll(size: number) {
  const s = new Set<number>()
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) s.add(gridIndex(r, c, size))
  return s
}

function setEqual(a: Set<number>, b: Set<number>) {
  if (a.size !== b.size) return false
  for (const x of a) if (!b.has(x)) return false
  return true
}

function CodeCard({
  op,
  row,
  col,
  running,
  activeStep
}: {
  op: Operation
  row: number
  col: number
  running: boolean
  activeStep: number | null
}) {
  const header =
    op === "ROW" ? "种一行 (for)" : op === "COL" ? "种一列 (for)" : "种整个花园 (双重循环)"
  const body =
    op === "ROW"
      ? [
          `for (int c = 0; c < 5; c++) {`,
          `  plant(${row + 1}, c + 1);`,
          `}`
        ]
      : op === "COL"
        ? [
            `for (int r = 0; r < 5; r++) {`,
            `  plant(r + 1, ${col + 1});`,
            `}`
          ]
        : [
            `for (int r = 0; r < 5; r++) {`,
            `  for (int c = 0; c < 5; c++) {`,
            `    plant(r + 1, c + 1);`,
            `  }`,
            `}`
          ]
  return (
    <div className="rounded-3xl border border-black/5 bg-white/60 p-5 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        循环规则
      </div>
      <div className="mt-3">
        <div className="text-sm font-extrabold text-zinc-900 dark:text-white">{header}</div>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-black/10 bg-white/70 p-3 font-mono text-[13px] leading-6 text-zinc-800 whitespace-pre dark:border-white/10 dark:bg-zinc-950/30 dark:text-zinc-100">
          {body.map((line, i) => {
            const active = running && activeStep === i
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
      </div>
    </div>
  )
}

function Garden({
  size,
  planted,
  target,
  activeIndex,
  flower
}: {
  size: number
  planted: Set<number>
  target: Set<number>
  activeIndex: number | null
  flower: string
}) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white/60 p-5 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          花园
        </div>
        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          {planted.size}/{target.size}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {Array.from({ length: size * size }).map((_, idx) => {
          const isTarget = target.has(idx)
          const isPlanted = planted.has(idx)
          const isActive = activeIndex === idx
          const border = isActive
            ? "border-emerald-500/40 ring-2 ring-emerald-500/20"
            : isTarget
              ? "border-amber-500/25"
              : "border-black/10 dark:border-white/10"
          const bg = isPlanted
            ? "bg-emerald-500/10"
            : isTarget
              ? "bg-amber-500/5"
              : "bg-white/70 dark:bg-zinc-950/30"
          const value = isPlanted ? flower : "·"
          return (
            <div
              key={idx}
              className={[
                "flex h-11 items-center justify-center rounded-2xl border text-sm font-extrabold",
                border,
                bg,
                "text-zinc-800 dark:text-zinc-100"
              ].join(" ")}
            >
              {value}
            </div>
          )
        })}
      </div>
      <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        黄色边框是蓝图位置，种对才算通关。
      </div>
    </div>
  )
}

export default function RobotGardenerClient() {
  const size = 5
  const [seed, setSeed] = useState<number>(() => randomSeed())
  const rand = useMemo(() => mulberry32(seed), [seed])
  const flower = useMemo(() => {
    const options = ["🌷", "🌻", "🌼", "🪻", "🌹"]
    return options[Math.floor(rand() * options.length)]!
  }, [rand])

  const levels = useMemo<Level[]>(() => {
    const rowTarget = Math.floor(rand() * size)
    const colTarget = Math.floor(rand() * size)
    return [
      {
        id: "L1",
        title: "第一关：种一整行",
        story: "用 for 循环从左到右，把一行花全部种满。",
        target: makeTargetRow(rowTarget, size),
        targetHint: { kind: "ROW", index: rowTarget },
        reward: 30,
        maxActions: 2
      },
      {
        id: "L2",
        title: "第二关：种一整列",
        story: "用 for 循环从上到下，把一列花全部种满。",
        target: makeTargetCol(colTarget, size),
        targetHint: { kind: "COL", index: colTarget },
        reward: 40,
        maxActions: 2
      },
      {
        id: "L3",
        title: "第三关：全园种满",
        story: "双重循环可以一次种满整个花园。",
        target: makeTargetAll(size),
        targetHint: { kind: "ALL" },
        reward: 60,
        maxActions: 1
      }
    ]
  }, [rand])

  const [levelIndex, setLevelIndex] = useState(0)
  const level = levels[levelIndex]

  const [pointsBalance, setPointsBalance] = useState(0)
  const [earnedToday, setEarnedToday] = useState(0)
  const [dailyCap, setDailyCap] = useState(1000)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  const [planted, setPlanted] = useState<Set<number>>(() => new Set())
  const [op, setOp] = useState<Operation>("ROW")
  const [row, setRow] = useState(0)
  const [col, setCol] = useState(0)
  const [actionsUsed, setActionsUsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const [finished, setFinished] = useState(false)

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
      if (toastTimerRef.current != null) {
        window.clearTimeout(toastTimerRef.current)
        toastTimerRef.current = null
      }
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

  const reset = () => {
    setPlanted(new Set())
    setActionsUsed(0)
    setRunning(false)
    setActiveIndex(null)
    setActiveStep(null)
    setFinished(false)
    showToast(null)
  }

  const gotoLevel = (idx: number) => {
    setLevelIndex(idx)
    reset()
    setOp("ROW")
    setRow(0)
    setCol(0)
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

  const execute = async () => {
    if (running) return
    if (finished) {
      showToast("已经通关啦，去下一关吧。", 1600)
      return
    }
    if (actionsUsed >= level.maxActions) {
      showToast("操作次数用完了，点“重置”再来。", 1800)
      return
    }
    setRunning(true)
    setActionsUsed(n => n + 1)
    showToast("开始种花！看循环一步步执行。")

    const cur = new Set(planted)
    const plant = async (r: number, c: number) => {
      const idx = gridIndex(r, c, size)
      setActiveIndex(idx)
      cur.add(idx)
      setPlanted(new Set(cur))
      await new Promise<void>(resolve => window.setTimeout(resolve, 260))
    }

    if (op === "ROW") {
      setActiveStep(0)
      await new Promise<void>(resolve => window.setTimeout(resolve, 180))
      for (let c = 0; c < size; c++) {
        setActiveStep(1)
        await plant(row, c)
      }
      setActiveStep(2)
      await new Promise<void>(resolve => window.setTimeout(resolve, 180))
    } else if (op === "COL") {
      setActiveStep(0)
      await new Promise<void>(resolve => window.setTimeout(resolve, 180))
      for (let r = 0; r < size; r++) {
        setActiveStep(1)
        await plant(r, col)
      }
      setActiveStep(2)
      await new Promise<void>(resolve => window.setTimeout(resolve, 180))
    } else {
      setActiveStep(0)
      await new Promise<void>(resolve => window.setTimeout(resolve, 180))
      for (let r = 0; r < size; r++) {
        setActiveStep(1)
        await new Promise<void>(resolve => window.setTimeout(resolve, 140))
        for (let c = 0; c < size; c++) {
          setActiveStep(2)
          await plant(r, c)
        }
        setActiveStep(3)
        await new Promise<void>(resolve => window.setTimeout(resolve, 140))
      }
      setActiveStep(4)
      await new Promise<void>(resolve => window.setTimeout(resolve, 180))
    }

    setActiveIndex(null)
    setRunning(false)

    if (setEqual(cur, level.target)) {
      setFinished(true)
      await award()
      return
    }

    if (cur.size >= level.target.size) {
      showToast("和蓝图不一样。调整操作或点“重置”重新来。", 2000)
    } else {
      showToast("还没种完，再执行一次循环。", 1600)
    }
  }

  const canNext = finished && levelIndex < levels.length - 1

  return (
    <div className="grid gap-4">
      <div className="rounded-[2rem] border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              🤖 机器人园丁 · 循环版
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
            <Garden
              size={size}
              planted={planted}
              target={level.target}
              activeIndex={activeIndex}
              flower={flower}
            />

            <div className="rounded-3xl border border-black/5 bg-white/60 p-5 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-zinc-800 dark:text-zinc-100">
                  操作次数{" "}
                  <span className="font-extrabold tabular-nums">
                    {actionsUsed}/{level.maxActions}
                  </span>
                </div>
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  用循环一次种一片
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 text-sm">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    操作
                  </span>
                  <select
                    value={op}
                    onChange={e => setOp(e.target.value as Operation)}
                    disabled={running}
                    className="h-10 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 disabled:opacity-50 dark:border-white/10 dark:bg-zinc-950/30"
                  >
                    <option value="ROW">种一行</option>
                    <option value="COL">种一列</option>
                    <option value="ALL">种整个花园</option>
                  </select>
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    行号
                  </span>
                  <select
                    value={row}
                    onChange={e => setRow(clampInt(Number(e.target.value), 0, 4))}
                    disabled={running || op === "COL" || op === "ALL"}
                    className="h-10 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 disabled:opacity-50 dark:border-white/10 dark:bg-zinc-950/30"
                  >
                    <option value={0}>1</option>
                    <option value={1}>2</option>
                    <option value={2}>3</option>
                    <option value={3}>4</option>
                    <option value={4}>5</option>
                  </select>
                </label>

                <label className="grid gap-1 text-sm">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    列号
                  </span>
                  <select
                    value={col}
                    onChange={e => setCol(clampInt(Number(e.target.value), 0, 4))}
                    disabled={running || op === "ROW" || op === "ALL"}
                    className="h-10 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 disabled:opacity-50 dark:border-white/10 dark:bg-zinc-950/30"
                  >
                    <option value={0}>1</option>
                    <option value={1}>2</option>
                    <option value={2}>3</option>
                    <option value={3}>4</option>
                    <option value={4}>5</option>
                  </select>
                </label>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void execute()}
                  disabled={running}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  {running ? "执行中..." : "执行循环"}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  disabled={running}
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
          </div>

          <CodeCard op={op} row={row} col={col} running={running} activeStep={activeStep} />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/games/robot-gardener"
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
            <div className="mt-2 font-extrabold">你用循环把花园种得整整齐齐！</div>
            <div className="mt-2 text-emerald-800/90 dark:text-emerald-100/90">
              需要“重复做很多次”的任务，最适合用循环一次搞定。
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
