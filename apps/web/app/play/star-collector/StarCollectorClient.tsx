"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"

type EarnResponse =
  | { ok: true; added: number; pointsBalance: number; earnedToday: number; dailyCap: number }
  | { ok: false; error?: string }

type MeResponse =
  | { ok: true; student: { pointsBalance: number; earnedToday: number; dailyCap: number } }
  | { ok: false }

type RunState = "PLAYING" | "WIN" | "LOSE"

type Puzzle = {
  id: string
  title: string
  story: string
  size: number
  start: number
  end: number
  starPositions: number[]
  loopLens: number[]
  runsBudget: number
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

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(n)))
}

function uniq(items: number[]) {
  return Array.from(new Set(items))
}

function minStepsToCoverAllAndFinish(puzzle: Puzzle) {
  const points = [puzzle.start, puzzle.end, ...puzzle.starPositions]
  let left = points[0]!
  let right = points[0]!
  for (const p of points) {
    left = Math.min(left, p)
    right = Math.max(right, p)
  }
  const span = right - left
  const stepsA = Math.abs(puzzle.start - left) + span + Math.abs(puzzle.end - right)
  const stepsB = Math.abs(puzzle.start - right) + span + Math.abs(puzzle.end - left)
  return Math.min(stepsA, stepsB)
}

function hasSolutionExact(puzzle: Puzzle) {
  const starIndex = new Map<number, number>()

  for (let i = 0; i < puzzle.starPositions.length; i++) {
    const p = puzzle.starPositions[i]
    if (p !== puzzle.start && p !== puzzle.end) {
      starIndex.set(p, i)
    }
  }

  const starCount = starIndex.size
  const allMask = (1 << starCount) - 1

  const memo = new Map<string, boolean>()

  function dfs(pos: number, runsLeft: number, mask: number): boolean {
    const key = pos + "|" + runsLeft + "|" + mask
    if (memo.has(key)) return memo.get(key)!

    if (mask === 0 && pos === puzzle.end) {
      memo.set(key, true)
      return true
    }

    if (runsLeft === 0) {
      memo.set(key, false)
      return false
    }

    for (const dir of [-1, 1]) {
      for (const len of puzzle.loopLens) {
        let curPos = pos
        let curMask = mask
        let ok = true

        for (let i = 0; i < len; i++) {
          curPos += dir

          if (curPos < 0 || curPos >= puzzle.size) {
            ok = false
            break
          }

          const idx = starIndex.get(curPos)
          if (idx != null) {
            curMask &= ~(1 << idx)
          }

          if (curMask === 0 && curPos === puzzle.end) {
            memo.set(key, true)
            return true
          }
        }

        if (!ok) continue

        if (dfs(curPos, runsLeft - 1, curMask)) {
          memo.set(key, true)
          return true
        }
      }
    }

    memo.set(key, false)
    return false
  }

  return dfs(puzzle.start, puzzle.runsBudget, allMask)
}

function createRandomPuzzle(rng: () => number, level: number): Puzzle {
  const size = 10 + Math.min(level, 6)

  const start = Math.floor(rng() * size)

  let end = Math.floor(rng() * size)
  while (Math.abs(end - start) < 3) {
    end = Math.floor(rng() * size)
  }

  const starCount = Math.min(1 + Math.floor(level / 2), 3)

  const stars: number[] = []

  while (stars.length < starCount) {
    const p = Math.floor(rng() * size)

    if (p === start || p === end) continue

    stars.push(p)
  }

  return {
    id: "level-" + level + "-" + Math.floor(rng() * 100000),
    title: "星星收集器",
    story: "用循环控制火箭移动，收集所有星星并到达终点。",
    size,
    start,
    end,

    starPositions: uniq(stars),

    loopLens: level < 3 ? [1, 2] : [1, 2, 3, 4],

    runsBudget: level < 3 ? 2 : 3,

    reward: 5 + level
  }
}

export function generatePuzzle(level: number): Puzzle {

  const size = 10 + Math.min(level, 6)

  const loopLens = level < 3 ? [1,2] : [1,2,3]
  const runsBudget = level < 3 ? 2 : 3

  const start = Math.floor(Math.random()*size)

  let pos = start

  const stars:number[] = []

  const path:number[] = [start]

  for (let r=0;r<runsBudget;r++){

    const dir = Math.random()<0.5 ? -1 : 1
    const len = loopLens[Math.floor(Math.random()*loopLens.length)]

    for (let i=0;i<len;i++){

      pos += dir

      if (pos<=0) pos=0
      if (pos>=size-1) pos=size-1

      path.push(pos)

      if (Math.random()<0.3){
        stars.push(pos)
      }
    }
  }

  const end = pos

  const starPositions = Array.from(new Set(stars))
    .filter(p=>p!==start && p!==end)

  return {

    id: "level-"+Date.now(),

    title:"星星收集器",
    story:"使用循环控制火箭收集星星",

    size,
    start,
    end,

    starPositions,

    loopLens,
    runsBudget,

    reward:5+level
  }
}

function Chip({
  label,
  active,
  disabled,
  onClick
}: {
  label: string
  active: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex h-10 items-center justify-center rounded-2xl border px-4 text-sm font-extrabold shadow-sm transition disabled:opacity-50",
        active
          ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
          : "border-black/10 bg-white/60 text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
      ].join(" ")}
    >
      {label}
    </button>
  )
}

function CodeCard({
  loopLen,
  runsLeft,
  running,
  activeLine
}: {
  loopLen: number
  runsLeft: number
  running: boolean
  activeLine: number | null
}) {
  const lines = [
    `for (int i = 0; i < ${loopLen}; i++) {`,
    `  moveOneStep();`,
    `  collectStarIfAny();`,
    `}`
  ]
  return (
    <div className="min-w-0 rounded-3xl border border-black/5 bg-white/60 p-5 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        循环规则 (for)
      </div>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-black/10 bg-white/70 p-3 font-mono text-[13px] leading-6 text-zinc-800 whitespace-pre dark:border-white/10 dark:bg-zinc-950/30 dark:text-zinc-100">
        {lines.map((line, i) => {
          const active = running && activeLine === i
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
        每执行一次循环会消耗 1 次机会。剩余 {runsLeft} 次。
      </div>
    </div>
  )
}

function Track({
  puzzle,
  pos,
  stars,
  revealed
}: {
  puzzle: Puzzle
  pos: number
  stars: Set<number>
  revealed: boolean
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-black/5 bg-white/60 p-5 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          跑道
        </div>
        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          {pos + 1}/{puzzle.size}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-12">
        {Array.from({ length: puzzle.size }).map((_, i) => {
          const isHere = i === pos
          const isStart = i === puzzle.start
          const isEnd = i === puzzle.end
          const isStar = stars.has(i)
          const border = isHere
            ? "border-zinc-950 dark:border-white"
            : isEnd && revealed
              ? "border-emerald-500/35"
              : "border-black/10 dark:border-white/10"
          const bg = isHere
            ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
            : "bg-white/70 text-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-100"
          const value = isHere
            ? "🚀"
            : revealed && isEnd
              ? "🏁"
              : revealed && isStar
                ? "⭐️"
                : isStart
                  ? "S"
                  : "·"
          return (
            <div
              key={i}
              className={[
                "flex aspect-square w-full items-center justify-center rounded-2xl border text-[13px] font-extrabold",
                border,
                bg
              ].join(" ")}
            >
              {value}
            </div>
          )
        })}
      </div>

      <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        从 S 出发。先点“查看线索”才能看到🏁和⭐️。每次执行循环都会从当前位置继续走。
      </div>
    </div>
  )
}

function StarCollectorRun({
  puzzle,
  award,
  onGotoLevel,
  onNewRun,
  levelIndex,
  levelCount
}: {
  puzzle: Puzzle
  award: (points: number) => Promise<EarnResponse>
  onGotoLevel: (idx: number) => void
  onNewRun: () => void
  levelIndex: number
  levelCount: number
}) {
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  const [revealed, setRevealed] = useState(false)
  const [direction, setDirection] = useState<-1 | 1>(1)
  const [loopLen, setLoopLen] = useState(puzzle.loopLens[0] ?? 2)

  const [pos, setPos] = useState(puzzle.start)
  const [stars, setStars] = useState<Set<number>>(() => {
    const s = new Set(puzzle.starPositions)
    s.delete(puzzle.start)
    return s
  })
  const [runsLeft, setRunsLeft] = useState(puzzle.runsBudget)

  const [running, setRunning] = useState(false)
  const [activeLine, setActiveLine] = useState<number | null>(null)
  const [state, setState] = useState<RunState>("PLAYING")

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

  const reset = () => {
    setRevealed(false)
    setDirection(1)
    setLoopLen(puzzle.loopLens[0] ?? 2)
    setPos(puzzle.start)
    const s = new Set(puzzle.starPositions)
    s.delete(puzzle.start)
    setStars(s)
    setRunsLeft(puzzle.runsBudget)
    setRunning(false)
    setActiveLine(null)
    setState("PLAYING")
    showToast(null)
  }

  const reveal = () => {
    setRevealed(true)
    showToast("线索出现了！选择方向和循环长度，然后执行循环。")
  }

  const tryWin = async (curPos: number, remainingStars: Set<number>) => {
    if (curPos === puzzle.end && remainingStars.size === 0) {
      const out = await award(puzzle.reward)
      if (!out.ok) {
        showToast(out.error ?? "请先登录再领取积分。", 2000)
        return false
      }
      setState("WIN")
      if (out.added > 0) {
        const clipped = out.added !== puzzle.reward
        showToast(
          clipped
            ? `今日积分接近上限，获得 +${out.added} 积分（上限 ${out.dailyCap}/天）。`
            : `通关！获得 +${out.added} 积分。`
        )
      } else {
        showToast(`今日已达到 ${out.dailyCap} 积分上限，明天再来吧！`)
      }
      return true
    }
    return false
  }

  const runOnce = async () => {
    if (running) return
    if (state !== "PLAYING") {
      showToast(state === "WIN" ? "已经通关啦，去下一关吧。" : "这局失败了，点“重置”再来。", 2000)
      return
    }
    if (!revealed) {
      showToast("先点“查看线索”，再执行循环。", 1800)
      return
    }
    if (runsLeft <= 0) {
      setState("LOSE")
      showToast("机会用完了，失败！点“重置”再来。", 2200)
      return
    }

    const len = clampInt(loopLen, 1, 3)
    setLoopLen(len)
    setRunning(true)
    setActiveLine(0)

    let curPos = pos
    const remainingStars = new Set(stars)

    await new Promise<void>(resolve => window.setTimeout(resolve, 160))

    for (let i = 0; i < len; i++) {
      setActiveLine(1)
      curPos += direction
      if (curPos < 0 || curPos >= puzzle.size) {
        setRunning(false)
        setActiveLine(null)
        setState("LOSE")
        showToast("跑出跑道啦！失败，点“重置”再来。", 2400)
        return
      }
      setPos(curPos)
      await new Promise<void>(resolve => window.setTimeout(resolve, 180))

      setActiveLine(2)
      if (remainingStars.has(curPos)) {
        remainingStars.delete(curPos)
        setStars(new Set(remainingStars))
      }
      await new Promise<void>(resolve => window.setTimeout(resolve, 160))

      const won = await tryWin(curPos, remainingStars)
      if (won) {
        setRunning(false)
        setActiveLine(null)
        return
      }
    }

    setActiveLine(3)
    await new Promise<void>(resolve => window.setTimeout(resolve, 120))
    setActiveLine(null)
    setRunning(false)

    const nextRunsLeft = runsLeft - 1
    setRunsLeft(nextRunsLeft)

    if (nextRunsLeft <= 0) {
      setState("LOSE")
      showToast("机会用完了，但还没到🏁并捡完⭐️。失败！", 2600)
      return
    }

    showToast(`还剩 ${nextRunsLeft} 次机会。继续走！`, 2000)
  }

  const canNext = state === "WIN" && levelIndex < levelCount - 1
  const starsTotal = puzzle.starPositions.length
  const starsLeft = stars.size

  return (
    <>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 grid gap-4">
          <Track puzzle={puzzle} pos={pos} stars={stars} revealed={revealed} />

          <div className="min-w-0 rounded-3xl border border-black/5 bg-white/60 p-5 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-zinc-800 dark:text-zinc-100">
                星星{" "}
                <span className="font-extrabold tabular-nums">
                  {starsTotal - starsLeft}/{starsTotal}
                </span>{" "}
                · 机会{" "}
                <span className="font-extrabold tabular-nums">{runsLeft}</span>/
                <span className="font-extrabold tabular-nums">{puzzle.runsBudget}</span>
              </div>
              <button
                type="button"
                onClick={reveal}
                disabled={revealed || running || state !== "PLAYING"}
                className="inline-flex h-10 items-center justify-center rounded-2xl bg-zinc-950 px-4 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {revealed ? "已查看" : "查看线索"}
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  方向
                </div>
                <div className="flex flex-wrap gap-2">
                  <Chip
                    label="向左"
                    active={direction === -1}
                    disabled={running || state !== "PLAYING"}
                    onClick={() => setDirection(-1)}
                  />
                  <Chip
                    label="向右"
                    active={direction === 1}
                    disabled={running || state !== "PLAYING"}
                    onClick={() => setDirection(1)}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  循环长度（一次走几步）
                </div>
                <div className="flex flex-wrap gap-2">
                  {puzzle.loopLens.map(n => (
                    <Chip
                      key={n}
                      label={`${n} 步`}
                      active={loopLen === n}
                      disabled={running || state !== "PLAYING"}
                      onClick={() => setLoopLen(n)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void runOnce()}
                disabled={running}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {running ? "循环中..." : "执行循环"}
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

        <CodeCard loopLen={loopLen} runsLeft={runsLeft} running={running} activeLine={activeLine} />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/games/star-collector"
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-5 text-sm font-extrabold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
        >
          返回
        </Link>
        <button
          type="button"
          onClick={onNewRun}
          disabled={running}
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-5 text-sm font-extrabold text-zinc-900 hover:bg-white disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
        >
          随机一局
        </button>
        {canNext ? (
          <button
            type="button"
            onClick={() => onGotoLevel(levelIndex + 1)}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            下一关
          </button>
        ) : state === "WIN" && levelIndex === levelCount - 1 ? (
          <button
            type="button"
            onClick={() => onGotoLevel(0)}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            再玩一遍
          </button>
        ) : null}
      </div>
    </>
  )
}

export default function StarCollectorClient() {
  const [seed, setSeed] = useState<number>(() => randomSeed())
  const [levelIndex, setLevelIndex] = useState(0)

  const [pointsBalance, setPointsBalance] = useState(0)
  const [earnedToday, setEarnedToday] = useState(0)
  const [dailyCap, setDailyCap] = useState(1000)

  const puzzles = useMemo<Puzzle[]>(() => {
    const rand = mulberry32(seed)
    const size = 12
    const start = 5
    const loopLens = [1, 2, 3]

    const makeSolvable = (cfg: {
      id: string
      title: string
      story: string
      distances: Array<4 | 5>
      runsBudget: number
      reward: number
      starCount: 2 | 3
    }): Puzzle => {
      for (let attempt = 0; attempt < 120; attempt++) {
        const dir = rand() < 0.5 ? -1 : 1
        const d = cfg.distances[Math.floor(rand() * cfg.distances.length)]!
        const end = start + dir * d
        if (end < 0 || end >= size) continue

        const candidates: number[] = []
        const lo = Math.min(start, end)
        const hi = Math.max(start, end)
        for (let p = lo; p <= hi; p++) {
          if (p === start) continue
          if (p === end) continue
          candidates.push(p)
        }
        for (const p of [start - 1, start + 1]) {
          if (p >= 0 && p < size && p !== start && p !== end && !candidates.includes(p)) candidates.push(p)
        }

        const picked: number[] = []
        while (picked.length < cfg.starCount && candidates.length > 0) {
          const idx = Math.floor(rand() * candidates.length)
          picked.push(candidates.splice(idx, 1)[0]!)
        }
        if (picked.length < cfg.starCount) continue
        const starPositions = uniq(picked).filter(p => p !== start && p !== end)

        const puzzle: Puzzle = {
          id: cfg.id,
          title: cfg.title,
          story: cfg.story,
          size,
          start,
          end,
          starPositions,
          loopLens,
          runsBudget: cfg.runsBudget,
          reward: cfg.reward
        }
        if (starPositions.includes(start) || starPositions.includes(end)) continue
        const maxLen = Math.max(...loopLens)
        const maxSteps = cfg.runsBudget * maxLen
        const minSteps = minStepsToCoverAllAndFinish(puzzle)
        if (minSteps > maxSteps - 1) continue
        if (hasSolutionExact(puzzle)) return puzzle
      }

      return {
        id: cfg.id,
        title: cfg.title,
        story: cfg.story,
        size,
        start,
        end: 9,
        starPositions: [7, 8],
        loopLens,
        runsBudget: cfg.runsBudget,
        reward: cfg.reward
      }
    }

    return [
      makeSolvable({
        id: "L1",
        title: "第一关：短跑道",
        story: "从中间出发。每次执行循环会走 1/2/3 步，只有 3 次机会。",
        distances: [4],
        runsBudget: 3,
        reward: 30,
        starCount: 2
      }),
      makeSolvable({
        id: "L2",
        title: "第二关：刚刚好",
        story: "终点更远一点。用有限机会到🏁并捡完⭐️，提前到也算成功。",
        distances: [4, 5],
        runsBudget: 3,
        reward: 40,
        starCount: 3
      }),
      makeSolvable({
        id: "L3",
        title: "第三关：随机挑战",
        story: "随机终点与星星位置。总会有答案能赢，但也不是随便选都行。",
        distances: [4, 5],
        runsBudget: 3,
        reward: 60,
        starCount: 3
      })
    ]
  }, [seed])

  const puzzle = puzzles[levelIndex] ?? puzzles[0]!

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
        setPointsBalance(0)
        setEarnedToday(0)
        setDailyCap(1000)
      }
    }
    run()
  }, [])

  const award = async (points: number): Promise<EarnResponse> => {
    try {
      const res = await fetch("/api/auth/student/earn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points })
      })
      const data = (await res.json().catch(() => ({ ok: false }))) as EarnResponse
      if (!res.ok || !data.ok) return { ok: false, error: data && "error" in data ? data.error : undefined }
      setPointsBalance(data.pointsBalance)
      setEarnedToday(data.earnedToday)
      setDailyCap(data.dailyCap)
      return data
    } catch {
      return { ok: false, error: "网络错误：领取积分失败。" }
    }
  }

  const onNewRun = () => {
    setSeed(randomSeed())
    setLevelIndex(0)
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-[2rem] border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              ⭐️ 星星收集器 · 循环版
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight">{puzzle.title}</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{puzzle.story}</p>
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

        <StarCollectorRun
          key={puzzle.id}
          puzzle={puzzle}
          award={award}
          onGotoLevel={setLevelIndex}
          onNewRun={onNewRun}
          levelIndex={levelIndex}
          levelCount={puzzles.length}
        />
      </div>
    </div>
  )
}
