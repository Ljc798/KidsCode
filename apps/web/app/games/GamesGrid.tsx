"use client"

import { useEffect, useState } from "react"
import GameCard, { type GameCardData } from "@/app/components/GameCard"
import { apiFetch } from "@/app/lib/api"
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

export default function GamesGrid() {
  const [concept, setConcept] = useState<Concept>("BRANCH")
  const [games, setGames] = useState<MiniGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    const run = async () => {
      setError(null)
      setLoading(true)
      try {
        const data = await apiFetch<MiniGame[]>("/minigames")
        const sorted = [...data].sort((a, b) => {
          const d = conceptRank(a.requires) - conceptRank(b.requires)
          return d !== 0 ? d : a.slug.localeCompare(b.slug, "zh-Hans-CN")
        })
        setGames(sorted)
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
          blurb: g.blurb.replaceAll("星空币", "积分"),
          locked,
          requiresLabel: g.requires === "LOOP" ? "循环" : "分支"
        }
        return <GameCard key={g.slug} game={card} />
      }))}
    </section>
  )
}
