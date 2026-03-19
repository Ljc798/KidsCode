"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { apiFetch } from "@/app/lib/api"
import CodeEditor from "@/app/exercises/CodeEditor"

type ChoiceOption = {
  id: string
  text: string
}

type Question = {
  id: string
  prompt: string
  options: ChoiceOption[]
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

type ExerciseDetail = {
  id: string
  slug: string
  title: string
  summary: string | null
  imageUrl: string | null
  level: number
  multipleChoice: Question[]
  codingTasks: CodingTask[]
}

type SubmissionResult = {
  questionId: string
  selectedOptionId: string | null
  correctOptionId: string
  isCorrect: boolean
}

type SubmissionResponse = {
  ok: true
  submission: {
    id: string
    codingStatus: "PENDING" | "REVIEWED"
    createdAt: string
    totalPoints: number
    totalMaxPoints: number
  }
  score: number
  total: number
  multipleChoicePoints: number
  codingMaxPoints: number
  results: SubmissionResult[]
}

type SubmissionRecord = {
  id: string
  score: number
  total: number
  multipleChoicePoints: number
  codingPoints: number
  totalPoints: number
  totalMaxPoints: number
  codingStatus: "PENDING" | "REVIEWED"
  teacherFeedback: string | null
  createdAt: string
  reviewedAt: string | null
}

type SubmissionDetail = {
  submission: {
    id: string
    score: number
    total: number
    multipleChoicePoints: number
    codingPoints: number
    totalPoints: number
    totalMaxPoints: number
    results: SubmissionResult[]
    codingAnswers: Array<{
      taskId: string
      title: string
      answer: string
    }>
    multipleChoiceFeedback: Array<{
      questionId: string
      comment: string
    }>
    codingStatus: "PENDING" | "REVIEWED"
    teacherFeedback: string | null
    createdAt: string
    reviewedAt: string | null
  }
  exercise: ExerciseDetail
}

type Step =
  | { kind: "choice"; key: string; label: string; question: Question; order: number }
  | { kind: "coding"; key: string; label: string; task: CodingTask; order: number }

function PromptBlock({ text }: { text: string }) {
  const parts = text.split(/```/)
  return (
    <div className="space-y-3 text-[15px] leading-7 text-zinc-700 dark:text-zinc-200">
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <pre
            key={index}
            className="overflow-x-auto rounded-[1.2rem] bg-zinc-950 px-4 py-3 font-mono text-[13px] leading-6 text-zinc-100"
          >
            {part.trim()}
          </pre>
        ) : (
          <div key={index} className="whitespace-pre-wrap">
            {part}
          </div>
        )
      )}
    </div>
  )
}

function codingStatusLabel(status: "PENDING" | "REVIEWED") {
  return status === "REVIEWED" ? "已批改" : "待批改"
}

export default function ExerciseDetailClient() {
  const params = useParams()
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug
  const [detail, setDetail] = useState<ExerciseDetail | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [codingAnswers, setCodingAnswers] = useState<Record<string, string>>({})
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitResult, setSubmitResult] = useState<SubmissionResponse | null>(null)
  const [records, setRecords] = useState<SubmissionRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(true)
  const [mode, setMode] = useState<"solve" | "records">("solve")
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
  const [activeRecord, setActiveRecord] = useState<SubmissionDetail | null>(null)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setRecordsLoading(true)
      setError(null)
      try {
        const [exercise, submissionRecords] = await Promise.all([
          apiFetch<ExerciseDetail>(`/exercises/${slug}`),
          apiFetch<SubmissionRecord[]>(`/exercises/${slug}/submissions`)
        ])
        setDetail(exercise)
        setRecords(submissionRecords)
        setActiveRecordId(submissionRecords[0]?.id ?? null)
        setCurrentStepIndex(0)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "加载失败")
      } finally {
        setLoading(false)
        setRecordsLoading(false)
      }
    }

    run()
  }, [slug])

  useEffect(() => {
    if (mode !== "records" || !activeRecordId) {
      setActiveRecord(null)
      return
    }

    let ignore = false
    const run = async () => {
      try {
        const record = await apiFetch<SubmissionDetail>(
          `/exercises/${slug}/submissions/${activeRecordId}`
        )
        if (!ignore) setActiveRecord(record)
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "加载提交记录失败")
        }
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [activeRecordId, mode, slug])

  const exercise = mode === "records" && activeRecord ? activeRecord.exercise : detail
  const resultMap = new Map(
    (mode === "records" ? activeRecord?.submission.results : submitResult?.results)?.map(item => [
      item.questionId,
      item
    ]) ?? []
  )

  const readonlyChoiceAnswers = Object.fromEntries(
    (mode === "records" ? (activeRecord?.submission.results ?? []) : []).map(item => [
      item.questionId,
      item.selectedOptionId ?? ""
    ])
  )
  const readonlyCodingAnswers = Object.fromEntries(
    (mode === "records" ? (activeRecord?.submission.codingAnswers ?? []) : []).map(item => [
      item.taskId,
      item.answer
    ])
  )
  const readonlyChoiceFeedback = Object.fromEntries(
    (mode === "records" ? (activeRecord?.submission.multipleChoiceFeedback ?? []) : []).map(item => [
      item.questionId,
      item.comment
    ])
  )

  const effectiveAnswers = mode === "records" ? readonlyChoiceAnswers : answers
  const effectiveCodingAnswers = mode === "records" ? readonlyCodingAnswers : codingAnswers

  const steps = useMemo<Step[]>(
    () =>
      exercise
        ? [
            ...exercise.multipleChoice.map((question, index) => ({
              kind: "choice" as const,
              key: question.id,
              label: `选${index + 1}`,
              question,
              order: index + 1
            })),
            ...exercise.codingTasks.map((task, index) => ({
              kind: "coding" as const,
              key: task.id,
              label: `编${index + 1}`,
              task,
              order: exercise.multipleChoice.length + index + 1
            }))
          ]
        : [],
    [exercise]
  )

  const currentStep = steps[currentStepIndex] ?? null
  const isLastStep = currentStepIndex === steps.length - 1
  const isReviewMode = mode === "records"
  const isCodingSolveView = currentStep?.kind === "coding" && !isReviewMode
  const activeSubmissionStatus = isReviewMode
    ? activeRecord?.submission.codingStatus
    : submitResult?.submission.codingStatus
  const activeTeacherFeedback = isReviewMode
    ? activeRecord?.submission.teacherFeedback
    : null
  const activeChoiceFeedback =
    isReviewMode && currentStep?.kind === "choice"
      ? readonlyChoiceFeedback[currentStep.question.id]
      : null

  const choiceDone = exercise
    ? exercise.multipleChoice.filter(item => effectiveAnswers[item.id]).length
    : 0
  const codingDone = exercise
    ? exercise.codingTasks.filter(item => (effectiveCodingAnswers[item.id] ?? "").trim()).length
    : 0

  const refreshRecords = async (nextActiveId?: string) => {
    const submissionRecords = await apiFetch<SubmissionRecord[]>(`/exercises/${slug}/submissions`)
    setRecords(submissionRecords)
    setActiveRecordId(nextActiveId ?? submissionRecords[0]?.id ?? null)
  }

  const moveNext = () => {
    setError(null)
    setCurrentStepIndex(index => Math.min(index + 1, Math.max(steps.length - 1, 0)))
  }

  const movePrev = () => {
    setError(null)
    setCurrentStepIndex(index => Math.max(index - 1, 0))
  }

  const handleSubmit = async () => {
    if (!detail) return
    if (detail.multipleChoice.some(item => !answers[item.id])) {
      setError("请先完成全部选择题。")
      return
    }
    if (detail.codingTasks.some(item => !(codingAnswers[item.id] ?? "").trim())) {
      setError("请先完成全部编程题。")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const response = await apiFetch<SubmissionResponse>(`/exercises/${detail.slug}/submissions`, {
        method: "POST",
        body: JSON.stringify({
          answers: detail.multipleChoice.map(question => ({
            questionId: question.id,
            selectedOptionId: answers[question.id]
          })),
          codingAnswers: detail.codingTasks.map(task => ({
            taskId: task.id,
            answer: codingAnswers[task.id] ?? ""
          }))
        })
      })
      setSubmitResult(response)
      await refreshRecords(response.submission.id)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "提交失败")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="mt-6 rounded-[2rem] border border-black/5 bg-white/70 p-8 text-sm text-zinc-600 shadow-sm dark:border-white/10 dark:bg-zinc-950/50 dark:text-zinc-300">
        题库加载中...
      </div>
    )
  }

  if (error && !detail) {
    return (
      <div className="mt-6 rounded-[2rem] border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-700 dark:text-red-200">
        {error}
      </div>
    )
  }

  if (!exercise || !currentStep) return null

  return (
    <section
      className={[
        "mt-5 grid gap-6",
        isCodingSolveView ? "grid-cols-1" : "xl:grid-cols-[minmax(0,1fr)_280px]"
      ].join(" ")}
    >
      <div className="space-y-5">
        <div className="rounded-[1.6rem] border border-black/5 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-400/15 px-3 py-1 text-[11px] font-black tracking-[0.2em] text-amber-700 dark:text-amber-200">
                  LEVEL {exercise.level}
                </span>
                <span className="rounded-full bg-zinc-950/5 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
                  {exercise.multipleChoice.length} 选择
                </span>
                <span className="rounded-full bg-zinc-950/5 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
                  {exercise.codingTasks.length} 编程
                </span>
                <span className="rounded-full bg-zinc-950/5 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-white/5 dark:text-zinc-300">
                  第 {currentStepIndex + 1}/{steps.length} 题
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                {exercise.title}
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {exercise.summary || "逐题作答，提交后可在右侧查看本题库的历史记录。"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode("solve")}
                className={[
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  mode === "solve"
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                    : "border border-black/10 text-zinc-700 dark:border-white/10 dark:text-zinc-200"
                ].join(" ")}
              >
                答题
              </button>
              {!isCodingSolveView ? (
                <button
                  type="button"
                  onClick={() => setMode("records")}
                  className={[
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    mode === "records"
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                      : "border border-black/10 text-zinc-700 dark:border-white/10 dark:text-zinc-200"
                  ].join(" ")}
                >
                  提交记录
                </button>
              ) : null}
              <Link
                href="/exercises"
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
              >
                返回题库
              </Link>
            </div>
          </div>
        </div>

        {currentStep.kind === "choice" ? (
          <div className="rounded-[1.8rem] border border-black/5 bg-white/85 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60">
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-teal-700 dark:text-teal-300">
              Choice {currentStep.order}
            </div>
            <div className="mt-4">
              <PromptBlock text={currentStep.question.prompt} />
            </div>

            <div className="mt-6 grid gap-3">
              {currentStep.question.options.map(option => {
                const checked = effectiveAnswers[currentStep.question.id] === option.id
                const result = resultMap.get(currentStep.question.id)
                const isCorrect = result?.correctOptionId === option.id
                const isWrongSelected =
                  result?.selectedOptionId === option.id && !result.isCorrect
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={isReviewMode || Boolean(submitResult)}
                    onClick={() =>
                      setAnswers(current => ({
                        ...current,
                        [currentStep.question.id]: option.id
                      }))
                    }
                    className={[
                      "rounded-[1.3rem] border px-5 py-4 text-left text-[15px] font-medium transition",
                      checked
                        ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                        : "border-black/10 bg-white text-zinc-800 hover:border-black/20 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950/50 dark:text-zinc-100 dark:hover:bg-white/10",
                      isCorrect && (submitResult || isReviewMode)
                        ? "!border-sky-500 !bg-sky-500/10 !text-sky-700 dark:!text-sky-200"
                        : "",
                      isWrongSelected ? "!border-red-500 !bg-red-500/10 !text-red-700 dark:!text-red-200" : ""
                    ].join(" ")}
                  >
                    {option.text}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-[1.8rem] border border-black/5 bg-white/85 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60">
              <div className="text-xs font-bold uppercase tracking-[0.24em] text-teal-700 dark:text-teal-300">
                Coding {currentStep.order}
              </div>
              <h2 className="mt-3 text-xl font-semibold text-zinc-950 dark:text-white">
                {currentStep.task.title}
              </h2>
              <div className="mt-5 space-y-4 xl:max-h-[72vh] xl:overflow-y-auto xl:pr-2">
                <div className="rounded-[1.3rem] border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-zinc-900/40">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                    题目描述
                  </div>
                  <div className="mt-2">
                    <PromptBlock text={currentStep.task.description} />
                  </div>
                </div>

                {[
                  ["输入", currentStep.task.inputDescription],
                  ["输出", currentStep.task.outputDescription]
                ].map(([label, content]) => (
                  <div
                    key={label}
                    className="rounded-[1.3rem] border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-zinc-900/40"
                  >
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                      {label}
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-[14px] leading-7 text-zinc-700 dark:text-zinc-200">
                      {content || "无"}
                    </div>
                  </div>
                ))}

                {[
                  ["输入样例 1", currentStep.task.sampleInput1],
                  ["输出样例 1", currentStep.task.sampleOutput1],
                  ["输入样例 2", currentStep.task.sampleInput2],
                  ["输出样例 2", currentStep.task.sampleOutput2]
                ].map(([label, content]) => (
                  <div
                    key={label}
                    className="rounded-[1.3rem] border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-zinc-900/40"
                  >
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                      {label}
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap font-mono text-[13px] leading-7 text-zinc-700 dark:text-zinc-200">
                      {content || "无"}
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-black/5 bg-white/85 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60">
              <div className="text-xs font-bold uppercase tracking-[0.24em] text-teal-700 dark:text-teal-300">
                Coding Area
              </div>
              <h3 className="mt-3 text-lg font-semibold text-zinc-950 dark:text-white">
                {isReviewMode ? "提交代码回看" : "代码编辑区"}
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                支持 `Tab` 缩进、括号/引号/尖括号自动补全，不提供编译运行。
              </p>
              <CodeEditor
                value={effectiveCodingAnswers[currentStep.task.id] ?? ""}
                onChange={value =>
                  setCodingAnswers(current => ({
                    ...current,
                    [currentStep.task.id]: value
                  }))
                }
                readOnly={isReviewMode}
                placeholder={currentStep.task.placeholder || "在这里写你的代码..."}
                className="mt-5 min-h-[560px] w-full rounded-[1.6rem] border border-black/10 bg-white px-4 py-4 font-mono text-[13px] leading-6 text-zinc-900 outline-none focus:border-zinc-950 dark:border-white/10 dark:bg-zinc-950/60 dark:text-zinc-100 dark:focus:border-white"
              />
            </div>
          </div>
        )}

        {activeChoiceFeedback ? (
          <div className="rounded-[1.4rem] border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-200">
            这道题老师点评：{activeChoiceFeedback}
          </div>
        ) : null}

        {currentStep.kind === "coding" && activeTeacherFeedback ? (
          <div className="rounded-[1.4rem] border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-200">
            老师反馈：{activeTeacherFeedback}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[1.4rem] border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {(submitResult || isReviewMode) && (
          <div className="rounded-[1.4rem] border border-sky-500/20 bg-sky-500/5 p-4 text-sm text-sky-800 dark:text-sky-200">
            选择题：{isReviewMode ? activeRecord?.submission.multipleChoicePoints : submitResult?.multipleChoicePoints}
            分。总分：
            {isReviewMode ? activeRecord?.submission.totalPoints : submitResult?.submission.totalPoints}/
            {isReviewMode ? activeRecord?.submission.totalMaxPoints : submitResult?.submission.totalMaxPoints}。编程题状态：
            {activeSubmissionStatus ? codingStatusLabel(activeSubmissionStatus) : "未提交"}。
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.8rem] border border-black/5 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60">
          <button
            type="button"
            onClick={movePrev}
            disabled={currentStepIndex === 0}
            className="rounded-full border border-black/10 px-5 py-3 text-sm font-medium text-zinc-700 disabled:opacity-40 dark:border-white/10 dark:text-zinc-200"
          >
            上一题
          </button>

          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            {isReviewMode ? "提交记录只读查看" : "一次只显示一道题"}
          </div>

          {isReviewMode ? (
            <button
              type="button"
              onClick={moveNext}
              disabled={isLastStep}
              className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-40 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              下一题
            </button>
          ) : isLastStep ? (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {submitting ? "提交中..." : "提交整套答案"}
            </button>
          ) : (
            <button
              type="button"
              onClick={moveNext}
              className="rounded-full bg-zinc-950 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              下一题
            </button>
          )}
        </div>
      </div>

      {!isCodingSolveView ? (
        <aside className="space-y-5">
          <div className="rounded-[1.6rem] border border-black/5 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60">
            <div className="text-sm font-semibold text-zinc-950 dark:text-white">题目列表</div>
            <div className="mt-4 grid grid-cols-4 gap-3">
            {steps.map((step, index) => {
              const isCurrent = index === currentStepIndex
              let tone =
                "border-black/10 bg-white text-zinc-700 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-200"

              if (step.kind === "choice") {
                const result = resultMap.get(step.question.id)
                if (result) {
                  tone = result.isCorrect
                    ? "border-sky-500 bg-sky-500 text-white"
                    : "border-red-500 bg-red-500 text-white"
                } else if (effectiveAnswers[step.question.id]) {
                  tone = "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                }
              } else if ((effectiveCodingAnswers[step.task.id] ?? "").trim()) {
                tone = "border-teal-500 bg-teal-500 text-white"
              }

              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setCurrentStepIndex(index)}
                  className={[
                    "flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold transition",
                    tone,
                    isCurrent ? "ring-2 ring-black/10 dark:ring-white/20" : ""
                  ].join(" ")}
                >
                  {step.order}
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-black/5 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-zinc-950 dark:text-white">提交记录</div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {records.length} 条
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {recordsLoading ? (
              <div className="text-sm text-zinc-500 dark:text-zinc-400">加载中...</div>
            ) : records.length === 0 ? (
              <div className="text-sm text-zinc-500 dark:text-zinc-400">还没有提交记录。</div>
            ) : (
              records.map(record => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => {
                    setMode("records")
                    setActiveRecordId(record.id)
                    setCurrentStepIndex(0)
                  }}
                  className={[
                    "w-full rounded-[1.2rem] border px-4 py-3 text-left transition",
                    activeRecordId === record.id && mode === "records"
                      ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                      : "border-black/10 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900/40 dark:text-zinc-100 dark:hover:bg-white/10"
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">
                      {new Date(record.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-xs opacity-80">
                      {record.totalPoints}/{record.totalMaxPoints}
                    </span>
                  </div>
                  <div className="mt-1 text-xs opacity-70">
                    选择题 {record.multipleChoicePoints} 分 · 编程题 {record.codingPoints} 分 · {codingStatusLabel(record.codingStatus)}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>
      ) : null}
    </section>
  )
}
