"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import type { ChangeEvent } from "react"
import CodeEditor from "@/app/exercises/CodeEditor"

type ProjectKind = "SCRATCH" | "OTHER" | "CPP"
type ProjectCategory = "PERSONAL" | "CLASSROOM"
type UploadKind = "SCRATCH" | "CPP"

type ProjectSummary = {
  id: string
  kind: ProjectKind
  category: ProjectCategory
  title: string
  displayName: string
  uploaderName?: string | null
  weekNumber?: number | null
  ideaNote?: string | null
  commonMistakes?: string | null
  fileName: string | null
  mimeType: string | null
  preview: string
  size: number
  canDownload?: boolean
  reviewStatus?: "NONE" | "PENDING" | "REVIEWED"
  teacherComment?: string | null
  reviewedAt?: string | null
  createdAt: string
  updatedAt: string
}

type ProjectDetail = ProjectSummary & {
  content: string
}

type ProjectsResponse =
  | {
      ok: true
      projects: ProjectSummary[]
    }
  | {
      ok?: false
      error?: string
    }

const kindLabel: Record<ProjectKind, string> = {
  SCRATCH: "Scratch",
  OTHER: "其他",
  CPP: "C++"
}

const categoryLabel: Record<ProjectCategory, string> = {
  PERSONAL: "自我创作",
  CLASSROOM: "课堂创作"
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date)
}

function formatMonthDayTime(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date)
}

function formatSize(kind: ProjectKind, size: number) {
  if (kind === "CPP") return `${size} 字`
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function reviewStatusLabel(status?: "NONE" | "PENDING" | "REVIEWED") {
  if (status === "REVIEWED") return "已批改"
  if (status === "PENDING") return "待批改"
  return "无需批改"
}

export default function MySpacePanel() {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [activeProject, setActiveProject] = useState<ProjectDetail | null>(null)
  const [saving, setSaving] = useState(false)
  const [downloadLoadingId, setDownloadLoadingId] = useState<string | null>(null)
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null)
  const [copying, setCopying] = useState(false)
  const [editingDetail, setEditingDetail] = useState(false)
  const [category, setCategory] = useState<ProjectCategory>("PERSONAL")
  const [activeTab, setActiveTab] = useState<ProjectCategory>("PERSONAL")
  const [kind, setKind] = useState<UploadKind>("SCRATCH")
  const [fileName, setFileName] = useState("")
  const [weekNumber, setWeekNumber] = useState("")
  const [ideaNote, setIdeaNote] = useState("")
  const [commonMistakes, setCommonMistakes] = useState("")
  const [selectedLocalFileName, setSelectedLocalFileName] = useState("")
  const [fileMimeType, setFileMimeType] = useState("")
  const [fileContent, setFileContent] = useState("")
  const [editCategory, setEditCategory] = useState<ProjectCategory>("PERSONAL")
  const [editWeekNumber, setEditWeekNumber] = useState("")
  const [editTitle, setEditTitle] = useState("")
  const [editIdeaNote, setEditIdeaNote] = useState("")
  const [editCommonMistakes, setEditCommonMistakes] = useState("")
  const [editLocalFileName, setEditLocalFileName] = useState("")
  const [editMimeType, setEditMimeType] = useState("")
  const [editContent, setEditContent] = useState("")

  const loadProjects = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/projects/mine", { cache: "no-store" })
      const data = (await res.json().catch(() => ({ ok: false }))) as ProjectsResponse
      if (!res.ok || !data.ok) {
        throw new Error(("error" in data && data.error) || "加载作品失败")
      }
      setProjects(data.projects)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "加载作品失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const resetEditor = () => {
    setCategory("PERSONAL")
    setKind("SCRATCH")
    setFileName("")
    setWeekNumber("")
    setIdeaNote("")
    setCommonMistakes("")
    setSelectedLocalFileName("")
    setFileMimeType("")
    setFileContent("")
  }

  const onPickFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setSelectedLocalFileName("")
      setFileMimeType("")
      setFileContent("")
      return
    }

    const reader = new FileReader()
    const result = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "")
      reader.onerror = () => reject(new Error("读取文件失败"))
      reader.readAsDataURL(file)
    })

    setSelectedLocalFileName(file.name)
    if (!fileName.trim()) setFileName(file.name)
    setFileMimeType(file.type || "application/octet-stream")
    setFileContent(result)
  }

  const submitProject = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        category,
        weekNumber: category === "CLASSROOM" ? weekNumber : undefined,
        ideaNote,
        commonMistakes: category === "CLASSROOM" ? commonMistakes : undefined,
        kind,
        title: fileName,
        content: fileContent,
        fileName: kind === "SCRATCH" ? selectedLocalFileName || fileName : fileName,
        mimeType: kind === "SCRATCH" ? fileMimeType : "text/x-c++src"
      }

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const data = (await res.json().catch(() => ({ ok: false }))) as
        | { ok: true }
        | { ok?: false; error?: string }
      if (!res.ok || !data.ok) {
        throw new Error(("error" in data && data.error) || "上传作品失败")
      }
      resetEditor()
      setEditorOpen(false)
      setActiveTab(category)
      await loadProjects()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "上传作品失败")
    } finally {
      setSaving(false)
    }
  }

  const openProject = async (project: ProjectSummary) => {
    setDetailLoadingId(project.id)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        cache: "no-store"
      })
      const data = (await res.json().catch(() => ({ ok: false }))) as
        | { ok: true; project: ProjectDetail }
        | { ok?: false; error?: string }
      if (!res.ok || !data.ok) {
        throw new Error(("error" in data && data.error) || "加载作品详情失败")
      }
      setActiveProject(data.project)
      setEditingDetail(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "加载作品详情失败")
    } finally {
      setDetailLoadingId(null)
    }
  }

  const filteredProjects = projects.filter(project => project.category === activeTab)

  const onCppChange = (value: string) => {
    setFileContent(value)
  }

  const downloadScratch = async (projectId: string) => {
    setDownloadLoadingId(projectId)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/download-url`, {
        cache: "no-store"
      })
      const data = (await res.json().catch(() => ({ ok: false }))) as
        | { ok: true; url: string }
        | { ok?: false; error?: string }
      if (!res.ok || !data.ok) {
        throw new Error(("error" in data && data.error) || "获取下载链接失败")
      }
      window.open(data.url, "_blank", "noopener,noreferrer")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "获取下载链接失败")
    } finally {
      setDownloadLoadingId(null)
    }
  }

  const copyCppContent = async (content: string) => {
    setCopying(true)
    setError(null)
    try {
      await navigator.clipboard.writeText(content)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "复制失败")
    } finally {
      window.setTimeout(() => setCopying(false), 1200)
    }
  }

  const startEditProject = () => {
    if (!activeProject) return
    setEditCategory(activeProject.category)
    setEditWeekNumber(activeProject.weekNumber ? String(activeProject.weekNumber) : "")
    setEditTitle(activeProject.title)
    setEditIdeaNote(activeProject.ideaNote ?? "")
    setEditCommonMistakes(activeProject.commonMistakes ?? "")
    setEditLocalFileName("")
    setEditMimeType(activeProject.mimeType ?? "")
    setEditContent(activeProject.kind === "CPP" ? activeProject.content : "")
    setEditingDetail(true)
  }

  const onEditScratchFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setEditLocalFileName("")
      return
    }

    const reader = new FileReader()
    const result = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "")
      reader.onerror = () => reject(new Error("读取文件失败"))
      reader.readAsDataURL(file)
    })

    setEditLocalFileName(file.name)
    setEditMimeType(file.type || "application/octet-stream")
    setEditContent(result)
  }

  const saveEditedProject = async () => {
    if (!activeProject) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        category: editCategory,
        weekNumber: editCategory === "CLASSROOM" ? editWeekNumber : undefined,
        title: editTitle,
        ideaNote: editIdeaNote,
        commonMistakes: editCategory === "CLASSROOM" ? editCommonMistakes : undefined,
        fileName: activeProject.kind === "SCRATCH" ? editLocalFileName || activeProject.fileName || editTitle : editTitle,
        mimeType: activeProject.kind === "SCRATCH" ? editMimeType : "text/x-c++src",
        content: activeProject.kind === "SCRATCH" ? editContent : editContent
      }

      const res = await fetch(`/api/projects/${activeProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      const data = (await res.json().catch(() => ({ ok: false }))) as
        | { ok: true; project: ProjectDetail }
        | { ok?: false; error?: string }
      if (!res.ok || !data.ok) {
        throw new Error(("error" in data && data.error) || "保存失败")
      }
      setActiveProject(data.project)
      setEditingDetail(false)
      await loadProjects()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-3xl border border-black/5 bg-white/60 p-5 dark:border-white/10 dark:bg-zinc-950/40">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-sm font-extrabold">我的空间</div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            作品分为“自我创作”和“课堂创作”。课堂创作会记录第几周，并支持老师批改评语。
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>Scratch：按分类上传到 COS</span>
            <span>C++：支持代码编辑器输入</span>
            <span>课堂创作需要填写第几周</span>
            <span>课堂创作可以查看老师评语</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/scratch/studio"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-4 text-sm font-extrabold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            在线搭积木
          </Link>
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            上传作品
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        {(["PERSONAL", "CLASSROOM"] as ProjectCategory[]).map(item => (
          <button
            key={item}
            type="button"
            onClick={() => setActiveTab(item)}
            className={`inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-extrabold ${
              activeTab === item
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                : "border border-black/10 bg-white/60 text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
            }`}
          >
            {categoryLabel[item]}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="rounded-3xl border border-dashed border-black/10 bg-white/50 px-5 py-8 text-sm text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
            正在加载你的作品...
          </div>
        ) : filteredProjects.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map(project => (
              <button
                key={project.id}
                type="button"
                onClick={() => openProject(project)}
                className="group flex min-h-60 flex-col rounded-[1.6rem] border border-black/8 bg-white/75 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white dark:bg-white dark:text-zinc-950">
                      {kindLabel[project.kind]}
                    </span>
                    <span className="rounded-full border border-black/10 px-3 py-1 text-[11px] font-bold text-zinc-600 dark:border-white/10 dark:text-zinc-300">
                      {categoryLabel[project.category]}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDate(project.updatedAt)}
                  </span>
                </div>

                <h3 className="mt-4 truncate text-lg font-black text-zinc-950 dark:text-white">
                  {project.title}
                </h3>

                <div className="mt-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  {project.displayName}
                </div>

                <p className="mt-2 line-clamp-4 whitespace-pre-wrap break-words text-sm text-zinc-600 dark:text-zinc-300">
                  {project.preview || "暂无预览内容"}
                </p>

                <div className="mt-auto pt-5 text-xs text-zinc-500 dark:text-zinc-400">
                  {detailLoadingId === project.id ? <div className="truncate">正在加载完整内容...</div> : null}
                  {project.category === "CLASSROOM" ? (
                    <div className="truncate">评语状态：{reviewStatusLabel(project.reviewStatus)}</div>
                  ) : null}
                  <div className="truncate">大小：{formatSize(project.kind, project.size)}</div>
                  {project.fileName ? <div className="mt-1 truncate">文件：{project.fileName}</div> : null}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-black/10 bg-white/50 px-5 py-8 text-sm text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
            这个分类下还没有作品。
          </div>
        )}
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xl font-black text-zinc-950 dark:text-white">上传作品</div>
                <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  先选择“自我创作”还是“课堂创作”，再上传 Scratch 或提交 C++ 代码。
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditorOpen(false)
                  resetEditor()
                }}
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-zinc-700 dark:border-white/10 dark:text-zinc-200"
              >
                关闭
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {(["PERSONAL", "CLASSROOM"] as ProjectCategory[]).map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-extrabold ${
                    category === item
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                      : "border border-black/10 bg-white/60 text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  }`}
                >
                  {categoryLabel[item]}
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {(["SCRATCH", "CPP"] as UploadKind[]).map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setKind(item)
                    setSelectedLocalFileName("")
                    setFileMimeType(item === "CPP" ? "text/x-c++src" : "")
                    setFileContent("")
                  }}
                  className={`inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-extrabold ${
                    kind === item
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                      : "border border-black/10 bg-white/60 text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  }`}
                >
                  {kindLabel[item]}
                </button>
              ))}
            </div>

            <div className="mt-6 grid gap-4">
              <div className={`grid gap-4 ${category === "CLASSROOM" ? "md:grid-cols-2" : ""}`}>
                {category === "CLASSROOM" ? (
                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">第几周</span>
                    <input
                      value={weekNumber}
                      onChange={event => setWeekNumber(event.target.value)}
                      placeholder="例如 2"
                      className="h-11 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                    />
                  </label>
                ) : null}

                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">作品名称</span>
                  <input
                    value={fileName}
                    onChange={event => setFileName(event.target.value)}
                    placeholder={kind === "SCRATCH" ? "例如 植树节贺卡" : "例如 猜数字.cpp"}
                    className="h-11 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">思路（可选）</span>
                <textarea
                  value={ideaNote}
                  onChange={event => setIdeaNote(event.target.value)}
                  placeholder="可以简单写一下自己是怎么做的，不写也可以"
                  className="min-h-24 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                />
              </label>

              {category === "CLASSROOM" ? (
                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">本节课易错点（可选）</span>
                  <textarea
                    value={commonMistakes}
                    onChange={event => setCommonMistakes(event.target.value)}
                    placeholder="比如：for 循环条件容易写错、变量名容易混淆"
                    className="min-h-24 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                  />
                </label>
              ) : null}

              {kind === "SCRATCH" ? (
                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">Scratch 文件</span>
                  <input
                    type="file"
                    accept=".sb3,.sb2,.sb,application/octet-stream"
                    onChange={onPickFile}
                    className="rounded-xl border border-dashed border-black/15 bg-white/70 px-3 py-4 text-sm outline-none dark:border-white/10 dark:bg-zinc-950/40"
                  />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {selectedLocalFileName
                      ? `已选择本地文件：${selectedLocalFileName}`
                      : "请选择一个 Scratch 项目文件"}
                  </span>
                </label>
              ) : (
                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">C++ 代码</span>
                  <CodeEditor
                    value={fileContent}
                    onChange={onCppChange}
                    placeholder={`#include <iostream>
using namespace std;

int main() {
  cout << "Hello KidsCode";
  return 0;
}`}
                    className="min-h-72 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 font-mono text-sm outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                  />
                </label>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={submitProject}
                disabled={
                  saving ||
                  !fileName.trim() ||
                  (category === "CLASSROOM" && !weekNumber.trim()) ||
                  (kind === "SCRATCH" ? !fileContent || !selectedLocalFileName : !fileContent.trim())
                }
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {saving ? "保存中..." : "上传作品"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditorOpen(false)
                  resetEditor()
                }}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-4 text-sm font-extrabold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {activeProject ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white dark:bg-white dark:text-zinc-950">
                    {kindLabel[activeProject.kind]}
                  </span>
                  <span className="rounded-full border border-black/10 px-3 py-1 text-[11px] font-bold text-zinc-600 dark:border-white/10 dark:text-zinc-300">
                    {categoryLabel[activeProject.category]}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {activeProject.displayName}
                  </span>
                </div>
                <div className="mt-3 text-2xl font-black text-zinc-950 dark:text-white">
                  {activeProject.title}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!editingDetail ? (
                  <button
                    type="button"
                    onClick={startEditProject}
                    className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-zinc-700 dark:border-white/10 dark:text-zinc-200"
                  >
                    编辑
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setActiveProject(null)
                    setEditingDetail(false)
                  }}
                  className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-zinc-700 dark:border-white/10 dark:text-zinc-200"
                >
                  关闭
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-400">
              <span>大小：{formatSize(activeProject.kind, activeProject.size)}</span>
              {activeProject.fileName ? <span>文件：{activeProject.fileName}</span> : null}
              {activeProject.weekNumber ? <span>第 {activeProject.weekNumber} 周</span> : null}
            </div>

            {editingDetail ? (
              <div className="mt-5 grid gap-4">
                <div className="flex flex-wrap gap-3">
                  {(["PERSONAL", "CLASSROOM"] as ProjectCategory[]).map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setEditCategory(item)}
                      className={`inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-extrabold ${
                        editCategory === item
                          ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                          : "border border-black/10 bg-white/60 text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      }`}
                    >
                      {categoryLabel[item]}
                    </button>
                  ))}
                </div>

                <div className={`grid gap-4 ${editCategory === "CLASSROOM" ? "md:grid-cols-2" : ""}`}>
                  {editCategory === "CLASSROOM" ? (
                    <label className="grid gap-2 text-sm">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">第几周</span>
                      <input
                        value={editWeekNumber}
                        onChange={event => setEditWeekNumber(event.target.value)}
                        className="h-11 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                      />
                    </label>
                  ) : null}

                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">作品名称</span>
                    <input
                      value={editTitle}
                      onChange={event => setEditTitle(event.target.value)}
                      className="h-11 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                    />
                  </label>
                </div>

                <label className="grid gap-2 text-sm">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">思路（可选）</span>
                  <textarea
                    value={editIdeaNote}
                    onChange={event => setEditIdeaNote(event.target.value)}
                    className="min-h-24 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                  />
                </label>

                {editCategory === "CLASSROOM" ? (
                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">本节课易错点（可选）</span>
                    <textarea
                      value={editCommonMistakes}
                      onChange={event => setEditCommonMistakes(event.target.value)}
                      className="min-h-24 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                    />
                  </label>
                ) : null}

                {activeProject.kind === "SCRATCH" ? (
                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">重新上传 Scratch 文件（可选）</span>
                    <input
                      type="file"
                      accept=".sb3,.sb2,.sb,application/octet-stream"
                      onChange={onEditScratchFile}
                      className="rounded-xl border border-dashed border-black/15 bg-white/70 px-3 py-4 text-sm outline-none dark:border-white/10 dark:bg-zinc-950/40"
                    />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {editLocalFileName ? `已选择：${editLocalFileName}` : "不重新上传则保留原文件"}
                    </span>
                  </label>
                ) : (
                  <label className="grid gap-2 text-sm">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">C++ 代码</span>
                    <CodeEditor
                      value={editContent}
                      onChange={setEditContent}
                      className="min-h-72 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 font-mono text-sm outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                    />
                  </label>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={saveEditedProject}
                    disabled={
                      saving ||
                      !editTitle.trim() ||
                      (editCategory === "CLASSROOM" && !editWeekNumber.trim()) ||
                      (activeProject.kind === "CPP" && !editContent.trim())
                    }
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                  >
                    {saving ? "保存中..." : "保存修改"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingDetail(false)}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-4 text-sm font-extrabold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : activeProject.ideaNote ? (
              <div className="mt-5 rounded-[1.5rem] border border-black/8 bg-white/70 p-4 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                  思路
                </div>
                <div className="mt-2 whitespace-pre-wrap break-words">{activeProject.ideaNote}</div>
              </div>
            ) : null}

            {activeProject.commonMistakes ? (
              <div className="mt-5 rounded-[1.5rem] border border-amber-500/15 bg-amber-500/5 p-4 text-sm text-zinc-700 dark:text-zinc-200">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
                  本节课易错点
                </div>
                <div className="mt-2 whitespace-pre-wrap break-words">{activeProject.commonMistakes}</div>
              </div>
            ) : null}

            {activeProject.category === "CLASSROOM" ? (
              <div className="mt-5 rounded-[1.5rem] border border-emerald-500/15 bg-emerald-500/5 p-4 text-sm text-zinc-700 dark:text-zinc-200">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                    老师评语
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {reviewStatusLabel(activeProject.reviewStatus)}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatMonthDayTime(activeProject.reviewedAt ?? activeProject.createdAt)}
                  </div>
                </div>
                <div className="mt-2 whitespace-pre-wrap break-words">
                  {activeProject.teacherComment || "老师还没有写评语。"}
                </div>
              </div>
            ) : null}

            {activeProject.kind === "SCRATCH" && activeProject.canDownload ? (
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => downloadScratch(activeProject.id)}
                  disabled={downloadLoadingId === activeProject.id}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  {downloadLoadingId === activeProject.id ? "生成下载链接中..." : "下载 Scratch"}
                </button>
              </div>
            ) : null}

            {activeProject.kind === "SCRATCH" && activeProject.canDownload ? (
              <div className="mt-5 rounded-[1.5rem] border border-black/8 bg-zinc-50 p-4 dark:border-white/10 dark:bg-black/20">
                <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                  Scratch 在线预览
                </div>
                <iframe
                  title="Scratch Preview"
                  src={`/scratch-gui/player.html?locale=zh-cn&project=${encodeURIComponent(`/api/projects/${activeProject.id}/download`)}`}
                  className="h-[420px] w-full rounded-xl border border-black/10 dark:border-white/10"
                  allowFullScreen
                />
              </div>
            ) : null}

            {activeProject.kind === "CPP" ? (
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => copyCppContent(activeProject.content)}
                  disabled={copying}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white/70 px-5 text-sm font-extrabold text-zinc-900 hover:bg-white disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  {copying ? "已复制" : "复制代码"}
                </button>
              </div>
            ) : null}

            {!editingDetail ? (
              <div className="mt-5 rounded-[1.5rem] border border-black/8 bg-zinc-50 p-4 dark:border-white/10 dark:bg-black/20">
                <pre className="h-[52vh] overflow-y-auto whitespace-pre-wrap break-words font-mono text-sm leading-7 text-zinc-700 dark:text-zinc-200">
                  {activeProject.content || "暂无内容"}
                </pre>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
