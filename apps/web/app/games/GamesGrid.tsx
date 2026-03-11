"use client"

import { useMemo, useEffect, useState } from "react"
import GameCard, { type GameCardData } from "@/app/components/GameCard"
import { getConcept } from "@/app/lib/progress"
import { apiFetch } from "@/app/lib/api"
import type { Concept } from "@/app/lib/games"

type MiniGame = {
  slug: string
  title: string
  emoji: string
  blurb: string
  requires: Concept
}

export default function GamesGrid() {
  const concept = useMemo(() => getConcept(), [])
  const [games, setGames] = useState<MiniGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      setError(null)
      setLoading(true)
      try {
        const data = await apiFetch<MiniGame[]>("/minigames")
        setGames(data)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load games")
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  return (
    <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {loading ? (
        Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[92px] animate-pulse rounded-3xl border border-black/5 bg-white/60 dark:border-white/10 dark:bg-white/5"
          />
        ))
      ) : error ? (
        <div className="col-span-full rounded-3xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : (
        games.map(g => {
        const locked = concept === "BRANCH" && g.requires === "LOOP"
        const card: GameCardData = {
          id: g.slug,
          title: g.title,
          emoji: g.emoji,
          blurb: g.blurb,
          locked,
          requiresLabel: g.requires === "LOOP" ? "循环" : "分支"
        }
        return <GameCard key={g.slug} game={card} />
      }))}
    </section>
  )
}
