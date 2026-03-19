"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/app/lib/api"

type Concept = "BRANCH" | "LOOP"

type MiniGame = {
  slug: string
  title: string
  emoji: string
  blurb: string
  requires: Concept
}

type ValidateResponse =
  | {
      ok: true
      message: string
      reward: { requested: number; added: number; pointsBalance: number; earnedToday: number; dailyCap: number }
    }
  | { ok: false; message: string }

function isValidateResponse(value: unknown): value is ValidateResponse {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  if (typeof v.ok !== "boolean") return false
  if (typeof v.message !== "string") return false
  if (v.ok === false) return true
  if (!v.reward || typeof v.reward !== "object") return false
  const r = v.reward as Record<string, unknown>
  return (
    typeof r.requested === "number" &&
    typeof r.added === "number" &&
    typeof r.pointsBalance === "number" &&
    typeof r.earnedToday === "number" &&
    typeof r.dailyCap === "number"
  )
}

function placeholderFor(concept: Concept) {
  if (concept === "BRANCH") {
    return `// 写一个 if / else\nint score = 85;\nif (score >= 60) {\n  // PASS\n} else {\n  // TRY AGAIN\n}\n`
  }
  return `// 写一个 for 或 while\nfor (int i = 0; i < 3; i++) {\n  // do something\n}\n`
}

export default function CodeUnlockClient({ id }: { id: string }) {
  const router = useRouter()
  const [game, setGame] = useState<MiniGame | null>(null)
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ValidateResponse | null>(null)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const g = await apiFetch<MiniGame>(`/minigames/${id}`)
        setGame(g)
        setCode(prev => (prev.trim() ? prev : placeholderFor(g.requires)))
      } catch {
        setGame(null)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [id])

  const conceptLabel = useMemo(() => {
    if (!game) return ""
    return game.requires === "BRANCH" ? "分支 (if / else)" : "循环 (for / while)"
  }, [game])

  const submit = async () => {
    if (!game) return
    setSubmitting(true)
    setResult(null)
    try {
      const res = await fetch(`/api/minigames/${game.slug}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      })
      const raw: unknown = await res.json().catch(() => ({ ok: false, message: "提交失败" }))

      if (isValidateResponse(raw)) {
        setResult(raw)
      } else {
        const obj =
          raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
        const message =
          typeof obj.message === "string"
            ? obj.message
            : typeof obj.error === "string"
              ? obj.error
              : res.status === 401
                ? "请先登录再提交。"
                : "提交失败"
        setResult({ ok: false, message })
      }
    } catch {
      setResult({ ok: false, message: "网络错误：提交失败" })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="h-64 animate-pulse rounded-[2rem] border border-black/5 bg-white/60 dark:border-white/10 dark:bg-white/5" />
    )
  }

  if (!game) {
    return (
      <div className="rounded-[2rem] border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-700 dark:text-red-200">
        游戏不存在或加载失败。
      </div>
    )
  }

  return (
    <div className="rounded-[2rem] border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50">
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        我自己来 · 写代码解锁
      </div>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
        {game.emoji} {game.title}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        目标：提交一段包含 <span className="font-extrabold">{conceptLabel}</span>{" "}
        的代码，通过校验后获得积分并继续游戏。
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-black/5 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            代码
          </div>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            className="mt-3 h-72 w-full resize-none rounded-2xl border border-black/10 bg-white/70 p-3 font-mono text-sm leading-6 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/30"
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {submitting ? "提交中..." : "提交校验"}
            </button>
            <button
              type="button"
              onClick={() => router.replace(`/play/${game.slug}?mode=direct`)}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-5 text-sm font-extrabold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              先去玩一会
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white/60 p-4 text-sm dark:border-white/10 dark:bg-white/5">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            结果
          </div>
          {result ? (
            result.ok ? (
              <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-emerald-900 dark:text-emerald-100">
                <div className="font-extrabold">通过！</div>
                <div className="mt-2">{result.message}</div>
                <div className="mt-3 text-xs text-emerald-800/80 dark:text-emerald-100/80">
                  本次奖励：+{result.reward.added}/{result.reward.requested} 积分 ·
                  余额 {result.reward.pointsBalance} · 今日已得{" "}
                  {result.reward.earnedToday}/{result.reward.dailyCap}
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => router.replace(`/play/${game.slug}?mode=direct`)}
                    className="inline-flex h-10 items-center justify-center rounded-2xl bg-zinc-950 px-4 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                  >
                    继续游戏
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-red-700 dark:text-red-200">
                <div className="font-extrabold">未通过</div>
                <div className="mt-2">{result.message}</div>
                <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                  提示：如果你还没登录，先去 <Link href="/login?next=%2Fgames" className="font-semibold hover:underline">登录</Link>。
                </div>
              </div>
            )
          ) : (
            <div className="mt-3 rounded-2xl border border-black/5 bg-white/70 p-4 text-zinc-700 dark:border-white/10 dark:bg-zinc-950/30 dark:text-zinc-200">
              还没有提交。写好代码后点击“提交校验”。
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <Link
              href={`/games/${game.slug}`}
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-4 text-sm font-extrabold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              返回
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
