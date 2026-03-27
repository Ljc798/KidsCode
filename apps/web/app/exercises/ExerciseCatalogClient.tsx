"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { apiFetch } from "@/app/lib/api"

type ExerciseCard = {
  id: string
  slug: string
  title: string
  summary: string | null
  imageUrl: string | null
  subject: "CPP" | "SCRATCH"
  difficultyType: "LEVEL" | "OTHER"
  difficultyLevel: number | null
  level: number
  codingTitle: string
  multipleChoiceCount: number
  codingTaskCount: number
  submissionsCount: number
}

const LEVELS = Array.from({ length: 18 }, (_, index) => index + 1)

function Cover({ title, imageUrl }: { title: string; imageUrl: string | null }) {
  if (imageUrl) {
    return (
      <div
        className="h-40 rounded-[1.75rem] bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(135deg, rgba(14,23,38,0.18), rgba(14,23,38,0.42)), url(${imageUrl})` }}
      />
    )
  }

  return (
    <div className="flex h-40 items-end rounded-[1.75rem] bg-[linear-gradient(140deg,#0f766e,#0369a1_45%,#f59e0b)] p-5 text-white">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.24em] text-white/75">
          Exercise Bank
        </div>
        <div className="mt-2 text-xl font-black leading-tight">{title}</div>
      </div>
    </div>
  )
}

export default function ExerciseCatalogClient() {
  const [items, setItems] = useState<ExerciseCard[]>([])
  const [subject, setSubject] = useState<"CPP" | "SCRATCH">("CPP")
  const [difficulty, setDifficulty] = useState<number | "OTHER" | "all">("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        params.set("subject", subject)
        if (difficulty === "OTHER") {
          params.set("difficultyType", "OTHER")
        } else if (difficulty !== "all") {
          params.set("difficultyType", "LEVEL")
          params.set("level", String(difficulty))
        }
        const query = params.toString()
        const data = await apiFetch<ExerciseCard[]>(`/exercises${query ? `?${query}` : ""}`)
        setItems(data)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "加载失败")
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [subject, difficulty])

  return (
    <>
      <div className="mt-6 rounded-[2rem] border border-black/5 bg-white/75 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-teal-700 dark:text-teal-300">
              科目与分级筛选
            </div>
            <h2 className="mt-2 text-xl font-black tracking-tight text-zinc-950 dark:text-white">
              先选科目，再按等级或“其他”筛选题库
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSubject("CPP")
                setDifficulty("all")
              }}
              className={[
                "rounded-full px-4 py-2 text-sm font-bold transition",
                subject === "CPP"
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                  : "bg-zinc-950/5 text-zinc-700 hover:bg-zinc-950/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
              ].join(" ")}
            >
              C++
            </button>
            <button
              type="button"
              onClick={() => {
                setSubject("SCRATCH")
                setDifficulty("all")
              }}
              className={[
                "rounded-full px-4 py-2 text-sm font-bold transition",
                subject === "SCRATCH"
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                  : "bg-zinc-950/5 text-zinc-700 hover:bg-zinc-950/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
              ].join(" ")}
            >
              Scratch
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDifficulty("all")}
              className={[
                "rounded-full px-4 py-2 text-sm font-bold transition",
                difficulty === "all"
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                  : "bg-zinc-950/5 text-zinc-700 hover:bg-zinc-950/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
              ].join(" ")}
            >
              全部
            </button>
            {LEVELS.map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setDifficulty(item)}
                className={[
                  "rounded-full px-4 py-2 text-sm font-bold transition",
                  difficulty === item
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                    : "bg-zinc-950/5 text-zinc-700 hover:bg-zinc-950/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
                ].join(" ")}
              >
                {item} 级
              </button>
            ))}
            <button
              type="button"
              onClick={() => setDifficulty("OTHER")}
              className={[
                "rounded-full px-4 py-2 text-sm font-bold transition",
                difficulty === "OTHER"
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                  : "bg-zinc-950/5 text-zinc-700 hover:bg-zinc-950/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10"
              ].join(" ")}
            >
              其他
            </button>
          </div>
        </div>
      </div>

      <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-[320px] animate-pulse rounded-[2rem] border border-black/5 bg-white/70 dark:border-white/10 dark:bg-white/5"
              />
            ))
          : null}

        {!loading && error ? (
          <div className="col-span-full rounded-[2rem] border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-700 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <div className="col-span-full rounded-[2rem] border border-dashed border-black/10 bg-white/60 p-8 text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-950/40 dark:text-zinc-300">
            当前分类下还没有题库。先去后台添加题目后，这里会自动展示。
          </div>
        ) : null}

        {!loading && !error
          ? items.map(item => (
              <Link
                key={item.id}
                href={`/exercises/${item.slug}`}
                className="group rounded-[2rem] border border-black/5 bg-white/80 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-zinc-950/50"
              >
                <Cover title={item.title} imageUrl={item.imageUrl} />
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-black tracking-[0.18em] text-amber-700 dark:text-amber-200">
                    {item.subject === "SCRATCH" ? "SCRATCH" : "C++"} · {item.difficultyType === "OTHER" ? "其他" : `LEVEL ${item.difficultyLevel ?? item.level}`}
                  </span>
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {item.multipleChoiceCount} 道选择 + {item.codingTaskCount} 道编程
                  </span>
                </div>
                <h3 className="mt-3 text-xl font-black tracking-tight text-zinc-950 dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                  {item.summary || item.codingTitle}
                </p>
                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                    {item.codingTitle}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    已提交 {item.submissionsCount} 次
                  </span>
                </div>
              </Link>
            ))
          : null}
      </section>
    </>
  )
}
