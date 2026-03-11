"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { apiFetch } from "@/app/lib/api"
import type { Concept } from "@/app/lib/games"

type MiniGame = {
  slug: string
  title: string
  emoji: string
  blurb: string
  requires: Concept
}

export default function GameDetailClient({ id }: { id: string }) {
  const [game, setGame] = useState<MiniGame | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      setError(null)
      setLoading(true)
      try {
        const data = await apiFetch<MiniGame>(`/minigames/${id}`)
        setGame(data)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load game")
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [id])

  if (loading) {
    return (
      <div className="h-56 animate-pulse rounded-3xl border border-black/5 bg-white/60 dark:border-white/10 dark:bg-white/5" />
    )
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-700 dark:text-red-200">
        {error}
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50">
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        选择开始方式
      </div>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
        {game ? `${game.emoji} ${game.title}` : `Game: ${id}`}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        {game?.blurb ??
          "你可以直接玩，也可以选择“我自己来”写一点代码，通过校验后继续玩。"}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href={`/play/${id}?mode=direct`}
          className="group rounded-3xl border border-black/5 bg-white/60 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5"
        >
          <div className="text-sm font-extrabold">直接玩</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            立刻开始游戏，边玩边学。
          </div>
          <div className="mt-3 inline-flex h-10 items-center justify-center rounded-2xl bg-zinc-950 px-4 text-sm font-extrabold text-white group-hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:group-hover:bg-zinc-200">
            现在就玩
          </div>
        </Link>

        <Link
          href={`/play/${id}/code`}
          className="group rounded-3xl border border-black/5 bg-gradient-to-b from-white/70 to-white/40 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:from-white/10 dark:to-white/5"
        >
          <div className="text-sm font-extrabold">我自己来</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            写一点点代码，让老师或系统校验，通过后继续玩。
          </div>
          <div className="mt-3 inline-flex h-10 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-4 text-sm font-extrabold text-zinc-900 group-hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:group-hover:bg-white/10">
            去写代码
          </div>
        </Link>
      </div>

      <div className="mt-6 flex gap-3">
        <Link
          href="/games"
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-5 text-sm font-extrabold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
        >
          返回游戏大全
        </Link>
      </div>
    </div>
  )
}
