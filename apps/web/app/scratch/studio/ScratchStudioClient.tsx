"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import ScratchEmbeddedEditor from "@/app/scratch/studio/ScratchEmbeddedEditor"

type ProjectCategory = "PERSONAL" | "CLASSROOM"

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "")
    reader.onerror = () => reject(new Error("读取文件失败"))
    reader.readAsDataURL(file)
  })
}

export default function ScratchStudioClient() {
  const [category, setCategory] = useState<ProjectCategory>("CLASSROOM")
  const [title, setTitle] = useState("")
  const [weekNumber, setWeekNumber] = useState("")
  const [ideaNote, setIdeaNote] = useState("")
  const [commonMistakes, setCommonMistakes] = useState("")
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [uploadRequestId, setUploadRequestId] = useState<string | null>(null)

  const canSubmit = useMemo(
    () => !!title.trim() && (category === "PERSONAL" || !!weekNumber.trim()),
    [category, title, weekNumber]
  )

  const submitFromEditor = () => {
    if (!canSubmit) return
    const frame = document.getElementById("kidscode-scratch-editor-frame") as HTMLIFrameElement | null
    if (!frame?.contentWindow) {
      setError("编辑器尚未就绪，请稍后重试。")
      return
    }

    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setUploadRequestId(requestId)
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    frame.contentWindow.postMessage(
      {
        type: "KIDSCODE_UPLOAD_SCRATCH",
        requestId,
        payload: {
          category,
          weekNumber: category === "CLASSROOM" ? weekNumber : undefined,
          title: title.trim(),
          ideaNote: ideaNote.trim(),
          commonMistakes: category === "CLASSROOM" ? commonMistakes.trim() : undefined
        }
      },
      window.location.origin
    )
  }

  const submitByFile = async () => {
    if (!pickedFile || !canSubmit) return
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const content = await readFileAsDataUrl(pickedFile)
      const payload = {
        category,
        weekNumber: category === "CLASSROOM" ? weekNumber : undefined,
        title: title.trim(),
        ideaNote: ideaNote.trim(),
        commonMistakes: category === "CLASSROOM" ? commonMistakes.trim() : undefined,
        kind: "SCRATCH",
        content,
        fileName: pickedFile.name,
        mimeType: pickedFile.type || "application/octet-stream"
      }

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const data = (await res.json().catch(() => ({ ok: false }))) as
        | { ok: true; project: { id: string } }
        | { ok?: false; error?: string }

      if (!res.ok || !data.ok) {
        throw new Error(("error" in data && data.error) || "上传失败")
      }

      setSuccess("作品已上传到 COS。你可以去“我的空间”或老师端查看。")
      setPickedFile(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "上传失败")
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const data = event.data as
        | { type?: string; requestId?: string; ok?: boolean; error?: string }
        | undefined
      if (!data || data.type !== "KIDSCODE_UPLOAD_RESULT") return
      if (!uploadRequestId || data.requestId !== uploadRequestId) return

      setSubmitting(false)
      setUploadRequestId(null)
      if (data.ok) {
        setSuccess("已一键上传到 COS。你可以去“我的空间”或老师端查看。")
      } else {
        setError(data.error || "上传失败")
      }
    }

    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [uploadRequestId])

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950/60">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
              Scratch 在线创作
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              直接在本站内搭积木，可一键上传到 KidsCode（会存入 COS）。
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/me"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              返回我的空间
            </Link>
          </div>
        </div>

        <div className="mt-6">
          <ScratchEmbeddedEditor />
        </div>

        <div className="mt-4 rounded-2xl border border-black/10 bg-zinc-50/80 p-5 dark:border-white/10 dark:bg-zinc-900/40">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            当前说明
          </div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            推荐在上方内嵌编辑器中创作，然后点击“一键上传当前作品”直接入库。
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
            <li>在上方编辑器完成作品。</li>
            <li>填写下方作品信息（分类、标题、周次等）。</li>
            <li>点击“一键上传当前作品”。</li>
          </ol>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
            {success}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="flex flex-wrap gap-2 md:col-span-2">
            {(["CLASSROOM", "PERSONAL"] as ProjectCategory[]).map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold ${
                  category === item
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                    : "border border-black/10 text-zinc-700 dark:border-white/10 dark:text-zinc-300"
                }`}
              >
                {item === "CLASSROOM" ? "课堂创作" : "自我创作"}
              </button>
            ))}
          </div>

          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">作品名称</span>
            <input
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="例如：第二周迷宫"
              className="h-11 rounded-xl border border-black/10 bg-white px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
            />
          </label>

          {category === "CLASSROOM" ? (
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">第几周</span>
              <input
                value={weekNumber}
                onChange={event => setWeekNumber(event.target.value)}
                placeholder="例如：2"
                className="h-11 rounded-xl border border-black/10 bg-white px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
              />
            </label>
          ) : null}

          <label className="grid gap-2 text-sm md:col-span-2">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">思路（可选）</span>
            <textarea
              value={ideaNote}
              onChange={event => setIdeaNote(event.target.value)}
              rows={3}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
            />
          </label>

          {category === "CLASSROOM" ? (
            <label className="grid gap-2 text-sm md:col-span-2">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">本节课易错点（可选）</span>
              <textarea
                value={commonMistakes}
                onChange={event => setCommonMistakes(event.target.value)}
                rows={3}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
              />
            </label>
          ) : null}

          <label className="grid gap-2 text-sm md:col-span-2">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">上传 .sb3 文件</span>
            <input
              type="file"
              accept=".sb3,.sb2,.sb,application/octet-stream"
              onChange={event => setPickedFile(event.target.files?.[0] ?? null)}
              className="rounded-xl border border-dashed border-black/15 bg-white px-3 py-4 text-sm outline-none dark:border-white/10 dark:bg-zinc-900/40"
            />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {pickedFile ? `已选择：${pickedFile.name}` : "请选择 Scratch 项目文件"}
            </span>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={submitFromEditor}
            disabled={submitting || !canSubmit}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {submitting ? "上传中..." : "一键上传当前作品"}
          </button>
          <button
            type="button"
            onClick={submitByFile}
            disabled={submitting || !pickedFile || !canSubmit}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-black/10 px-5 text-sm font-semibold text-zinc-800 disabled:opacity-50 dark:border-white/10 dark:text-zinc-200"
          >
            {submitting ? "上传中..." : "备用：上传 .sb3 文件"}
          </button>
        </div>
      </div>
    </main>
  )
}
