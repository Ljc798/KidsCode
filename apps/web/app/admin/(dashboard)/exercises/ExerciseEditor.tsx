"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { apiFetch } from "@/app/lib/api"

type MultipleChoiceQuestion = {
  id: string
  prompt: string
  options: { id: string; text: string }[]
  correctOptionId: string
}

type CodingTask = {
  id: string
  title: string
  description: string
  inputDescription: string
  outputDescription: string
  sampleInput1: string
  sampleOutput1: string
  sampleInput2: string
  sampleOutput2: string
  placeholder?: string | null
}

type ExerciseBankDetail = {
  id: string
  slug: string
  title: string
  summary: string | null
  imageUrl: string | null
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
  level: string
  isPublished: boolean
  multipleChoice: MultipleChoiceQuestion[]
  codingTasks: CodingTask[]
}

let uid = 0
function nextId(prefix: string) {
  uid += 1
  return `${prefix}-${Date.now()}-${uid}`
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
    options,
    correctOptionId: options[0].id
  }
}

function createCodingTask(): CodingTask {
  return {
    id: nextId("coding"),
    title: "",
    description: "",
    inputDescription: "",
    outputDescription: "",
    sampleInput1: "",
    sampleOutput1: "",
    sampleInput2: "",
    sampleOutput2: "",
    placeholder: ""
  }
}

const emptyForm = (): FormState => ({
  slug: "",
  title: "",
  summary: "",
  imageUrl: "",
  level: "1",
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
          level: String(data.level),
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
      const payload = {
        ...form,
        level: Number(form.level)
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

          <div className="grid gap-4 lg:grid-cols-[1fr_160px_180px]">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">封面图片 URL</span>
              <input
                value={form.imageUrl}
                onChange={event => setForm(current => ({ ...current, imageUrl: event.target.value }))}
                className="h-10 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">等级</span>
              <select
                value={form.level}
                onChange={event => setForm(current => ({ ...current, level: event.target.value }))}
                className="h-10 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
              >
                {Array.from({ length: 18 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    {index + 1} 级
                  </option>
                ))}
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
                        required
                      />
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
