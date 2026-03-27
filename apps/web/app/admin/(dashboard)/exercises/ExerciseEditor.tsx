"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { apiFetch } from "@/app/lib/api"

type MultipleChoiceQuestion = {
  id: string
  prompt: string
  promptImageUrl?: string | null
  options: { id: string; text: string; imageUrl?: string | null }[]
  correctOptionId: string
}

type CodingTask = {
  id: string
  title: string
  description: string
  materialRequirement?: string | null
  scoringRubric?: string | null
  requirementSteps?: Array<{
    id: string
    text: string
    imageUrl?: string | null
  }>
  inputDescription: string
  outputDescription: string
  sampleInput1: string
  sampleOutput1: string
  sampleInput2: string
  sampleOutput2: string
  answerMode?: "TEXT" | "SCRATCH_FILE"
  descriptionImageUrl?: string | null
  referenceImageUrls?: string[]
  placeholder?: string | null
}

type ExerciseBankDetail = {
  id: string
  slug: string
  title: string
  summary: string | null
  imageUrl: string | null
  subject: "CPP" | "SCRATCH"
  difficultyType: "LEVEL" | "OTHER"
  difficultyLevel: number | null
  level: number
  multipleChoice: MultipleChoiceQuestion[]
  codingTasks: CodingTask[]
  isPublished: boolean
}

type FormState = {
  slug: string
  title: string
  summary: string
  imageUrl: string
  subject: "CPP" | "SCRATCH"
  difficultyType: "LEVEL" | "OTHER"
  difficultyLevel: string
  isPublished: boolean
  multipleChoice: MultipleChoiceQuestion[]
  codingTasks: CodingTask[]
}

let uid = 0
function nextId(prefix: string) {
  uid += 1
  return `${prefix}-${Date.now()}-${uid}`
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "")
    reader.onerror = () => reject(new Error("读取文件失败"))
    reader.readAsDataURL(file)
  })
}

function createChoiceQuestion(): MultipleChoiceQuestion {
  const qid = nextId("q")
  const options = Array.from({ length: 4 }, (_, index) => ({
    id: `${qid}-o${index + 1}`,
    text: ""
  }))
  return {
    id: qid,
    prompt: "",
    promptImageUrl: "",
    options,
    correctOptionId: options[0].id
  }
}

function createCodingTask(): CodingTask {
  return {
    id: nextId("coding"),
    title: "",
    description: "",
    materialRequirement: "",
    scoringRubric: "",
    requirementSteps: [],
    inputDescription: "",
    outputDescription: "",
    sampleInput1: "",
    sampleOutput1: "",
    sampleInput2: "",
    sampleOutput2: "",
    answerMode: "TEXT",
    descriptionImageUrl: "",
    referenceImageUrls: [],
    placeholder: ""
  }
}

const emptyForm = (): FormState => ({
  slug: "",
  title: "",
  summary: "",
  imageUrl: "",
  subject: "CPP",
  difficultyType: "LEVEL",
  difficultyLevel: "1",
  isPublished: true,
  multipleChoice: [createChoiceQuestion()],
  codingTasks: [createCodingTask()]
})

export default function ExerciseEditor({
  exerciseId
}: {
  exerciseId?: string
}) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(Boolean(exerciseId))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)

  useEffect(() => {
    if (!exerciseId) return

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await apiFetch<ExerciseBankDetail>(`/admin/exercises/${exerciseId}`)
        setForm({
          slug: data.slug,
          title: data.title,
          summary: data.summary ?? "",
          imageUrl: data.imageUrl ?? "",
          subject: data.subject ?? "CPP",
          difficultyType: data.difficultyType ?? "LEVEL",
          difficultyLevel: String(data.difficultyLevel ?? data.level ?? 1),
          isPublished: data.isPublished,
          multipleChoice: data.multipleChoice,
          codingTasks: data.codingTasks
        })
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "加载失败")
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [exerciseId])

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const levelValue =
        form.difficultyType === "LEVEL" ? Number(form.difficultyLevel || "1") : 0
      const payload = {
        ...form,
        level: levelValue,
        difficultyLevel: form.difficultyType === "LEVEL" ? levelValue : undefined
      }
      if (exerciseId) {
        await apiFetch(`/admin/exercises/${exerciseId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        })
      } else {
        await apiFetch("/admin/exercises", {
          method: "POST",
          body: JSON.stringify(payload)
        })
      }
      router.push("/admin/exercises")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  const updateQuestion = (
    id: string,
    updater: (question: MultipleChoiceQuestion) => MultipleChoiceQuestion
  ) => {
    setForm(current => ({
      ...current,
      multipleChoice: current.multipleChoice.map(question =>
        question.id === id ? updater(question) : question
      )
    }))
  }

  const updateCodingTask = (
    id: string,
    updater: (task: CodingTask) => CodingTask
  ) => {
    setForm(current => ({
      ...current,
      codingTasks: current.codingTasks.map(task => (task.id === id ? updater(task) : task))
    }))
  }

  const uploadAsset = async (
    targetKey: string,
    questionId: string,
    file: File,
    applyUrl: (url: string) => void
  ) => {
    setUploadingKey(targetKey)
    setError(null)
    try {
      const content = await readFileAsDataUrl(file)
      const response = await apiFetch<{
        ok: true
        file: { url: string }
      }>("/admin/exercises/asset-upload", {
        method: "POST",
        body: JSON.stringify({
          subject: form.subject,
          difficultyType: form.difficultyType,
          difficultyLevel:
            form.difficultyType === "LEVEL" ? Number(form.difficultyLevel || 1) : undefined,
          slug: form.slug || form.title || "exercise",
          questionId,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          content
        })
      })
      applyUrl(response.file.url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "上传图片失败")
    } finally {
      setUploadingKey(null)
    }
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white/75 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {exerciseId ? "编辑题库" : "新建题库"}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            选择题和编程题数量都可以自由增减，学生端会按你的配置自动展示。
          </p>
        </div>
        <Link
          href="/admin/exercises"
          className="text-sm font-semibold text-zinc-800 hover:underline dark:text-zinc-200"
        >
          返回列表
        </Link>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : null}
      {uploadingKey ? (
        <div className="mt-4 rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm text-sky-700 dark:text-sky-200">
          正在上传资源到 COS...
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 text-sm text-zinc-600 dark:text-zinc-300">加载中...</div>
      ) : (
        <form onSubmit={handleSave} className="mt-6 grid gap-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">标题</span>
              <input
                value={form.title}
                onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
                className="h-10 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
                required
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">Slug</span>
              <input
                value={form.slug}
                onChange={event => setForm(current => ({ ...current, slug: event.target.value }))}
                className="h-10 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
                required
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_160px_160px_180px]">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">封面图片 URL</span>
              <input
                value={form.imageUrl}
                onChange={event => setForm(current => ({ ...current, imageUrl: event.target.value }))}
                className="h-10 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">科目</span>
              <select
                value={form.subject}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    subject: event.target.value === "SCRATCH" ? "SCRATCH" : "CPP"
                  }))
                }
                className="h-10 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
              >
                <option value="CPP">C++</option>
                <option value="SCRATCH">Scratch</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">难度</span>
              <select
                value={
                  form.difficultyType === "OTHER"
                    ? "OTHER"
                    : form.difficultyLevel || "1"
                }
                onChange={event =>
                  setForm(current => {
                    const next = event.target.value
                    if (next === "OTHER") {
                      return {
                        ...current,
                        difficultyType: "OTHER",
                        difficultyLevel: "0"
                      }
                    }
                    return {
                      ...current,
                      difficultyType: "LEVEL",
                      difficultyLevel: next
                    }
                  })
                }
                className="h-10 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
              >
                {Array.from({ length: 18 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    {index + 1} 级
                  </option>
                ))}
                <option value="OTHER">其他</option>
              </select>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-900/40">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={event =>
                  setForm(current => ({ ...current, isPublished: event.target.checked }))
                }
              />
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">立即发布</span>
            </label>
          </div>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">题库简介</span>
            <textarea
              value={form.summary}
              onChange={event => setForm(current => ({ ...current, summary: event.target.value }))}
              className="min-h-24 rounded-xl border border-black/10 bg-white/70 px-3 py-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
            />
          </label>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">选择题</h2>
              <button
                type="button"
                onClick={() =>
                  setForm(current => ({
                    ...current,
                    multipleChoice: [...current.multipleChoice, createChoiceQuestion()]
                  }))
                }
                className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950"
              >
                新增选择题
              </button>
            </div>

            {form.multipleChoice.map((question, questionIndex) => (
              <div
                key={question.id}
                className="rounded-2xl border border-black/10 bg-zinc-50/80 p-5 dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    选择题 {questionIndex + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm(current => ({
                        ...current,
                        multipleChoice: current.multipleChoice.filter(item => item.id !== question.id)
                      }))
                    }
                    className="rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-200"
                  >
                    删除
                  </button>
                </div>

                <label className="mt-3 grid gap-1 text-sm">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">题目</span>
                  <textarea
                    value={question.prompt}
                    onChange={event =>
                      updateQuestion(question.id, current => ({
                        ...current,
                        prompt: event.target.value
                      }))
                    }
                    className="min-h-20 rounded-xl border border-black/10 bg-white/80 px-3 py-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                    required
                  />
                </label>
                {form.subject === "SCRATCH" ? (
                <div className="mt-3 grid gap-2 text-sm">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">题干图片 URL（可选）</span>
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={question.promptImageUrl ?? ""}
                      onChange={event =>
                        updateQuestion(question.id, current => ({
                          ...current,
                          promptImageUrl: event.target.value
                        }))
                      }
                      className="h-10 min-w-[220px] flex-1 rounded-xl border border-black/10 bg-white/80 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                    />
                    <label className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-black/10 px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5">
                      上传到 COS
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async event => {
                          const input = event.currentTarget
                          const file = event.target.files?.[0]
                          if (!file) return
                          await uploadAsset(
                            `q-${question.id}-prompt`,
                            `${question.id}-prompt`,
                            file,
                            url =>
                              updateQuestion(question.id, current => ({
                                ...current,
                                promptImageUrl: url
                              }))
                          )
                          input.value = ""
                        }}
                      />
                    </label>
                  </div>
                  {question.promptImageUrl ? (
                    <img
                      src={question.promptImageUrl}
                      alt="题干图片预览"
                      className="max-h-56 rounded-xl border border-black/10 object-contain dark:border-white/10"
                    />
                  ) : null}
                </div>
                ) : null}

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {question.options.map((option, optionIndex) => (
                    <label key={option.id} className="grid gap-1 text-sm">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        选项 {optionIndex + 1}
                      </span>
                      <input
                        value={option.text}
                        onChange={event =>
                          updateQuestion(question.id, current => ({
                            ...current,
                            options: current.options.map(item =>
                              item.id === option.id ? { ...item, text: event.target.value } : item
                            )
                          }))
                        }
                        className="h-10 rounded-xl border border-black/10 bg-white/80 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                        required={form.subject === "CPP"}
                      />
                      {form.subject === "SCRATCH" ? (
                      <>
                      <div className="flex flex-wrap gap-2">
                        <input
                          value={option.imageUrl ?? ""}
                          onChange={event =>
                            updateQuestion(question.id, current => ({
                              ...current,
                              options: current.options.map(item =>
                                item.id === option.id ? { ...item, imageUrl: event.target.value } : item
                              )
                            }))
                          }
                          placeholder="选项图片 URL（可选）"
                          className="h-10 min-w-[220px] flex-1 rounded-xl border border-black/10 bg-white/80 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                        />
                        <label className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-black/10 px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5">
                          上传到 COS
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async event => {
                              const input = event.currentTarget
                              const file = event.target.files?.[0]
                              if (!file) return
                              await uploadAsset(
                                `q-${question.id}-opt-${option.id}`,
                                `${question.id}-option-${optionIndex + 1}`,
                                file,
                                url =>
                                  updateQuestion(question.id, current => ({
                                    ...current,
                                    options: current.options.map(item =>
                                      item.id === option.id ? { ...item, imageUrl: url } : item
                                    )
                                  }))
                              )
                              input.value = ""
                            }}
                          />
                        </label>
                      </div>
                      {option.imageUrl ? (
                        <img
                          src={option.imageUrl}
                          alt={`选项 ${optionIndex + 1} 图片`}
                          className="max-h-40 rounded-xl border border-black/10 object-contain dark:border-white/10"
                        />
                      ) : null}
                      </>
                      ) : null}
                    </label>
                  ))}
                </div>

                <label className="mt-4 grid gap-1 text-sm">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">正确答案</span>
                  <select
                    value={question.correctOptionId}
                    onChange={event =>
                      updateQuestion(question.id, current => ({
                        ...current,
                        correctOptionId: event.target.value
                      }))
                    }
                    className="h-10 rounded-xl border border-black/10 bg-white/80 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                  >
                    {question.options.map((option, optionIndex) => (
                      <option key={option.id} value={option.id}>
                        选项 {optionIndex + 1}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-white">编程题</h2>
              <button
                type="button"
                onClick={() =>
                  setForm(current => ({
                    ...current,
                    codingTasks: [...current.codingTasks, createCodingTask()]
                  }))
                }
                className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950"
              >
                新增编程题
              </button>
            </div>

            {form.codingTasks.map((task, index) => (
              <div
                key={task.id}
                className="rounded-2xl border border-black/10 bg-zinc-50/80 p-5 dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    编程题 {index + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm(current => ({
                        ...current,
                        codingTasks: current.codingTasks.filter(item => item.id !== task.id)
                      }))
                    }
                    className="rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-200"
                  >
                    删除
                  </button>
                </div>

                <div className="mt-4 grid gap-4">
                  <label className="grid gap-1 text-sm">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">标题</span>
                    <input
                      value={task.title}
                      onChange={event =>
                        updateCodingTask(task.id, current => ({
                          ...current,
                          title: event.target.value
                        }))
                      }
                      className="h-10 rounded-xl border border-black/10 bg-white/80 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                      required
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">题目描述</span>
                    <textarea
                      value={task.description}
                      onChange={event =>
                        updateCodingTask(task.id, current => ({
                          ...current,
                          description: event.target.value
                        }))
                      }
                      className="min-h-28 rounded-xl border border-black/10 bg-white/80 px-3 py-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                      required
                    />
                  </label>
                  {form.subject === "SCRATCH" ? (
                  <label className="grid gap-1 text-sm">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">素材要求（可选）</span>
                    <textarea
                      value={task.materialRequirement ?? ""}
                      onChange={event =>
                        updateCodingTask(task.id, current => ({
                          ...current,
                          materialRequirement: event.target.value
                        }))
                      }
                      className="min-h-20 rounded-xl border border-black/10 bg-white/80 px-3 py-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                    />
                  </label>
                  ) : null}
                  {form.subject === "SCRATCH" ? (
                  <label className="grid gap-1 text-sm">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">作答方式</span>
                    <select
                      value={task.answerMode ?? "TEXT"}
                      onChange={event =>
                        updateCodingTask(task.id, current => ({
                          ...current,
                          answerMode:
                            event.target.value === "SCRATCH_FILE" ? "SCRATCH_FILE" : "TEXT"
                        }))
                      }
                      className="h-10 rounded-xl border border-black/10 bg-white/80 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                    >
                      <option value="TEXT">文本代码输入</option>
                      <option value="SCRATCH_FILE">上传 Scratch 文件(.sb3)</option>
                    </select>
                  </label>
                  ) : null}
                  {form.subject === "SCRATCH" ? (
                  <label className="grid gap-1 text-sm">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">评分标准（可选）</span>
                    <textarea
                      value={task.scoringRubric ?? ""}
                      onChange={event =>
                        updateCodingTask(task.id, current => ({
                          ...current,
                          scoringRubric: event.target.value
                        }))
                      }
                      className="min-h-20 rounded-xl border border-black/10 bg-white/80 px-3 py-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                    />
                  </label>
                  ) : null}
                  {form.subject === "SCRATCH" ? (
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">具体要求（分步图文）</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateCodingTask(task.id, current => ({
                            ...current,
                            requirementSteps: [
                              ...(current.requirementSteps ?? []),
                              { id: nextId("step"), text: "", imageUrl: "" }
                            ]
                          }))
                        }
                        className="rounded-lg border border-black/10 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
                      >
                        新增步骤
                      </button>
                    </div>
                    {(task.requirementSteps ?? []).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-black/10 px-3 py-3 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                        还没有步骤，点击“新增步骤”
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(task.requirementSteps ?? []).map((step, stepIndex) => (
                          <div
                            key={step.id}
                            className="rounded-xl border border-black/10 bg-white/70 p-3 dark:border-white/10 dark:bg-zinc-950/40"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                                步骤 {stepIndex + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateCodingTask(task.id, current => ({
                                    ...current,
                                    requirementSteps: (current.requirementSteps ?? []).filter(
                                      item => item.id !== step.id
                                    )
                                  }))
                                }
                                className="rounded-lg border border-red-500/25 bg-red-500/5 px-2 py-1 text-xs font-semibold text-red-700 dark:text-red-200"
                              >
                                删除
                              </button>
                            </div>
                            <textarea
                              value={step.text}
                              onChange={event =>
                                updateCodingTask(task.id, current => ({
                                  ...current,
                                  requirementSteps: (current.requirementSteps ?? []).map(item =>
                                    item.id === step.id ? { ...item, text: event.target.value } : item
                                  )
                                }))
                              }
                              placeholder="步骤说明文字"
                              className="min-h-20 w-full rounded-xl border border-black/10 bg-white/80 px-3 py-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                            />
                            <div className="mt-2 flex flex-wrap gap-2">
                              <input
                                value={step.imageUrl ?? ""}
                                onChange={event =>
                                  updateCodingTask(task.id, current => ({
                                    ...current,
                                    requirementSteps: (current.requirementSteps ?? []).map(item =>
                                      item.id === step.id ? { ...item, imageUrl: event.target.value } : item
                                    )
                                  }))
                                }
                                placeholder="步骤图片 URL（可选）"
                                className="h-10 min-w-[220px] flex-1 rounded-xl border border-black/10 bg-white/80 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                              />
                              <label className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-black/10 px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5">
                                上传到 COS
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async event => {
                                    const input = event.currentTarget
                                    const file = event.target.files?.[0]
                                    if (!file) return
                                    await uploadAsset(
                                      `coding-${task.id}-step-${step.id}`,
                                      `${task.id}-step-${stepIndex + 1}`,
                                      file,
                                      url =>
                                        updateCodingTask(task.id, current => ({
                                          ...current,
                                          requirementSteps: (current.requirementSteps ?? []).map(item =>
                                            item.id === step.id ? { ...item, imageUrl: url } : item
                                          )
                                        }))
                                    )
                                    input.value = ""
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  ) : null}
                  {form.subject === "SCRATCH" ? (
                  <div className="grid gap-2 text-sm">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">描述图片 URL（可选）</span>
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={task.descriptionImageUrl ?? ""}
                        onChange={event =>
                          updateCodingTask(task.id, current => ({
                            ...current,
                            descriptionImageUrl: event.target.value
                          }))
                        }
                        className="h-10 min-w-[220px] flex-1 rounded-xl border border-black/10 bg-white/80 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                      />
                      <label className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-black/10 px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5">
                        上传到 COS
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async event => {
                            const input = event.currentTarget
                            const file = event.target.files?.[0]
                            if (!file) return
                            await uploadAsset(
                              `coding-${task.id}-desc`,
                              `${task.id}-desc`,
                              file,
                              url =>
                                updateCodingTask(task.id, current => ({
                                  ...current,
                                  descriptionImageUrl: url
                                }))
                            )
                            input.value = ""
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  ) : null}
                  {form.subject === "SCRATCH" ? (
                  <label className="grid gap-1 text-sm">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">参考图片 URL（每行一个，可选）</span>
                    <textarea
                      value={(task.referenceImageUrls ?? []).join("\n")}
                      onChange={event =>
                        updateCodingTask(task.id, current => ({
                          ...current,
                          referenceImageUrls: event.target.value
                            .split("\n")
                            .map(line => line.trim())
                            .filter(Boolean)
                        }))
                      }
                      className="min-h-24 rounded-xl border border-black/10 bg-white/80 px-3 py-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                    />
                  </label>
                  ) : null}
                  {form.subject === "CPP" ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <label className="grid gap-1 text-sm">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">输入</span>
                      <textarea
                        value={task.inputDescription}
                        onChange={event =>
                          updateCodingTask(task.id, current => ({
                            ...current,
                            inputDescription: event.target.value
                          }))
                        }
                        className="min-h-24 rounded-xl border border-black/10 bg-white/80 px-3 py-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">输出</span>
                      <textarea
                        value={task.outputDescription}
                        onChange={event =>
                          updateCodingTask(task.id, current => ({
                            ...current,
                            outputDescription: event.target.value
                          }))
                        }
                        className="min-h-24 rounded-xl border border-black/10 bg-white/80 px-3 py-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                      />
                    </label>
                  </div>
                  ) : null}
                  {form.subject === "CPP" ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <label className="grid gap-1 text-sm">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">输入样例 1</span>
                      <textarea
                        value={task.sampleInput1}
                        onChange={event =>
                          updateCodingTask(task.id, current => ({
                            ...current,
                            sampleInput1: event.target.value
                          }))
                        }
                        className="min-h-24 rounded-xl border border-black/10 bg-white/80 px-3 py-3 font-mono outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">输出样例 1</span>
                      <textarea
                        value={task.sampleOutput1}
                        onChange={event =>
                          updateCodingTask(task.id, current => ({
                            ...current,
                            sampleOutput1: event.target.value
                          }))
                        }
                        className="min-h-24 rounded-xl border border-black/10 bg-white/80 px-3 py-3 font-mono outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                      />
                    </label>
                  </div>
                  ) : null}
                  {form.subject === "CPP" ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <label className="grid gap-1 text-sm">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">输入样例 2</span>
                      <textarea
                        value={task.sampleInput2}
                        onChange={event =>
                          updateCodingTask(task.id, current => ({
                            ...current,
                            sampleInput2: event.target.value
                          }))
                        }
                        className="min-h-24 rounded-xl border border-black/10 bg-white/80 px-3 py-3 font-mono outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                      />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">输出样例 2</span>
                      <textarea
                        value={task.sampleOutput2}
                        onChange={event =>
                          updateCodingTask(task.id, current => ({
                            ...current,
                            sampleOutput2: event.target.value
                          }))
                        }
                        className="min-h-24 rounded-xl border border-black/10 bg-white/80 px-3 py-3 font-mono outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                      />
                    </label>
                  </div>
                  ) : null}
                  {form.subject === "CPP" ? (
                  <label className="grid gap-1 text-sm">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">输入框提示语</span>
                    <input
                      value={task.placeholder ?? ""}
                      onChange={event =>
                        updateCodingTask(task.id, current => ({
                          ...current,
                          placeholder: event.target.value
                        }))
                      }
                      className="h-10 rounded-xl border border-black/10 bg-white/80 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                    />
                  </label>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {saving ? "保存中..." : exerciseId ? "保存修改" : "创建题库"}
            </button>
          </div>
        </form>
      )}

    </div>
  )
}
