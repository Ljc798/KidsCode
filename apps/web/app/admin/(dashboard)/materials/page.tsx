"use client"

import { useCallback, useEffect, useState } from "react"
import { apiFetch } from "@/app/lib/api"

type MaterialKind = "SCRATCH" | "CPP" | "ZIP"

type TeachingMaterial = {
  id: string
  kind: MaterialKind
  title: string
  description: string | null
  weekTag: string | null
  cppCode: string | null
  fileName: string | null
  mimeType: string | null
  size: number | null
  objectKey: string | null
  createdAt: string
  updatedAt: string
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("文件读取失败"))
        return
      }
      resolve(reader.result)
    }
    reader.onerror = () => reject(new Error("文件读取失败"))
    reader.readAsDataURL(file)
  })
}

export default function AdminMaterialsPage() {
  const [items, setItems] = useState<TeachingMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [kind, setKind] = useState<MaterialKind>("SCRATCH")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [weekTag, setWeekTag] = useState("")
  const [cppCode, setCppCode] = useState("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<{ ok: true; items: TeachingMaterial[] }>("/admin/materials")
      setItems(data.items)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "加载资源失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setWeekTag("")
    setCppCode("")
    setUploadFile(null)
  }

  const createItem = async () => {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      if (!title.trim()) throw new Error("请先填写标题")
      const payload: Record<string, unknown> = {
        kind,
        title: title.trim(),
        description: description.trim(),
        weekTag: weekTag.trim()
      }

      if (kind === "CPP") {
        if (!cppCode.trim()) throw new Error("请先填写 C++ 标准答案")
        payload.cppCode = cppCode
      } else {
        if (!uploadFile) throw new Error(kind === "ZIP" ? "请先选择 ZIP 文件" : "请先选择 Scratch 文件")
        const lowerName = uploadFile.name.toLowerCase()
        if (kind === "ZIP" && !lowerName.endsWith(".zip")) {
          throw new Error("ZIP 资源请上传 .zip 文件")
        }
        if (kind === "SCRATCH" && !lowerName.endsWith(".sb3")) {
          throw new Error("Scratch 资源请上传 .sb3 文件")
        }
        const content = await readFileAsDataUrl(uploadFile)
        payload.content = content
        payload.fileName = uploadFile.name
        payload.mimeType = uploadFile.type || "application/octet-stream"
      }

      await apiFetch("/admin/materials", {
        method: "POST",
        body: JSON.stringify(payload)
      })
      setNotice("资源已保存")
      resetForm()
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  const onPickUploadFile = (file: File | null) => {
    setUploadFile(file)
    if (!file) return
    const lowerName = file.name.toLowerCase()
    if (lowerName.endsWith(".zip")) {
      setKind("ZIP")
      return
    }
    if (lowerName.endsWith(".sb3")) {
      setKind("SCRATCH")
    }
  }

  const removeItem = async (id: string) => {
    const ok = confirm("确定删除这个资源吗？")
    if (!ok) return
    setError(null)
    setNotice(null)
    try {
      await apiFetch(`/admin/materials/${id}`, { method: "DELETE" })
      setNotice("资源已删除")
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "删除失败")
    }
  }

  const downloadMaterial = async (id: string) => {
    setError(null)
    try {
      const data = await apiFetch<{ ok: true; url: string }>(`/admin/materials/${id}/download-url`)
      window.open(data.url, "_blank", "noopener,noreferrer")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "获取下载链接失败")
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Materials</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          课件资源库：支持 Scratch 示例文件、ZIP 素材包和 C++ 标准答案。
        </p>
      </div>

      {notice ? (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span>资源类型</span>
            <select
              value={kind}
              onChange={event => setKind(event.target.value as MaterialKind)}
              className="h-10 rounded-xl border border-black/10 bg-white px-3 dark:border-white/10 dark:bg-zinc-950/60"
            >
              <option value="SCRATCH">Scratch 示例文件</option>
              <option value="ZIP">ZIP 素材包</option>
              <option value="CPP">C++ 标准答案</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>标题</span>
            <input
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="例如：第4周 分支判断示例"
              className="h-10 rounded-xl border border-black/10 bg-white px-3 dark:border-white/10 dark:bg-zinc-950/60"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>周次标签（可选）</span>
            <input
              value={weekTag}
              onChange={event => setWeekTag(event.target.value)}
              placeholder="例如：第4周"
              className="h-10 rounded-xl border border-black/10 bg-white px-3 dark:border-white/10 dark:bg-zinc-950/60"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span>说明（可选）</span>
            <input
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="这份资源适合什么时候用"
              className="h-10 rounded-xl border border-black/10 bg-white px-3 dark:border-white/10 dark:bg-zinc-950/60"
            />
          </label>
          {kind === "CPP" ? (
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span>C++ 标准答案代码</span>
              <textarea
                value={cppCode}
                onChange={event => setCppCode(event.target.value)}
                rows={10}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 font-mono text-xs dark:border-white/10 dark:bg-zinc-950/60"
              />
            </label>
          ) : (
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span>{kind === "ZIP" ? "ZIP 文件（.zip）" : "Scratch 文件（.sb3）"}</span>
              <input
                type="file"
                accept=""
                onChange={event => onPickUploadFile(event.target.files?.[0] ?? null)}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-950/60"
              />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {uploadFile ? `已选择：${uploadFile.name}` : "尚未选择文件"}
              </span>
            </label>
          )}
        </div>

        <div className="mt-3">
          <button
            onClick={createItem}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 text-sm font-semibold text-sky-700 shadow-sm hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-sky-200"
          >
            {saving ? "保存中..." : "保存资源"}
          </button>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
        <div className="grid grid-cols-12 gap-2 bg-zinc-950/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:bg-white/5 dark:text-zinc-200">
          <div className="col-span-2">Type</div>
          <div className="col-span-4">Title</div>
          <div className="col-span-3">Week</div>
          <div className="col-span-3 text-right">Actions</div>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-sm text-zinc-600 dark:text-zinc-300">加载中...</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-sm text-zinc-600 dark:text-zinc-300">
            还没有资源，先在上面新增一条。
          </div>
        ) : (
          <div className="divide-y divide-black/10 bg-white/50 text-sm dark:divide-white/10 dark:bg-zinc-950/40">
            {items.map(item => (
              <div key={item.id} className="grid grid-cols-12 items-center gap-2 px-4 py-3">
                <div className="col-span-2 text-xs font-semibold">
                  {item.kind === "SCRATCH" ? "Scratch" : item.kind === "ZIP" ? "ZIP" : "C++"}
                </div>
                <div className="col-span-4 min-w-0">
                  <div className="truncate font-medium text-zinc-950 dark:text-white">{item.title}</div>
                  {item.description ? (
                    <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{item.description}</div>
                  ) : null}
                </div>
                <div className="col-span-3 text-xs text-zinc-600 dark:text-zinc-300">
                  {item.weekTag || "-"}
                </div>
                <div className="col-span-3 flex justify-end gap-2">
                  {item.objectKey ? (
                    <button
                      onClick={() => downloadMaterial(item.id)}
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 text-xs font-semibold text-sky-700 hover:bg-sky-500/15 dark:text-sky-200"
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
                  <button
                    onClick={() => removeItem(item.id)}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-red-500/25 bg-red-500/10 px-3 text-xs font-semibold text-red-700 hover:bg-red-500/15 dark:text-red-200"
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
