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

const CHEST_ICON = "🎁"

type Chest = {
  id: "A" | "B" | "C"
  label: string
  reward: number
}

type Branch = {
  key: string
  kind: "IF" | "ELIF" | "ELSE"
  condition?: string
  body: string
  chestId: Chest["id"]
}

type LevelInstance = {
  id: string
  title: string
  story: string
  clueLabel: string
  clueValue: string
  branches: Branch[]
  correctBranchKey: Branch["key"]
  correctChestId: Chest["id"]
  chests: Chest[]
}

function chestName(id: Chest["id"]) {
  if (id === "A") return "左边"
  if (id === "B") return "中间"
  return "右边"
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

function assignRewards(
  rand: () => number,
  correctChestId: Chest["id"],
  highOptions: number[],
  lowOptions: number[]
) {
  const ids: Chest["id"][] = ["A", "B", "C"]
  const others = ids.filter(id => id !== correctChestId)
  const high = pickOne(rand, highOptions)
  const lows = shuffle(rand, lowOptions).slice(0, 2)
  return {
    [correctChestId]: high,
    [others[0]!]: lows[0]!,
    [others[1]!]: lows[1]!
  } as Record<Chest["id"], number>
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

export default function TreasureChoicesClient() {
  const [seed, setSeed] = useState<number>(() => randomSeed())

  const levels: LevelInstance[] = useMemo(() => {
    const rand = mulberry32(seed)

    const makeChests = (rewardsById: Record<Chest["id"], number>): Chest[] =>
      (["A", "B", "C"] as const).map(id => ({
        id,
        label: `宝箱 ${id}`,
        reward: rewardsById[id]
      }))

    // Keep the first few questions very simple (pure if / else).

    // Level 1: key color
    const keyColor = pickOne(rand, ["红色", "蓝色"])
    const l1CorrectChestId: Chest["id"] = keyColor === "红色" ? "A" : "C"
  const l1RewardsById = assignRewards(
      rand,
      l1CorrectChestId,
      [20, 30, 40],
      [0, 5, 10, 15]
    )

    // Level 2: monster footprints
    const footprint = pickOne(rand, ["向左", "向右"])
    const l2CorrectChestId: Chest["id"] = footprint === "向左" ? "A" : "C"
    const l2RewardsById = assignRewards(
      rand,
      l2CorrectChestId,
      [20, 30, 40],
      [0, 5, 10, 15]
    )

    // Level 3: odd / even
    const num = pickOne(rand, [1, 2, 3, 4, 5, 6, 7, 8, 9])
    const isEven = num % 2 === 0
    const l3CorrectChestId: Chest["id"] = isEven ? "B" : "C"
    const l3RewardsById = assignRewards(
      rand,
      l3CorrectChestId,
      [20, 30, 40],
      [0, 5, 10, 15]
    )

    // Level 4: temperature
    const temp = pickOne(rand, ["低温", "高温"])
    const l4CorrectChestId: Chest["id"] = temp === "低温" ? "C" : "A"
    const l4RewardsById = assignRewards(
      rand,
      l4CorrectChestId,
      [20, 30, 40],
      [0, 5, 10, 15]
    )

    // Level 5: weather
    const weather = pickOne(rand, ["下雨", "晴天"])
    const l5CorrectChestId: Chest["id"] = weather === "下雨" ? "B" : "C"
    const l5RewardsById = assignRewards(
      rand,
      l5CorrectChestId,
      [20, 30, 40],
      [0, 5, 10, 15]
    )

    return [
      {
        id: "L1",
        title: "第 1 关：钥匙颜色 (if / else)",
        story: "先看线索，再用 if / else 选择宝箱。",
        clueLabel: "钥匙🔑颜色",
        clueValue: keyColor,
        branches: [
          {
            key: "IF",
            kind: "IF",
            condition: `钥匙🔑颜色 == "红色"`,
            body: "选 左边宝箱",
            chestId: "A"
          },
          {
            key: "ELSE",
            kind: "ELSE",
            body: "选 右边宝箱",
            chestId: "C"
          }
        ],
        correctBranchKey: keyColor === "红色" ? "IF" : "ELSE",
        correctChestId: l1CorrectChestId,
        chests: makeChests(l1RewardsById)
      },
      {
        id: "L2",
        title: "第 2 关：怪物脚印 (if / else)",
        story: "脚印指向哪里，就去哪里找宝箱。",
        clueLabel: "脚印👣",
        clueValue: footprint,
        branches: [
          {
            key: "IF",
            kind: "IF",
            condition: `脚印👣 == "向左"`,
            body: "选 左边宝箱",
            chestId: "A"
          },
          {
            key: "ELSE",
            kind: "ELSE",
            body: "选 右边宝箱",
            chestId: "C"
          }
        ],
        correctBranchKey: footprint === "向左" ? "IF" : "ELSE",
        correctChestId: l2CorrectChestId,
        chests: makeChests(l2RewardsById)
      },
      {
        id: "L3",
        title: "第 3 关：数字奇偶 (if / else)",
        story: "先看数字，再判断是奇数还是偶数。",
        clueLabel: "数字🔢",
        clueValue: String(num),
        branches: [
          {
            key: "IF",
            kind: "IF",
            condition: "数字🔢 是偶数",
            body: "选 宝箱 B",
            chestId: "B"
          },
          {
            key: "ELSE",
            kind: "ELSE",
            body: "选 宝箱 C",
            chestId: "C"
          }
        ],
        correctBranchKey: isEven ? "IF" : "ELSE",
        correctChestId: l3CorrectChestId,
        chests: makeChests(l3RewardsById)
      },
      {
        id: "L4",
        title: "第 4 关：温度判断 (if / else)",
        story: "温度不同，宝箱位置也不同。",
        clueLabel: "温度🌡️",
        clueValue: temp,
        branches: [
          {
            key: "IF",
            kind: "IF",
            condition: `温度🌡️ == "低温"`,
            body: "选 右边宝箱",
            chestId: "C"
          },
          {
            key: "ELSE",
            kind: "ELSE",
            body: "选 左边宝箱",
            chestId: "A"
          }
        ],
        correctBranchKey: temp === "低温" ? "IF" : "ELSE",
        correctChestId: l4CorrectChestId,
        chests: makeChests(l4RewardsById)
      },
      {
        id: "L5",
        title: "第 5 关：天气判断 (if / else)",
        story: "下雨的时候，宝箱藏在中间。",
        clueLabel: "天气⛅️",
        clueValue: weather,
        branches: [
          {
            key: "IF",
            kind: "IF",
            condition: `天气⛅️ == "下雨"`,
            body: "选 中间宝箱",
            chestId: "B"
          },
          {
            key: "ELSE",
            kind: "ELSE",
            body: "选 右边宝箱",
            chestId: "C"
          }
        ],
        correctBranchKey: weather === "下雨" ? "IF" : "ELSE",
        correctChestId: l5CorrectChestId,
        chests: makeChests(l5RewardsById)
      }
    ]
  }, [seed])

  const [levelIndex, setLevelIndex] = useState(0)
  const level = levels[levelIndex]

  const [revealed, setRevealed] = useState(false)
  const [picked, setPicked] = useState<Chest["id"] | null>(null)
  const [pointsBalance, setPointsBalance] = useState(0)
  const [earnedToday, setEarnedToday] = useState(0)
  const [dailyCap, setDailyCap] = useState(1000)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  const correctChest = revealed ? level.correctChestId : null
  const activeBranchKey = picked && revealed ? level.correctBranchKey : null

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

  const resetLevelUi = () => {
    setRevealed(false)
    setPicked(null)
    showToast(null)
  }

  const reveal = () => {
    setRevealed(true)
    // Keep this message until the player makes a choice.
    showToast("线索出现了！现在可以做判断了。")
  }

  const pick = (id: Chest["id"]) => {
    if (picked) return
    if (!revealed) {
      showToast("先点“查看线索”，再用 if / else 做判断。", 1800)
      return
    }

    setPicked(id)
    const isCorrect = id === correctChest
    const reward = level.chests.find(c => c.id === id)?.reward ?? 0

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
            showToast(data && "error" in data && data.error ? data.error : "请先登录再领取积分。", 2000)
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
      showToast(`差一点！正确的是 ${chestName(correctChest!)}宝箱。`)
    }
  }

  const next = () => {
    if (levelIndex >= levels.length - 1) return
    setLevelIndex(i => i + 1)
    resetLevelUi()
  }

  const restart = () => {
    setLevelIndex(0)
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
              🧰 宝箱三选一 · 点击版
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
              线索
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-zinc-800 dark:text-zinc-100">
                {level.clueLabel}:{" "}
                <span className="font-extrabold">
                  {revealed ? level.clueValue : "未显示"}
                </span>
              </div>
              <button
                type="button"
                onClick={reveal}
                disabled={revealed}
                className="inline-flex h-10 items-center justify-center rounded-2xl bg-zinc-950 px-4 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {revealed ? "已查看" : "查看线索"}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {level.chests.map(c => {
                const isPicked = picked === c.id
                const isCorrect = picked && correctChest ? c.id === correctChest : false
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
                    key={c.id}
                    type="button"
                    onClick={() => pick(c.id)}
                    className={[
                      "group rounded-3xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed",
                      border,
                      bg
                    ].join(" ")}
                    disabled={picked != null}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {c.label}
                    </div>
                    <div className="mt-2 text-3xl">{CHEST_ICON}</div>
                    <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {picked == null
                        ? "奖励已隐藏"
                        : isPicked
                          ? `打开后获得: +${c.reward} 积分`
                          : "未打开"}
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

          <RuleCard
            branches={level.branches}
            activeBranchKey={activeBranchKey}
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/games/treasure-choices`}
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
            ) : (
              <button
                type="button"
                onClick={restart}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                再玩一遍
              </button>
            )
          ) : null}
        </div>

        {finished ? (
          <div className="mt-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-sm text-emerald-900 dark:text-emerald-100">
            <div className="text-xs font-semibold uppercase tracking-wider opacity-70">
              通关总结
            </div>
            <div className="mt-2 font-extrabold">
              你已经用 if / else 做了 {levels.length} 次选择！
            </div>
            <div className="mt-2 text-emerald-800/90 dark:text-emerald-100/90">
              看到线索 → 判断条件 → 选择宝箱，这就是“分支”。积分由老师统一兑换星空币。
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
