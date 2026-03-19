"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { apiFetch } from "@/app/lib/api"
import { formatShanghaiDateTime } from "@/app/lib/time"

type Item = {
  slug: string
  title: string
  summary: string | null
  order: number
  updatedAt: string
}

export default function CppKnowledgeList() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      setError(null)
      setLoading(true)
      try {
        const data = await apiFetch<Item[]>("/knowledge/cpp")
        setItems(data)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load knowledge")
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  return (
    <section className="mt-6">
      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-3xl border border-black/5 bg-white/60 dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-black/5 bg-white/60 p-4 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
          暂无内容。
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map(it => (
            <Link
              key={it.slug}
              href={`/knowledge/cpp/${it.slug}`}
              className="group rounded-3xl border border-black/5 bg-white/70 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-zinc-950/50"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-base font-extrabold tracking-tight">
                    {it.title}
                  </div>
                  <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    {it.summary ?? "点击阅读"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    更新: {formatShanghaiDateTime(it.updatedAt)}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
