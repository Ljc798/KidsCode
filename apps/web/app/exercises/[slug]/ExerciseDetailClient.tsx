"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { apiFetch } from "@/app/lib/api"
import CodeEditor from "@/app/exercises/CodeEditor"

type ChoiceOption = {
  id: string
  text: string
  imageUrl?: string | null
}

type Question = {
  id: string
  prompt: string
  promptImageUrl?: string | null
  options: ChoiceOption[]
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

type ExerciseDetail = {
  id: string
  slug: string
  title: string
  summary: string | null
  imageUrl: string | null
  subject: "CPP" | "SCRATCH"
  difficultyType: "LEVEL" | "OTHER"
  difficultyLevel: number | null
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
  reward: {
    pointsRequested: number
    pointsAdded: number
    pointsEarnedToday: number
    pointsDailyCap: number
    xpRequested: number
    xpEarnedToday: number
    xpDailyCap: number
    xpAdded: number
    pointsBalance: number
    petXp: number
  }
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
      scratchFile?: {
        objectKey: string
        fileName: string
        mimeType: string
        size: number
        downloadUrl: string
      } | null
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

type ScratchUploadedFile = {
  objectKey: string
  fileName: string
  mimeType: string
  size: number
  downloadUrl: string
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "")
    reader.onerror = () => reject(new Error("读取文件失败"))
    reader.readAsDataURL(file)
  })
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

function OptionText({ text }: { text: string }) {
  const normalized = text.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n")
  const parts = normalized.split(/```/)
  return (
    <div className="space-y-2">
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <pre
            key={index}
            className="overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-current/20 bg-black/5 px-3 py-2 font-mono text-[13px] leading-6 dark:bg-white/10"
          >
            {part.trim()}
          </pre>
        ) : (
          <div key={index} className="whitespace-pre-wrap break-all">
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

function normalizeMediaUrl(url?: string | null) {
  if (!url) return ""
  if (typeof window !== "undefined" && window.location.protocol === "https:" && url.startsWith("http://")) {
    return `https://${url.slice("http://".length)}`
  }
  return url
}

export default function ExerciseDetailClient() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug
  const querySubmissionId = searchParams.get("submissionId")
  const queryMode = searchParams.get("mode")
  const queryHighlight = searchParams.get("highlight")
  const feedbackRef = useRef<HTMLDivElement | null>(null)
  const feedbackTimerRef = useRef<number | null>(null)
  const [detail, setDetail] = useState<ExerciseDetail | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [codingAnswers, setCodingAnswers] = useState<Record<string, string>>({})
  const [scratchFiles, setScratchFiles] = useState<Record<string, ScratchUploadedFile | null>>({})
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitResult, setSubmitResult] = useState<SubmissionResponse | null>(null)
  const [records, setRecords] = useState<SubmissionRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(true)
  const [mode, setMode] = useState<"solve" | "records">(queryMode === "records" ? "records" : "solve")
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null)
  const [activeRecord, setActiveRecord] = useState<SubmissionDetail | null>(null)
  const [feedbackHighlighted, setFeedbackHighlighted] = useState(false)

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
        const preferred =
          querySubmissionId && submissionRecords.some(item => item.id === querySubmissionId)
            ? querySubmissionId
            : submissionRecords[0]?.id ?? null
        setActiveRecordId(preferred)
        if (queryMode === "records") {
          setMode("records")
        }
        setCurrentStepIndex(0)
        setScratchFiles({})
        setCodingAnswers({})
        setAnswers({})
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "加载失败")
      } finally {
        setLoading(false)
        setRecordsLoading(false)
      }
    }

    run()
  }, [slug, queryMode, querySubmissionId])

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

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current)
      }
    }
  }, [])

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
  const readonlyScratchFiles = Object.fromEntries(
    (mode === "records" ? (activeRecord?.submission.codingAnswers ?? []) : [])
      .filter(item => item.scratchFile)
      .map(item => [item.taskId, item.scratchFile as ScratchUploadedFile])
  )
  const readonlyChoiceFeedback = Object.fromEntries(
    (mode === "records" ? (activeRecord?.submission.multipleChoiceFeedback ?? []) : []).map(item => [
      item.questionId,
      item.comment
    ])
  )

  const effectiveAnswers = mode === "records" ? readonlyChoiceAnswers : answers
  const effectiveCodingAnswers = mode === "records" ? readonlyCodingAnswers : codingAnswers
  const effectiveScratchFiles = mode === "records" ? readonlyScratchFiles : scratchFiles

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

  useEffect(() => {
    const shouldHighlight = queryHighlight === "comment" && mode === "records"
    const hasFeedback = Boolean(activeChoiceFeedback || activeTeacherFeedback)
    if (!shouldHighlight || !hasFeedback) return
    setFeedbackHighlighted(true)
    feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current)
    }
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedbackHighlighted(false)
    }, 3500)
  }, [queryHighlight, mode, activeChoiceFeedback, activeTeacherFeedback, currentStepIndex, activeRecordId])

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

  const uploadScratchAnswer = async (taskId: string, file: File) => {
    if (!detail) return
    setUploadingTaskId(taskId)
    setError(null)
    try {
      const content = await readFileAsDataUrl(file)
      const response = await apiFetch<{
        ok: true
        file: ScratchUploadedFile
      }>(`/exercises/${detail.slug}/scratch-upload`, {
        method: "POST",
        body: JSON.stringify({
          taskId,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          content
        })
      })
      setScratchFiles(current => ({
        ...current,
        [taskId]: response.file
      }))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "上传 Scratch 文件失败")
    } finally {
      setUploadingTaskId(null)
    }
  }

  const handleSubmit = async () => {
    if (!detail) return
    if (detail.multipleChoice.some(item => !answers[item.id])) {
      setError("请先完成全部选择题。")
      return
    }
    if (
      detail.codingTasks.some(item =>
        (item.answerMode ?? "TEXT") === "SCRATCH_FILE"
          ? !scratchFiles[item.id]?.objectKey
          : !(codingAnswers[item.id] ?? "").trim()
      )
    ) {
      setError("请先完成全部编程题（Scratch 题需要先上传文件）。")
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
            answer: (task.answerMode ?? "TEXT") === "SCRATCH_FILE" ? "" : codingAnswers[task.id] ?? "",
            scratchFile: (task.answerMode ?? "TEXT") === "SCRATCH_FILE" ? scratchFiles[task.id] ?? null : null
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
                  {exercise.subject === "SCRATCH" ? "SCRATCH" : "C++"} · {exercise.difficultyType === "OTHER" ? "其他" : `LEVEL ${exercise.difficultyLevel ?? exercise.level}`}
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
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                习题奖励：积分上限 200/天（独立于游戏 1000/天）；成长值固定 +20/次，上限 100/天。
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
            {currentStep.question.promptImageUrl ? (
              <img
                src={normalizeMediaUrl(currentStep.question.promptImageUrl)}
                alt="题干图片"
                className="mt-4 max-h-80 w-full rounded-[1.2rem] border border-black/10 object-contain dark:border-white/10"
              />
            ) : null}

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
                      "rounded-[1.3rem] border px-5 py-4 text-left text-[15px] leading-7 font-medium transition",
                      checked
                        ? "border-teal-500 bg-teal-500/10 text-teal-800 dark:border-teal-300 dark:bg-teal-300/15 dark:text-teal-100"
                        : "border-black/10 bg-white text-zinc-800 hover:border-black/20 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950/50 dark:text-zinc-100 dark:hover:bg-white/10",
                      isCorrect && (submitResult || isReviewMode)
                        ? "!border-sky-500 !bg-sky-500/10 !text-sky-700 dark:!text-sky-200"
                        : "",
                      isWrongSelected ? "!border-red-500 !bg-red-500/10 !text-red-700 dark:!text-red-200" : ""
                    ].join(" ")}
                  >
                    {option.imageUrl ? (
                      <img
                        src={normalizeMediaUrl(option.imageUrl)}
                        alt="选项图片"
                        className="mb-3 ml-0 mr-auto block max-h-36 max-w-full rounded-xl border border-current/20 object-contain"
                      />
                    ) : null}
                    <OptionText text={option.text} />
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
                  {currentStep.task.descriptionImageUrl ? (
                    <img
                      src={normalizeMediaUrl(currentStep.task.descriptionImageUrl)}
                      alt="题目描述图片"
                      className="mt-3 max-h-72 w-full rounded-xl border border-black/10 object-contain dark:border-white/10"
                    />
                  ) : null}
                  {(currentStep.task.referenceImageUrls ?? []).length > 0 ? (
                    <div className="mt-3 grid gap-3">
                      {(currentStep.task.referenceImageUrls ?? []).map((url, index) => (
                        <img
                          key={`${url}-${index}`}
                          src={normalizeMediaUrl(url)}
                          alt={`参考图 ${index + 1}`}
                          className="max-h-72 w-full rounded-xl border border-black/10 object-contain dark:border-white/10"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>

                {(currentStep.task.materialRequirement ?? "").trim() ? (
                  <div className="rounded-[1.3rem] border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-zinc-900/40">
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                      素材要求
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-[14px] leading-7 text-zinc-700 dark:text-zinc-200">
                      {currentStep.task.materialRequirement}
                    </div>
                  </div>
                ) : null}

                {(currentStep.task.requirementSteps ?? []).length > 0 ? (
                  <div className="rounded-[1.3rem] border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-zinc-900/40">
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                      具体要求（步骤）
                    </div>
                    <div className="mt-3 space-y-3">
                      {(currentStep.task.requirementSteps ?? []).map((step, index) => (
                        <div
                          key={step.id || `${index}`}
                          className="rounded-xl border border-black/10 bg-white/80 p-3 dark:border-white/10 dark:bg-zinc-950/40"
                        >
                          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-300">
                            第 {index + 1} 步
                          </div>
                          <div className="mt-1 whitespace-pre-wrap text-[14px] leading-7 text-zinc-700 dark:text-zinc-200">
                            {step.text}
                          </div>
                          {step.imageUrl ? (
                            <img
                              src={normalizeMediaUrl(step.imageUrl)}
                              alt={`步骤 ${index + 1} 图片`}
                              className="mt-2 max-h-72 w-full rounded-xl border border-black/10 object-contain dark:border-white/10"
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {(currentStep.task.scoringRubric ?? "").trim() ? (
                  <div className="rounded-[1.3rem] border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-zinc-900/40">
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                      评分标准
                    </div>
                    <div className="mt-2 whitespace-pre-wrap text-[14px] leading-7 text-zinc-700 dark:text-zinc-200">
                      {currentStep.task.scoringRubric}
                    </div>
                  </div>
                ) : null}

                {exercise.subject === "CPP" ? [
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
                )) : null}

                {exercise.subject === "CPP" ? [
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
                )) : null}
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
                {(currentStep.task.answerMode ?? "TEXT") === "SCRATCH_FILE"
                  ? "该题为 Scratch 文件提交题，先上传 .sb3 文件，再提交整套答案。"
                  : "支持 `Tab` 缩进、括号/引号/尖括号自动补全，不提供编译运行。"}
              </p>
              {(currentStep.task.answerMode ?? "TEXT") === "SCRATCH_FILE" ? (
                <div className="mt-5 space-y-3 rounded-[1.2rem] border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-zinc-950/40">
                  {!isReviewMode ? (
                    <label className="block cursor-pointer rounded-xl border border-dashed border-black/20 bg-white px-4 py-4 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-white/20 dark:bg-zinc-950/60 dark:text-zinc-200 dark:hover:bg-white/5">
                      选择 Scratch 文件（.sb3）
                      <input
                        type="file"
                        accept=".sb3,.sb2,.sb,application/octet-stream"
                        className="mt-2 block w-full text-xs"
                        onChange={async event => {
                          const input = event.currentTarget
                          const file = event.target.files?.[0]
                          if (!file) return
                          await uploadScratchAnswer(currentStep.task.id, file)
                          input.value = ""
                        }}
                        disabled={Boolean(submitResult) || Boolean(uploadingTaskId)}
                      />
                    </label>
                  ) : null}
                  {effectiveScratchFiles[currentStep.task.id] ? (
                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-200">
                      已上传：{effectiveScratchFiles[currentStep.task.id]?.fileName}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-200">
                      尚未上传 Scratch 文件
                    </div>
                  )}
                  {effectiveScratchFiles[currentStep.task.id]?.downloadUrl ? (
                    <a
                      href={effectiveScratchFiles[currentStep.task.id]?.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
                    >
                      下载已上传文件
                    </a>
                  ) : null}
                  {uploadingTaskId === currentStep.task.id ? (
                    <div className="text-xs text-sky-700 dark:text-sky-300">上传中...</div>
                  ) : null}
                </div>
              ) : (
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
              )}
            </div>
          </div>
        )}

        {activeChoiceFeedback ? (
          <div
            ref={feedbackRef}
            className={`rounded-[1.4rem] border p-4 text-sm text-amber-800 transition dark:text-amber-200 ${
              feedbackHighlighted
                ? "border-amber-500/60 bg-amber-200/45 ring-2 ring-amber-400/50 dark:bg-amber-500/20"
                : "border-amber-500/20 bg-amber-500/5"
            }`}
          >
            这道题老师点评：{activeChoiceFeedback}
          </div>
        ) : null}

        {currentStep.kind === "coding" && activeTeacherFeedback ? (
          <div
            ref={activeChoiceFeedback ? undefined : feedbackRef}
            className={`rounded-[1.4rem] border p-4 text-sm text-amber-800 transition dark:text-amber-200 ${
              feedbackHighlighted
                ? "border-amber-500/60 bg-amber-200/45 ring-2 ring-amber-400/50 dark:bg-amber-500/20"
                : "border-amber-500/20 bg-amber-500/5"
            }`}
          >
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
            {!isReviewMode && submitResult ? (
              <>
                {" "}
                本次奖励积分 +{submitResult.reward.pointsAdded}（计入习题上限{" "}
                {submitResult.reward.pointsEarnedToday}/{submitResult.reward.pointsDailyCap}），成长值 +{submitResult.reward.xpAdded}（今日{" "}
                {submitResult.reward.xpEarnedToday}/{submitResult.reward.xpDailyCap}）。
              </>
            ) : null}
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
              } else if (
                (step.task.answerMode ?? "TEXT") === "SCRATCH_FILE"
                  ? Boolean(effectiveScratchFiles[step.task.id]?.objectKey)
                  : (effectiveCodingAnswers[step.task.id] ?? "").trim()
              ) {
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
