"use client"

import { useEffect, useState } from "react"
import TopNav from "@/app/components/TopNav"
import { apiFetch } from "@/app/lib/api"

type MaterialItem = {
  id: string
  kind: "SCRATCH" | "CPP" | "ZIP"
  title: string
  description: string | null
  weekTag: string | null
  cppCode: string | null
  fileName: string | null
  mimeType: string | null
  size: number | null
  hasDownload: boolean
  createdAt: string
  updatedAt: string
}

export default function MaterialsPage() {
  const [items, setItems] = useState<MaterialItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await apiFetch<{ ok: true; items: MaterialItem[] }>("/materials")
        setItems(data.items)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "加载失败")
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const download = async (id: string) => {
    setError(null)
    try {
      const data = await apiFetch<{ ok: true; url: string }>(`/materials/${id}/download-url`)
      window.open(data.url, "_blank", "noopener,noreferrer")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "下载失败")
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.100),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.950),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.950),transparent)]">
      <TopNav active="materials" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60">
          <h1 className="text-2xl font-semibold tracking-tight">课件资源</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            这里集中展示老师课间资源：Scratch 示例文件、ZIP 素材包和 C++ 标准答案。
          </p>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <div className="mt-5 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
            <div className="grid grid-cols-12 gap-2 bg-zinc-950/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:bg-white/5 dark:text-zinc-200">
              <div className="col-span-2">类型</div>
              <div className="col-span-4">标题</div>
              <div className="col-span-2">周次</div>
              <div className="col-span-2">文件</div>
              <div className="col-span-2 text-right">操作</div>
            </div>

            {loading ? (
              <div className="px-4 py-8 text-sm text-zinc-600 dark:text-zinc-300">加载中...</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-sm text-zinc-600 dark:text-zinc-300">暂无资源。</div>
            ) : (
              <div className="divide-y divide-black/10 bg-white/50 text-sm dark:divide-white/10 dark:bg-zinc-950/40">
                {items.map(item => (
                  <div key={item.id} className="grid grid-cols-12 items-center gap-2 px-4 py-3">
                    <div className="col-span-2 text-xs font-semibold">
                      {item.kind === "SCRATCH" ? "Scratch" : item.kind === "ZIP" ? "ZIP" : "C++"}
                    </div>
                    <div className="col-span-4 min-w-0">
                      <div className="truncate font-medium text-zinc-950 dark:text-white">
                        {item.title}
                      </div>
                      {item.description ? (
                        <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {item.description}
                        </div>
                      ) : null}
                    </div>
                    <div className="col-span-2 text-xs text-zinc-600 dark:text-zinc-300">
                      {item.weekTag || "-"}
                    </div>
                    <div className="col-span-2 truncate text-xs text-zinc-600 dark:text-zinc-300">
                      {item.fileName || "-"}
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/materials/${encodeURIComponent(item.id)}`}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-black/15 bg-white/80 px-3 text-xs font-semibold text-zinc-800 hover:bg-white dark:border-white/15 dark:bg-white/10 dark:text-zinc-100"
                        >
                          查看详情
                        </a>
                        {item.hasDownload ? (
                          <button
                            onClick={() => download(item.id)}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 text-xs font-semibold text-sky-700 hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-sky-200"
                          >
                            下载
                          </button>
                        ) : (
                          <button
                            onClick={() => navigator.clipboard.writeText(item.cppCode ?? "")}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-200"
                          >
                            复制代码
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
