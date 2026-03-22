"use client"

import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/app/lib/api"

type ReviewListItem = {
  id: string
  title: string
  kind: "SCRATCH" | "CPP" | "OTHER"
  weekNumber: number | null
  reviewStatus: "NONE" | "PENDING" | "REVIEWED"
  teacherComment: string | null
  fileName: string | null
  size: number
  createdAt: string
  reviewedAt: string | null
  displayName: string
  student: {
    id: string
    nickname: string
    className: string | null
    account: string
  }
}

type ReviewDetail = {
  id: string
  title: string
  kind: "SCRATCH" | "CPP" | "OTHER"
  category: "CLASSROOM"
  uploaderName: string | null
  weekNumber: number | null
  ideaNote: string | null
  content: string
  fileName: string | null
  mimeType: string | null
  size: number
  reviewStatus: "NONE" | "PENDING" | "REVIEWED"
  teacherComment: string | null
  createdAt: string
  reviewedAt: string | null
  displayName: string
  canDownload: boolean
  student: {
    id: string
    nickname: string
    className: string | null
    account: string
  }
}

function statusLabel(status: ReviewListItem["reviewStatus"]) {
  return status === "REVIEWED" ? "已批改" : status === "PENDING" ? "待批改" : "未开始"
}

function formatDateTimeToMinute(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  })
}

const PAGE_SIZE = 8

export default function AdminProjectReviewsPage() {
  const [items, setItems] = useState<ReviewListItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ReviewDetail | null>(null)
  const [teacherComment, setTeacherComment] = useState("")
  const [weekNumber, setWeekNumber] = useState("all")
  const [kind, setKind] = useState("all")
  const [reviewStatus, setReviewStatus] = useState("all")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (weekNumber !== "all") params.set("weekNumber", weekNumber)
      if (kind !== "all") params.set("kind", kind)
      if (reviewStatus !== "all") params.set("reviewStatus", reviewStatus)
      const query = params.toString() ? `?${params.toString()}` : ""
      const data = await apiFetch<{ items: ReviewListItem[] }>(`/admin/project-reviews${query}`)
      setItems(data.items)
      setCurrentPage(1)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [weekNumber, kind, reviewStatus])

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const pagedItems = useMemo(
    () => items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, items]
  )

  useEffect(() => {
    if (!activeId) {
      setDetail(null)
      setTeacherComment("")
      return
    }

    const run = async () => {
      setError(null)
      try {
        const data = await apiFetch<ReviewDetail>(`/admin/project-reviews/${activeId}`)
        setDetail(data)
        setTeacherComment(data.teacherComment ?? "")
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "加载详情失败")
      }
    }

    run()
  }, [activeId])

  const saveReview = async () => {
    if (!detail) return
    setSaving(true)
    setError(null)
    try {
      await apiFetch(`/admin/project-reviews/${detail.id}`, {
        method: "PATCH",
        body: JSON.stringify({ teacherComment })
      })
      await load()
      const refreshed = await apiFetch<ReviewDetail>(`/admin/project-reviews/${detail.id}`)
      setDetail(refreshed)
      setTeacherComment(refreshed.teacherComment ?? "")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  const downloadScratch = async () => {
    if (!detail) return
    setError(null)
    try {
      const data = await apiFetch<{ ok: true; url: string }>(
        `/admin/project-reviews/${detail.id}/download-url`
      )
      window.open(data.url, "_blank", "noopener,noreferrer")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "获取下载链接失败")
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">课堂创作批改</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          这里集中查看课堂创作，并给学生写评语。
        </p>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
          <div className="grid grid-cols-3 gap-2 border-b border-black/10 bg-zinc-950/5 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <select
              value={weekNumber}
              onChange={event => setWeekNumber(event.target.value)}
              className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm dark:border-white/10 dark:bg-zinc-950/60"
            >
              <option value="all">全部周次</option>
              {Array.from({ length: 20 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  第 {index + 1} 周
                </option>
              ))}
            </select>
            <select
              value={kind}
              onChange={event => setKind(event.target.value)}
              className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm dark:border-white/10 dark:bg-zinc-950/60"
            >
              <option value="all">全部类型</option>
              <option value="SCRATCH">Scratch</option>
              <option value="CPP">C++</option>
            </select>
            <select
              value={reviewStatus}
              onChange={event => setReviewStatus(event.target.value)}
              className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm dark:border-white/10 dark:bg-zinc-950/60"
            >
              <option value="all">全部状态</option>
              <option value="PENDING">待批改</option>
              <option value="REVIEWED">已批改</option>
            </select>
          </div>

          {loading ? (
            <div className="px-4 py-8 text-sm text-zinc-600 dark:text-zinc-300">加载中...</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-8 text-sm text-zinc-600 dark:text-zinc-300">暂无课堂创作。</div>
          ) : (
            <div className="divide-y divide-black/10 dark:divide-white/10">
              {pagedItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className="w-full px-4 py-4 text-left hover:bg-zinc-50/80 dark:hover:bg-white/5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate font-semibold text-zinc-950 dark:text-white">
                      {item.displayName}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {statusLabel(item.reviewStatus)}
                    </div>
                  </div>
                  <div className="mt-2 truncate text-sm text-zinc-700 dark:text-zinc-200">
                    {item.student.nickname} · {item.title}
                  </div>
                  <div className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {item.kind} · {item.fileName ?? "无文件名"}
                  </div>
                  <div className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    提交时间：{formatDateTimeToMinute(item.createdAt)}
                  </div>
                </button>
              ))}
              <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-zinc-600 dark:text-zinc-300">
                <div>
                  第 {currentPage} / {totalPages} 页
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-black/10 px-3 py-1.5 disabled:opacity-40 dark:border-white/10"
                  >
                    上一页
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(page => Math.min(page + 1, totalPages))}
                    disabled={currentPage >= totalPages}
                    className="rounded-lg border border-black/10 px-3 py-1.5 disabled:opacity-40 dark:border-white/10"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
          {detail ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white dark:bg-white dark:text-zinc-950">
                  {detail.kind}
                </span>
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                  {detail.displayName}
                </span>
              </div>

              <h2 className="mt-4 text-2xl font-black text-zinc-950 dark:text-white">
                {detail.title}
              </h2>

              <div className="mt-3 grid gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <div>学生：{detail.student.nickname} / {detail.student.account}</div>
                <div>班级：{detail.student.className ?? "未分班"}</div>
                <div>文件：{detail.fileName ?? "无"}</div>
                <div>提交时间：{formatDateTimeToMinute(detail.createdAt)}</div>
              </div>

              {detail.ideaNote ? (
                <div className="mt-5 rounded-2xl border border-black/10 bg-zinc-50 p-4 text-sm dark:border-white/10 dark:bg-zinc-900/40">
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                    学生思路
                  </div>
                  <div className="mt-2 whitespace-pre-wrap break-words">{detail.ideaNote}</div>
                </div>
              ) : null}

              {detail.kind === "SCRATCH" && detail.canDownload ? (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={downloadScratch}
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                  >
                    下载 Scratch 原文件
                  </button>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-black/10 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900/40">
                  <pre className="max-h-[38vh] overflow-auto whitespace-pre-wrap break-words font-mono text-sm leading-7 text-zinc-700 dark:text-zinc-200">
                    {detail.content}
                  </pre>
                </div>
              )}

              <div className="mt-5">
                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">老师评语</span>
                  <textarea
                    value={teacherComment}
                    onChange={event => setTeacherComment(event.target.value)}
                    placeholder="写给学生的建议、鼓励或改进方向"
                    className="min-h-32 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                  />
                </label>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={saveReview}
                    disabled={saving || !teacherComment.trim()}
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                  >
                    {saving ? "保存中..." : "保存评语"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              从左侧选择一条课堂创作，查看内容并批改。
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
