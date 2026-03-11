"use client"

import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/app/lib/api"
import GameCard, { type GameCardData } from "@/app/components/GameCard"
import { getConcept } from "@/app/lib/progress"
import type { Concept } from "@/app/lib/games"

type MiniGame = {
  slug: string
  title: string
  emoji: string
  blurb: string
  requires: Concept
}

export default function FeaturedMiniGames({ limit = 6 }: { limit?: number }) {
  const concept = useMemo(() => getConcept(), [])
  const [games, setGames] = useState<MiniGame[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const data = await apiFetch<MiniGame[]>("/minigames")
        setGames(data.slice(0, limit))
      } catch {
        setGames([])
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [limit])

  if (loading) {
    return (
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: limit }).map((_, i) => (
          <div
            key={i}
            className="h-[92px] animate-pulse rounded-3xl border border-black/5 bg-white/60 dark:border-white/10 dark:bg-white/5"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {games.map(g => {
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
      })}
    </div>
  )
}

