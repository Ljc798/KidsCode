"use client"

import { createPortal } from "react-dom"
import { useEffect, useMemo, useRef, useState } from "react"
import { apiFetch } from "@/app/lib/api"

type ReviewListItem = {
  id: string
  multipleChoiceScore: number
  multipleChoiceTotal: number
  multipleChoicePoints: number
  codingPoints: number
  codingMaxPoints: number
  totalPoints: number
  totalMaxPoints: number
  codingStatus: "PENDING" | "REVIEWED"
  codingIsCorrect: boolean | null
  teacherFeedback: string | null
  createdAt: string
  reviewedAt: string | null
  exercise: {
    id: string
    title: string
    level: number
    slug: string
  }
  student: {
    id: string
    nickname: string
    className: string | null
    account: string
  }
}

type ReviewDetail = {
  id: string
  multipleChoiceAnswers: Array<{
    questionId: string
    selectedOptionId: string | null
    correctOptionId: string
    isCorrect: boolean
  }>
  multipleChoiceFeedback: Array<{
    questionId: string
    comment: string
  }>
  multipleChoiceScore: number
  multipleChoiceTotal: number
  multipleChoicePoints: number
  codingAnswer: string
  codingAnswers: Array<{
    taskId: string
    title: string
    answer: string
  }>
  codingPoints: number
  codingMaxPoints: number
  totalPoints: number
  totalMaxPoints: number
  codingStatus: "PENDING" | "REVIEWED"
  codingIsCorrect: boolean | null
  teacherFeedback: string | null
  createdAt: string
  reviewedAt: string | null
  exercise: {
    id: string
    title: string
    level: number
    multipleChoice: Array<{
      id: string
      prompt: string
      options: Array<{ id: string; text: string }>
      correctOptionId: string
    }>
    codingTasks: Array<{
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
    }>
  }
  student: {
    id: string
    nickname: string
    className: string | null
    account: string
  }
}

type ReviewListResponse = {
  items: ReviewListItem[]
  filters: {
    students: Array<{
      id: string
      nickname: string
      className: string | null
      account: string
    }>
  }
}

type ReviewStep =
  | {
      kind: "choice"
      key: string
      order: number
      title: string
      question: ReviewDetail["exercise"]["multipleChoice"][number]
    }
  | {
      kind: "coding"
      key: string
      order: number
      title: string
      task: ReviewDetail["exercise"]["codingTasks"][number]
    }

function PromptText({ text, code = false }: { text: string; code?: boolean }) {
  if (code) {
    return (
      <pre className="whitespace-pre-wrap rounded-[1.1rem] bg-zinc-950 px-4 py-3 font-mono text-[13px] leading-6 text-zinc-100">
        {text || "无"}
      </pre>
    )
  }

  return <div className="whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-200">{text || "无"}</div>
}

function statusLabel(status: "PENDING" | "REVIEWED") {
  return status === "REVIEWED" ? "已批改" : "待批改"
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

const PAGE_SIZE = 10

export default function AdminReviewsPage() {
  const queryAppliedRef = useRef(false)
  const [items, setItems] = useState<ReviewListItem[]>([])
  const [students, setStudents] = useState<ReviewListResponse["filters"]["students"]>([])
  const [level, setLevel] = useState("all")
  const [studentId, setStudentId] = useState("all")
  const [status, setStatus] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ReviewDetail | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [codingPoints, setCodingPoints] = useState("0")
  const [codingIsCorrect, setCodingIsCorrect] = useState<"true" | "false" | "">("")
  const [teacherFeedback, setTeacherFeedback] = useState("")
  const [choiceFeedback, setChoiceFeedback] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [portalReady, setPortalReady] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (queryAppliedRef.current) return
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const qLevel = params.get("level")
    const qStudentId = params.get("studentId")
    const qStatus = params.get("codingStatus")
    const qReviewId = params.get("reviewId")
    if (qLevel) setLevel(qLevel)
    if (qStudentId) setStudentId(qStudentId)
    if (qStatus) setStatus(qStatus)
    if (qReviewId) setActiveId(qReviewId)
    queryAppliedRef.current = true
  }, [])

  useEffect(() => {
    setPortalReady(true)
  }, [])

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (level !== "all") params.set("level", level)
    if (studentId !== "all") params.set("studentId", studentId)
    if (status !== "all") params.set("codingStatus", status)
    const text = params.toString()
    return text ? `?${text}` : ""
  }, [level, studentId, status])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<ReviewListResponse>(`/admin/exercise-reviews${query}`)
      setItems(data.items)
      setStudents(data.filters.students)
      setCurrentPage(1)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [query])

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const pagedItems = useMemo(
    () => items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, items]
  )

  useEffect(() => {
    if (!activeId || items.length === 0) return
    const index = items.findIndex(item => item.id === activeId)
    if (index < 0) return
    const targetPage = Math.floor(index / PAGE_SIZE) + 1
    if (targetPage !== currentPage) setCurrentPage(targetPage)
  }, [activeId, items, currentPage])

  useEffect(() => {
    if (!activeId) {
      setDetail(null)
      return
    }

    const run = async () => {
      setError(null)
      try {
        const data = await apiFetch<ReviewDetail>(`/admin/exercise-reviews/${activeId}`)
        setDetail(data)
        setCurrentStepIndex(0)
        setCodingPoints(String(data.codingPoints))
        setCodingIsCorrect(
          data.codingIsCorrect === null ? "" : data.codingIsCorrect ? "true" : "false"
        )
        setTeacherFeedback(data.teacherFeedback ?? "")
        setChoiceFeedback(
          Object.fromEntries(
            data.multipleChoiceFeedback.map(item => [item.questionId, item.comment])
          )
        )
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "加载详情失败")
      }
    }

    run()
  }, [activeId])

  const steps = useMemo<ReviewStep[]>(
    () =>
      detail
        ? [
            ...detail.exercise.multipleChoice.map((question, index) => ({
              kind: "choice" as const,
              key: question.id,
              order: index + 1,
              title: `选择题 ${index + 1}`,
              question
            })),
            ...detail.exercise.codingTasks.map((task, index) => ({
              kind: "coding" as const,
              key: task.id,
              order: detail.exercise.multipleChoice.length + index + 1,
              title: `编程题 ${index + 1}`,
              task
            }))
          ]
        : [],
    [detail]
  )

  const currentStep = steps[currentStepIndex] ?? null
  const choiceAnswerMap = useMemo(
    () =>
      new Map(
        detail?.multipleChoiceAnswers.map(item => [item.questionId, item]) ?? []
      ),
    [detail]
  )
  const codingAnswerMap = useMemo(
    () =>
      new Map(
        detail?.codingAnswers.map(item => [item.taskId, item]) ?? []
      ),
    [detail]
  )
  const computedTotal = (detail?.multipleChoicePoints ?? 0) + Number(codingPoints || 0)

  const saveReview = async () => {
    if (!detail) return
    setSaving(true)
    setError(null)
    try {
      await apiFetch(`/admin/exercise-reviews/${detail.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          codingStatus: "REVIEWED",
          codingPoints: Number(codingPoints),
          codingIsCorrect:
            codingIsCorrect === "" ? null : codingIsCorrect === "true",
          teacherFeedback,
          multipleChoiceFeedback: Object.entries(choiceFeedback)
            .map(([questionId, comment]) => ({
              questionId,
              comment: comment.trim()
            }))
            .filter(item => item.comment)
        })
      })

      await load()
      const refreshed = await apiFetch<ReviewDetail>(`/admin/exercise-reviews/${detail.id}`)
      setDetail(refreshed)
      setCodingPoints(String(refreshed.codingPoints))
      setCodingIsCorrect(
        refreshed.codingIsCorrect === null ? "" : refreshed.codingIsCorrect ? "true" : "false"
      )
      setTeacherFeedback(refreshed.teacherFeedback ?? "")
      setChoiceFeedback(
        Object.fromEntries(
          refreshed.multipleChoiceFeedback.map(item => [item.questionId, item.comment])
        )
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Review Center</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          选择题自动判分，老师只批改编程题；错误的选择题也可以补充点评给学生查看。
        </p>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
        <div className="grid grid-cols-12 gap-2 bg-zinc-950/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:bg-white/5 dark:text-zinc-200">
          <div className="col-span-3">题库</div>
          <div className="col-span-2">
            <div>等级</div>
            <select
              value={level}
              onChange={event => setLevel(event.target.value)}
              className="mt-1 h-8 w-full rounded-lg border border-black/10 bg-white px-2 text-xs font-medium normal-case text-zinc-700 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-200"
            >
              <option value="all">全部</option>
              {Array.from({ length: 18 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1} 级
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <div>学生</div>
            <select
              value={studentId}
              onChange={event => setStudentId(event.target.value)}
              className="mt-1 h-8 w-full rounded-lg border border-black/10 bg-white px-2 text-xs font-medium normal-case text-zinc-700 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-200"
            >
              <option value="all">全部</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.nickname} / {student.account}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <div>状态</div>
            <select
              value={status}
              onChange={event => setStatus(event.target.value)}
              className="mt-1 h-8 w-full rounded-lg border border-black/10 bg-white px-2 text-xs font-medium normal-case text-zinc-700 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-200"
            >
              <option value="all">全部</option>
              <option value="PENDING">待批改</option>
              <option value="REVIEWED">已批改</option>
            </select>
          </div>
          <div className="col-span-1">得分</div>
          <div className="col-span-1">提交</div>
          <div className="col-span-1 text-right">操作</div>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-sm text-zinc-600 dark:text-zinc-300">加载中...</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-sm text-zinc-600 dark:text-zinc-300">没有符合筛选条件的提交。</div>
        ) : (
          <div className="divide-y divide-black/10 bg-white/50 text-sm dark:divide-white/10 dark:bg-zinc-950/40">
            {pagedItems.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveId(item.id)}
                className={[
                  "grid w-full grid-cols-12 items-center gap-2 px-4 py-3 text-left",
                  item.id === activeId
                    ? "bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/30"
                    : "hover:bg-zinc-50/80 dark:hover:bg-white/5"
                ].join(" ")}
              >
                <div className="col-span-3 min-w-0">
                  <div className="truncate font-medium text-zinc-950 dark:text-white">
                    {item.exercise.title}
                  </div>
                  <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {item.student.nickname} / {item.student.account}
                  </div>
                </div>
                <div className="col-span-2 text-zinc-700 dark:text-zinc-200">
                  {item.exercise.level} 级
                </div>
                <div className="col-span-2 text-zinc-700 dark:text-zinc-200">
                  {item.student.className ?? "未分班"}
                </div>
                <div className="col-span-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {statusLabel(item.codingStatus)}
                </div>
                <div className="col-span-1 font-semibold text-zinc-900 dark:text-white">
                  {item.totalPoints}/{item.totalMaxPoints}
                </div>
                <div className="col-span-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {formatDateTimeToMinute(item.createdAt)}
                </div>
                <div className="col-span-1 text-right text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                  批改
                </div>
              </button>
            ))}
            <div className="flex items-center justify-between px-4 py-3 text-xs text-zinc-600 dark:text-zinc-300">
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

      {portalReady && activeId && detail && currentStep
        ? createPortal(
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/35 p-6">
          <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center">
            <div className="flex max-h-[88vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-[2rem] border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-950">
            <div className="flex items-start justify-between gap-4 border-b border-black/10 px-6 py-5 dark:border-white/10">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <span className="rounded-full bg-amber-400/15 px-3 py-1 text-amber-700 dark:text-amber-200">
                    LEVEL {detail.exercise.level}
                  </span>
                  <span>{detail.student.nickname}</span>
                  <span>/</span>
                  <span>{detail.student.account}</span>
                  <span>/</span>
                  <span>{detail.student.className ?? "未分班"}</span>
                </div>
                <h2 className="mt-3 text-xl font-semibold text-zinc-950 dark:text-white">
                  {detail.exercise.title}
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  第 {currentStepIndex + 1}/{steps.length} 题，逐题查看并批改。
                </p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  提交时间：{formatDateTimeToMinute(detail.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-white/10 dark:text-zinc-200"
              >
                关闭
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-h-0 border-b border-black/10 p-6 lg:border-b-0 lg:border-r dark:border-white/10">
                {currentStep.kind === "choice" ? (
                  <div className="flex h-full min-h-0 flex-col overflow-hidden">
                    <div className="text-xs font-bold uppercase tracking-[0.24em] text-teal-700 dark:text-teal-300">
                      {currentStep.title}
                    </div>
                    <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-2">
                      <div className="rounded-[1.4rem] border border-black/10 bg-zinc-50/70 p-5 dark:border-white/10 dark:bg-zinc-900/40">
                        <PromptText text={currentStep.question.prompt} />
                      </div>
                      <div className="mt-5 grid gap-3 pb-2">
                        {currentStep.question.options.map(option => {
                          const answer = choiceAnswerMap.get(currentStep.question.id)
                          const isSelected = answer?.selectedOptionId === option.id
                          const isCorrect = answer?.correctOptionId === option.id
                          const isWrongSelected = isSelected && !answer?.isCorrect
                          return (
                            <div
                              key={option.id}
                              className={[
                                "rounded-[1.2rem] border px-4 py-3 text-sm",
                                isCorrect
                                  ? "border-sky-500 bg-sky-500/10 text-sky-800 dark:text-sky-200"
                                  : isWrongSelected
                                    ? "border-red-500 bg-red-500/10 text-red-800 dark:text-red-200"
                                    : "border-black/10 bg-white text-zinc-700 dark:border-white/10 dark:bg-zinc-900/40 dark:text-zinc-200"
                              ].join(" ")}
                            >
                              <div>{option.text}</div>
                              <div className="mt-1 text-xs opacity-80">
                                {isCorrect ? "正确答案" : isWrongSelected ? "学生选择" : ""}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid h-full min-h-0 gap-5 xl:grid-cols-2">
                    <div className="min-h-0 overflow-y-auto rounded-[1.4rem] border border-black/10 bg-zinc-50/70 p-5 dark:border-white/10 dark:bg-zinc-900/40">
                      <div className="text-xs font-bold uppercase tracking-[0.24em] text-teal-700 dark:text-teal-300">
                        {currentStep.title}
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-zinc-950 dark:text-white">
                        {currentStep.task.title}
                      </h3>
                      <div className="mt-4 space-y-4">
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            题目描述
                          </div>
                          <PromptText text={currentStep.task.description} />
                        </div>
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            输入
                          </div>
                          <PromptText text={currentStep.task.inputDescription} />
                        </div>
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            输出
                          </div>
                          <PromptText text={currentStep.task.outputDescription} />
                        </div>
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            输入样例 1
                          </div>
                          <PromptText text={currentStep.task.sampleInput1} code />
                        </div>
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            输出样例 1
                          </div>
                          <PromptText text={currentStep.task.sampleOutput1} code />
                        </div>
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            输入样例 2
                          </div>
                          <PromptText text={currentStep.task.sampleInput2} code />
                        </div>
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                            输出样例 2
                          </div>
                          <PromptText text={currentStep.task.sampleOutput2} code />
                        </div>
                      </div>
                    </div>

                    <div className="min-h-0 overflow-y-auto rounded-[1.4rem] border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-900/30">
                      <div className="text-xs font-bold uppercase tracking-[0.24em] text-teal-700 dark:text-teal-300">
                        学生代码
                      </div>
                      <pre className="mt-4 whitespace-pre-wrap rounded-[1.2rem] bg-zinc-950 px-4 py-4 font-mono text-[13px] leading-6 text-zinc-100">
                        {codingAnswerMap.get(currentStep.task.id)?.answer || "学生未作答"}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              <aside className="flex min-h-0 flex-col bg-white/80 p-5 dark:bg-zinc-950/80">
                <div className="rounded-[1.4rem] border border-black/10 bg-zinc-50/70 p-4 dark:border-white/10 dark:bg-zinc-900/40">
                  <div className="text-sm font-semibold text-zinc-950 dark:text-white">题目列表</div>
                  <div className="mt-4 grid grid-cols-4 gap-3">
                    {steps.map((step, index) => {
                      const isCurrent = index === currentStepIndex
                      const tone =
                        step.kind === "choice"
                          ? choiceAnswerMap.get(step.question.id)?.isCorrect
                            ? "border-sky-500 bg-sky-500 text-white"
                            : "border-red-500 bg-red-500 text-white"
                          : "border-teal-500 bg-teal-500 text-white"

                      return (
                        <button
                          key={step.key}
                          type="button"
                          onClick={() => setCurrentStepIndex(index)}
                          className={[
                            "flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold transition",
                            tone,
                            isCurrent ? "ring-2 ring-black/15 dark:ring-white/20" : ""
                          ].join(" ")}
                        >
                          {step.order}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
                  {currentStep.kind === "choice" ? (
                    <div className="space-y-4">
                      <div className="rounded-[1.4rem] border border-black/10 bg-zinc-50/70 p-4 dark:border-white/10 dark:bg-zinc-900/40">
                        <div className="text-sm font-semibold text-zinc-950 dark:text-white">
                          自动判题结果
                        </div>
                        <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-200">
                          学生本题：
                          <span
                            className={
                              choiceAnswerMap.get(currentStep.question.id)?.isCorrect
                                ? "ml-2 font-semibold text-sky-700 dark:text-sky-300"
                                : "ml-2 font-semibold text-red-700 dark:text-red-300"
                            }
                          >
                            {choiceAnswerMap.get(currentStep.question.id)?.isCorrect ? "答对" : "答错"}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                          选择题分数已自动计算，这里只补老师点评。
                        </div>
                      </div>

                      <div className="rounded-[1.4rem] border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900/30">
                        <label className="text-sm font-semibold text-zinc-950 dark:text-white">
                          选择题教师意见
                        </label>
                        <textarea
                          value={choiceFeedback[currentStep.question.id] ?? ""}
                          onChange={event =>
                            setChoiceFeedback(current => ({
                              ...current,
                              [currentStep.question.id]: event.target.value
                            }))
                          }
                          rows={7}
                          placeholder="这道题为什么错、正确思路是什么，可以写给学生看。"
                          className="mt-3 w-full rounded-[1.1rem] border border-black/10 bg-white px-4 py-3 text-sm text-zinc-800 outline-none focus:border-zinc-950 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-100 dark:focus:border-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-[1.4rem] border border-black/10 bg-zinc-50/70 p-4 dark:border-white/10 dark:bg-zinc-900/40">
                        <div className="text-sm font-semibold text-zinc-950 dark:text-white">分数汇总</div>
                        <div className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-200">
                          <div>选择题得分：{detail.multipleChoicePoints} 分</div>
                          <div>编程题满分：{detail.codingMaxPoints} 分</div>
                          <div className="text-lg font-semibold text-zinc-950 dark:text-white">
                            总分：{computedTotal} / {detail.totalMaxPoints}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[1.4rem] border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900/30">
                        <label className="text-sm font-semibold text-zinc-950 dark:text-white">
                          编程题判定
                        </label>
                        <select
                          value={codingIsCorrect}
                          onChange={event => setCodingIsCorrect(event.target.value as "true" | "false" | "")}
                          className="mt-3 h-11 w-full rounded-[1rem] border border-black/10 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-zinc-950 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-100 dark:focus:border-white"
                        >
                          <option value="">未设置</option>
                          <option value="true">正确</option>
                          <option value="false">错误</option>
                        </select>

                        <label className="mt-4 block text-sm font-semibold text-zinc-950 dark:text-white">
                          编程题得分
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={detail.codingMaxPoints}
                          value={codingPoints}
                          onChange={event => setCodingPoints(event.target.value)}
                          className="mt-3 h-11 w-full rounded-[1rem] border border-black/10 bg-white px-3 text-sm text-zinc-800 outline-none focus:border-zinc-950 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-100 dark:focus:border-white"
                        />

                        <label className="mt-4 block text-sm font-semibold text-zinc-950 dark:text-white">
                          编程题批改意见
                        </label>
                        <textarea
                          value={teacherFeedback}
                          onChange={event => setTeacherFeedback(event.target.value)}
                          rows={7}
                          placeholder="告诉学生错在哪里、如何改进。"
                          className="mt-3 w-full rounded-[1.1rem] border border-black/10 bg-white px-4 py-3 text-sm text-zinc-800 outline-none focus:border-zinc-950 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-100 dark:focus:border-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/10 pt-4 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setCurrentStepIndex(index => Math.max(index - 1, 0))}
                    disabled={currentStepIndex === 0}
                    className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-zinc-700 disabled:opacity-40 dark:border-white/10 dark:text-zinc-200"
                  >
                    上一题
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={saveReview}
                      disabled={saving}
                      className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-zinc-950"
                    >
                      {saving ? "保存中..." : "保存批改"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentStepIndex(index =>
                          Math.min(index + 1, Math.max(steps.length - 1, 0))
                        )
                      }
                      disabled={currentStepIndex === steps.length - 1}
                      className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-zinc-700 disabled:opacity-40 dark:border-white/10 dark:text-zinc-200"
                    >
                      下一题
                    </button>
                  </div>
                </div>
              </aside>
            </div>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </div>
  )
}
