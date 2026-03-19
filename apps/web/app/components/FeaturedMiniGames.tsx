"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/app/lib/api"
import GameCard, { type GameCardData } from "@/app/components/GameCard"
import type { Concept } from "@/app/lib/games"

type MiniGame = {
  slug: string
  title: string
  emoji: string
  blurb: string
  requires: Concept
}

type MeResponse =
  | { ok: true; student: { concept?: Concept | null } }
  | { ok: false }

function conceptRank(requires: Concept) {
  return requires === "BRANCH" ? 0 : 1
}

export default function FeaturedMiniGames({ limit = 6 }: { limit?: number }) {
  const [concept, setConcept] = useState<Concept>("BRANCH")
  const [games, setGames] = useState<MiniGame[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const data = await apiFetch<MiniGame[]>("/minigames")
        const sorted = [...data].sort((a, b) => {
          const d = conceptRank(a.requires) - conceptRank(b.requires)
          return d !== 0 ? d : a.slug.localeCompare(b.slug, "zh-Hans-CN")
        })
        setGames(sorted.slice(0, limit))
      } catch {
        setGames([])
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [limit])

  useEffect(() => {
    const run = async () => {
      try {
        const me = await apiFetch<MeResponse>("/auth/student/me")
        if (me.ok) {
          const c = me.student.concept
          if (c === "BRANCH" || c === "LOOP") setConcept(c)
        }
      } catch {
        // ignore
      }
    }
    run()
  }, [])

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
          blurb: g.blurb.replaceAll("星空币", "积分"),
          locked,
          requiresLabel: g.requires === "LOOP" ? "循环" : "分支"
        }
        return <GameCard key={g.slug} game={card} />
      })}
    </div>
  )
}
