"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { apiFetch } from "@/app/lib/api"

type ExerciseListItem = {
  id: string
  slug: string
  title: string
  summary: string | null
  imageUrl: string | null
  subject: "CPP" | "SCRATCH"
  difficultyType: "LEVEL" | "OTHER"
  difficultyLevel: number | null
  level: number
  isPublished: boolean
  updatedAt: string
  multipleChoiceCount: number
  codingTaskCount: number
  submissionsCount: number
}

export default function AdminExercisesPage() {
  const [items, setItems] = useState<ExerciseListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<ExerciseListItem[]>("/admin/exercises")
      setItems(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const removeItem = async (id: string) => {
    const ok = confirm("删除这套题库？提交记录也会一起不可用。")
    if (!ok) return
    setError(null)
    try {
      await apiFetch(`/admin/exercises/${id}`, { method: "DELETE" })
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "删除失败")
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Exercise Banks</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            管理习题大全内容，并查看学生提交的编程题答案。
          </p>
        </div>
        <Link
          href="/admin/exercises/create"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          新建题库
        </Link>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
        <div className="grid grid-cols-12 gap-2 bg-zinc-950/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:bg-white/5 dark:text-zinc-200">
          <div className="col-span-4">题库</div>
          <div className="col-span-1">科目</div>
          <div className="col-span-1">难度</div>
          <div className="col-span-2">状态</div>
          <div className="col-span-2">提交数</div>
          <div className="col-span-1">更新时间</div>
          <div className="col-span-1 text-right">操作</div>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-sm text-zinc-600 dark:text-zinc-300">
            加载中...
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-sm text-zinc-600 dark:text-zinc-300">
            还没有题库，先创建一套。
          </div>
        ) : (
          <div className="divide-y divide-black/10 bg-white/50 text-sm dark:divide-white/10 dark:bg-zinc-950/40">
            {items.map(item => (
              <div
                key={item.id}
                className="grid grid-cols-12 items-center gap-2 px-4 py-3"
              >
                <div className="col-span-4 min-w-0">
                  <div className="truncate font-medium text-zinc-950 dark:text-white">
                    {item.title}
                  </div>
                  <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    /{item.slug} · {item.multipleChoiceCount} 选择 / {item.codingTaskCount} 编程
                  </div>
                </div>
                <div className="col-span-1 text-zinc-700 dark:text-zinc-200">
                  {item.subject === "SCRATCH" ? "Scratch" : "C++"}
                </div>
                <div className="col-span-1 text-zinc-700 dark:text-zinc-200">
                  {item.difficultyType === "OTHER" ? "其他" : `${item.difficultyLevel ?? item.level} 级`}
                </div>
                <div className="col-span-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {item.isPublished ? "已发布" : "草稿"}
                </div>
                <div className="col-span-2 text-zinc-700 dark:text-zinc-200">
                  {item.submissionsCount}
                </div>
                <div className="col-span-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(item.updatedAt).toLocaleDateString()}
                </div>
                <div className="col-span-1 flex justify-end gap-2">
                  <Link
                    href={`/admin/exercises/${item.id}`}
                    className="rounded-lg border border-black/10 bg-white/70 px-2 py-1 text-xs font-semibold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  >
                    编辑
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="rounded-lg border border-red-500/25 bg-red-500/5 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-500/10 dark:text-red-200"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
