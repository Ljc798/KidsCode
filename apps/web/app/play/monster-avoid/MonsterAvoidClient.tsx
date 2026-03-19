"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"

type Cell = "EMPTY" | "OBSTACLE"
type Action = "MOVE" | "JUMP"

type Branch = {
  key: string
  kind: "IF" | "ELSE"
  condition?: string
  body: string
  action: Action
}

type LevelInstance = {
  id: string
  title: string
  story: string
  mode: "SHOW_ALL" | "LOOK_AHEAD"
  cells: Cell[]
  branches: Branch[]
  rewardPoints: number
}

type EarnResponse =
  | { ok: true; added: number; pointsBalance: number; earnedToday: number; dailyCap: number }
  | { ok: false; error?: string }

type MeResponse =
  | { ok: true; student: { pointsBalance: number; earnedToday: number; dailyCap: number } }
  | { ok: false }

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

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
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
        分支规则 (if / else)
      </div>
      <div className="mt-3 grid gap-2 font-mono text-[13px] leading-6 text-zinc-800 dark:text-zinc-100">
        {branches.map(b => {
          const active = activeBranchKey != null && b.key === activeBranchKey
          const header = b.kind === "IF" ? "if" : "else"
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

function Track({
  cells,
  pos,
  revealed,
  lookAhead,
  revealMode
}: {
  cells: Cell[]
  pos: number
  revealed: boolean
  lookAhead: number
  revealMode: "ALL" | "FRONT"
}) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white/60 p-5 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          跑道
        </div>
        <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          前方 {lookAhead} 格
        </div>
      </div>
      <div className="mt-4 grid grid-cols-10 gap-2">
        {cells.map((c, i) => {
          const isHere = i === pos
          const inFront = i === pos + lookAhead
          const show = c === "EMPTY" ? "·" : "⛔️"
          const hidden = c === "EMPTY" ? "·" : "?"
          return (
            <div
              key={i}
              className={[
                "flex h-10 items-center justify-center rounded-2xl border text-sm font-extrabold",
                isHere
                  ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                  : "border-black/10 bg-white/70 text-zinc-800 dark:border-white/10 dark:bg-zinc-950/30 dark:text-zinc-100",
                inFront ? "ring-2 ring-amber-400/40" : ""
              ].join(" ")}
              title={i === cells.length - 1 ? "终点" : undefined}
            >
              {isHere ? (
                "👾"
              ) : revealMode === "ALL" ? (
                show
              ) : revealed && inFront ? (
                show
              ) : inFront ? (
                hidden
              ) : (
                "·"
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
        {revealMode === "ALL"
          ? "本关直接显示所有障碍。"
          : revealed
            ? "已查看前方 1 格。"
            : "点击“查看前方”获得线索。"}
      </div>
    </div>
  )
}

export default function MonsterAvoidClient() {
  const [seed, setSeed] = useState(() => randomSeed())
  const toastTimerRef = useRef<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [pointsBalance, setPointsBalance] = useState(0)
  const [earnedToday, setEarnedToday] = useState(0)
  const [dailyCap, setDailyCap] = useState(1000)

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
        // ignore
      }
    }
    run()
  }, [])

  const levels: LevelInstance[] = useMemo(() => {
    const rand = mulberry32(seed)
    const makeCells = (len: number) => {
      const cells: Cell[] = Array.from({ length: len }).map(() => "EMPTY")
      // Sprinkle obstacles but keep solvable: first/last cell empty.
      const obstacleCount = Math.max(2, Math.floor(len / 3))
      const idxs = new Set<number>()
      while (idxs.size < obstacleCount) {
        const i = 1 + Math.floor(rand() * (len - 2))
        idxs.add(i)
      }
      for (const i of idxs) cells[i] = "OBSTACLE"
      return cells
    }

    const branches: Branch[] = [
      {
        key: "IF",
        kind: "IF",
        condition: `front == "障碍"`,
        body: "跳一下 (JUMP)",
        action: "JUMP"
      },
      {
        key: "ELSE",
        kind: "ELSE",
        body: "向前走 (MOVE)",
        action: "MOVE"
      }
    ]

    const makeLevel = (i: number): LevelInstance => {
      const len = 10
      const cells = makeCells(len)
      const rewardPoints = pickOne(rand, [20, 30, 40])
      const mode: LevelInstance["mode"] = i === 0 ? "SHOW_ALL" : "LOOK_AHEAD"
      return {
        id: `L${i + 1}`,
        title:
          i === 0
            ? "第 1 关：先看全图"
            : `第 ${i + 1} 关：难度升级`,
        story:
          i === 0
            ? "这一关会直接显示所有障碍。根据规则选择跳或走。"
            : "每一步都先查看前方，再用 if / else 选择跳或走。",
        mode,
        cells,
        branches,
        rewardPoints
      }
    }

    return [0, 1, 2].map(i => makeLevel(i))
  }, [seed])

  const [levelIndex, setLevelIndex] = useState(0)
  const level = levels[levelIndex]

  const lookAhead = 1
  const [pos, setPos] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [activeBranchKey, setActiveBranchKey] = useState<string | null>(null)
  const [status, setStatus] = useState<"PLAYING" | "FAIL" | "SUCCESS">("PLAYING")

  const progress = clamp01(pos / (level.cells.length - 1))

  const resetLevel = () => {
    setPos(0)
    setRevealed(level.mode === "SHOW_ALL")
    setActiveBranchKey(null)
    setStatus("PLAYING")
    showToast(null)
  }

  useEffect(() => {
    // When switching levels, initialize reveal mode and hint message.
    setRevealed(level.mode === "SHOW_ALL")
    if (level.mode === "LOOK_AHEAD") {
      showToast("难度升级：这一关需要先“查看前方”再选择。", 2400)
    } else {
      showToast("第 1 关：障碍已全部显示，不用查看前方。", 2200)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelIndex])

  const reveal = () => {
    if (status !== "PLAYING") return
    if (level.mode === "SHOW_ALL") return
    setRevealed(true)
    showToast("线索出现了！看前方有没有障碍。")
  }

  const doAction = (action: Action) => {
    if (status !== "PLAYING") return
    if (level.mode === "LOOK_AHEAD" && !revealed) {
      showToast("先点“查看前方”，再做选择。", 1800)
      return
    }

    const frontIndex = pos + lookAhead
    const frontCell = level.cells[frontIndex]
    const shouldJump = frontCell === "OBSTACLE"
    const correct = shouldJump ? "JUMP" : "MOVE"

    setActiveBranchKey(shouldJump ? "IF" : "ELSE")

    if (action !== correct) {
      setStatus("FAIL")
      showToast("哎呀！选错了，撞到障碍啦。点“重试本关”再来。")
      return
    }

    const nextPos = Math.min(level.cells.length - 1, pos + 1)
    setPos(nextPos)
    setRevealed(level.mode === "SHOW_ALL")
    showToast(null)

    if (nextPos >= level.cells.length - 1) {
      setStatus("SUCCESS")
      void (async () => {
        try {
          const res = await fetch("/api/auth/student/earn", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ points: level.rewardPoints })
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
            const clipped = data.added !== level.rewardPoints
            showToast(
              clipped
                ? `通关啦！今日积分接近上限，获得 +${data.added} 积分。`
                : `通关啦！获得 +${data.added} 积分。`
            )
          } else {
            showToast(`通关啦！但今日已达到 ${data.dailyCap} 积分上限。`)
          }
        } catch {
          showToast("网络错误：领取积分失败。", 2000)
        }
      })()
    }
  }

  const nextLevel = () => {
    if (levelIndex >= levels.length - 1) return
    setLevelIndex(i => i + 1)
    resetLevel()
  }

  const newRun = () => {
    setSeed(randomSeed())
    setLevelIndex(0)
    resetLevel()
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-[2rem] border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              👾 怪物躲躲躲 · 点击版
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

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-950/10 dark:bg-white/10">
          <div
            className="h-2 rounded-full bg-zinc-950 dark:bg-white"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="grid gap-4">
            <Track
              cells={level.cells}
              pos={pos}
              revealed={revealed}
              lookAhead={lookAhead}
              revealMode={level.mode === "SHOW_ALL" ? "ALL" : "FRONT"}
            />

            <div className="rounded-3xl border border-black/5 bg-white/60 p-5 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              {level.mode === "SHOW_ALL" ? (
                <div className="mb-3 rounded-2xl border border-black/5 bg-zinc-950/5 px-4 py-3 text-xs font-semibold text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
                  第 1 关：障碍已全部显示，直接选择“走/跳”。
                </div>
              ) : (
                <div className="mb-3 rounded-2xl border border-black/5 bg-zinc-950/5 px-4 py-3 text-xs font-semibold text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
                  难度升级：每一步先点“查看前方”，再选择“走/跳”。
                </div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={reveal}
                  disabled={
                    level.mode === "SHOW_ALL" || revealed || status !== "PLAYING"
                  }
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-black/10 bg-white/70 px-5 text-sm font-extrabold text-zinc-900 hover:bg-white disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  {level.mode === "SHOW_ALL" ? "无需查看" : "查看前方"}
                </button>
                <button
                  type="button"
                  onClick={() => doAction("MOVE")}
                  disabled={status !== "PLAYING"}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  走
                </button>
                <button
                  type="button"
                  onClick={() => doAction("JUMP")}
                  disabled={status !== "PLAYING"}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  跳
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

              {status === "FAIL" ? (
                <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-200">
                  失败了：没有按规则躲开障碍。
                </div>
              ) : null}

              {status === "SUCCESS" ? (
                <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100">
                  通关！这就是分支：看到条件不同，选择不同动作。
                </div>
              ) : null}
            </div>
          </div>

          <RuleCard branches={level.branches} activeBranchKey={activeBranchKey} />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/games/monster-avoid`}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-5 text-sm font-extrabold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            返回
          </Link>
          <button
            type="button"
            onClick={resetLevel}
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

          {status === "SUCCESS" && levelIndex < levels.length - 1 ? (
            <button
              type="button"
              onClick={nextLevel}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              下一关
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
