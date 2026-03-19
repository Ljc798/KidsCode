"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/app/lib/api"
import { formatShanghaiDateTime } from "@/app/lib/time"

type Item = {
  slug: string
  title: string
  summary: string | null
  contentMd: string
  order: number
  updatedAt: string
}

function renderMarkdownLite(md: string) {
  // Minimal renderer: supports fenced code blocks ```lang ... ```
  const normalized = md.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n")
  const parts = normalized.split("```")
  return parts.map((chunk, i) => {
    const isCode = i % 2 === 1
    if (!isCode) {
      return (
        <div
          key={i}
          className="whitespace-pre-wrap text-sm leading-7 text-zinc-700 dark:text-zinc-200"
        >
          {chunk.trim()}
        </div>
      )
    }

    const lines = chunk.replace(/^\n+/, "").split("\n")
    const first = lines[0] ?? ""
    const lang = /^[a-z0-9#+.-]+$/i.test(first.trim()) ? first.trim() : ""
    const code = lang ? lines.slice(1).join("\n") : lines.join("\n")

    return (
      <div key={i} className="mt-4 overflow-hidden rounded-3xl border border-black/10 bg-zinc-950/95 shadow-sm dark:border-white/10">
        <div className="flex items-center justify-between px-4 py-2 text-xs font-extrabold text-white/80">
          <span>{lang ? lang.toUpperCase() : "CODE"}</span>
          <span className="text-white/50">KidsCode</span>
        </div>
        <pre className="overflow-x-auto px-4 pb-4 pt-2 text-sm text-white">
          <code>{code.trimEnd()}</code>
        </pre>
      </div>
    )
  })
}

export default function CppKnowledgeDetail({ slug }: { slug: string }) {
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      setError(null)
      setLoading(true)
      try {
        const data = await apiFetch<Item>(`/knowledge/cpp/${slug}`)
        setItem(data)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load article")
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [slug])

  const body = useMemo(() => (item ? renderMarkdownLite(item.contentMd) : null), [item])

  if (loading) {
    return (
      <div className="h-64 animate-pulse rounded-3xl border border-black/5 bg-white/60 dark:border-white/10 dark:bg-white/5" />
    )
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-700 dark:text-red-200">
        {error}
        <div className="mt-4">
          <Link
            href="/knowledge/cpp"
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-4 text-sm font-extrabold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            返回知识大全
          </Link>
        </div>
      </div>
    )
  }

  if (!item) return null

  return (
    <article className="rounded-3xl border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            C++
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
            {item.title}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            {item.summary ?? " "}
          </p>
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          更新: {formatShanghaiDateTime(item.updatedAt)}
        </div>
      </div>

      <div className="mt-6 grid gap-4">{body}</div>

      <div className="mt-8">
        <Link
          href="/knowledge/cpp"
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-5 text-sm font-extrabold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
        >
          返回知识大全
        </Link>
      </div>
    </article>
  )
}
