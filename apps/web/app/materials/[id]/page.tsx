"use client"

import Link from "next/link"
import { use, useEffect, useMemo, useState } from "react"
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

export default function MaterialDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [item, setItem] = useState<MaterialItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await apiFetch<{ ok: true; item: MaterialItem }>(`/materials/${encodeURIComponent(id)}`)
        setItem(data.item)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "加载失败")
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [id])

  const scratchPreviewSrc = useMemo(() => {
    if (!item || item.kind !== "SCRATCH" || !item.hasDownload) return ""
    return `/scratch-gui/player.html?locale=zh-cn&project=${encodeURIComponent(
      `/api/materials/${item.id}/download`
    )}`
  }, [item])

  const download = async () => {
    if (!item) return
    setError(null)
    try {
      const data = await apiFetch<{ ok: true; url: string }>(
        `/materials/${encodeURIComponent(item.id)}/download-url`
      )
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
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">资源详情</h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                C++ 展示代码；Scratch 显示预览；ZIP 只展示元信息和下载。
              </p>
            </div>
            <Link
              href="/materials"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 bg-white/70 px-4 text-sm font-semibold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              返回列表
            </Link>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-200">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-5 text-sm text-zinc-600 dark:text-zinc-300">加载中...</div>
          ) : !item ? (
            <div className="mt-5 text-sm text-zinc-600 dark:text-zinc-300">未找到资源。</div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-black/10 bg-white/70 p-4 text-sm dark:border-white/10 dark:bg-white/5">
                <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{item.title}</div>
                <div className="mt-2 grid gap-2 text-zinc-600 dark:text-zinc-300 sm:grid-cols-2">
                  <div>类型：{item.kind}</div>
                  <div>周次：{item.weekTag || "-"}</div>
                  <div>文件名：{item.fileName || "-"}</div>
                  <div>大小：{item.size ?? 0}</div>
                </div>
                {item.description ? <div className="mt-2 text-zinc-700 dark:text-zinc-200">说明：{item.description}</div> : null}
                {item.hasDownload ? (
                  <button
                    onClick={download}
                    className="mt-3 inline-flex h-9 items-center justify-center rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 text-xs font-semibold text-sky-700 hover:bg-sky-500/15 dark:text-sky-200"
                  >
                    下载文件
                  </button>
                ) : null}
              </div>

              {item.kind === "CPP" ? (
                <div className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">C++ 标准答案</div>
                  <pre className="mt-3 overflow-x-auto rounded-xl border border-black/10 bg-zinc-950 p-3 text-xs text-zinc-100 dark:border-white/10">
                    <code>{item.cppCode || ""}</code>
                  </pre>
                </div>
              ) : null}

              {item.kind === "SCRATCH" && scratchPreviewSrc ? (
                <div className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Scratch 预览</div>
                  <div className="mt-3 h-[68vh] overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-900/40">
                    <iframe
                      title="Scratch 资源预览"
                      src={scratchPreviewSrc}
                      className="h-full w-full"
                      allow="clipboard-read; clipboard-write"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
