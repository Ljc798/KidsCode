import { Router } from "express"
import { prisma } from "@kidscode/database"
import { requireStudent } from "../middleware/requireStudent"
import { shanghaiDateKey } from "../lib/studentHelper"
import { createAdminNotificationForAll } from "../lib/adminNotification"
import {
  createExerciseScratchSubmissionObjectKey,
  getSignedDownloadUrl,
  uploadObject
} from "../lib/objectStorage"
import {
  getTokenFromRequest as getStudentTokenFromRequest,
  verifyStudentToken
} from "../lib/studentToken"
import {
  getTokenFromRequest as getAdminTokenFromRequest,
  verifyAdminToken
} from "../lib/adminToken"

const router = Router()
const EXERCISE_DAILY_POINTS_CAP = 200
const EXERCISE_XP_PER_SUBMISSION = 20
const EXERCISE_DAILY_XP_CAP = 100

type ChoiceOption = {
  id: string
  text: string
  imageUrl?: string | null
}

type MultipleChoiceQuestion = {
  id: string
  prompt: string
  promptImageUrl?: string | null
  options: ChoiceOption[]
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

type SubmissionAnswer = {
  questionId: string
  selectedOptionId: string
}

type SubmissionResult = {
  questionId: string
  selectedOptionId: string | null
  correctOptionId: string
  isCorrect: boolean
}

type ChoiceTeacherFeedback = {
  questionId: string
  comment: string
}

type CodingSubmissionAnswer = {
  taskId: string
  answer?: string
  scratchFile?: {
    objectKey: string
    fileName: string
    mimeType: string
    size: number
    downloadUrl: string
  } | null
}

function computePointWeights(multipleChoiceCount: number, codingTaskCount: number) {
  const unitTotal = multipleChoiceCount + codingTaskCount * 2
  if (unitTotal <= 0) {
    return {
      choicePoints: 0,
      codingPoints: 0,
      multipleChoiceMaxPoints: 0,
      codingMaxPoints: 0,
      totalMaxPoints: 100
    }
  }

  const choicePoints = 100 / unitTotal
  const codingPoints = choicePoints * 2
  return {
    choicePoints,
    codingPoints,
    multipleChoiceMaxPoints: Math.round(choicePoints * multipleChoiceCount),
    codingMaxPoints: Math.round(codingPoints * codingTaskCount),
    totalMaxPoints: 100
  }
}

const asString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

const asInt = (value: unknown) => {
  if (typeof value === "number" && Number.isInteger(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    if (Number.isInteger(parsed)) return parsed
  }
  return NaN
}

function requireStudentOrAdmin(req: any, res: any, next: any) {
  const studentToken = getStudentTokenFromRequest(req as any)
  const studentOk = studentToken ? verifyStudentToken(studentToken) : null
  if (studentOk) {
    req.studentId = studentOk.studentId
    return next()
  }

  const adminToken = getAdminTokenFromRequest(req as any)
  const adminOk = adminToken ? verifyAdminToken(adminToken) : null
  if (adminOk) {
    req.adminUserId = adminOk.userId
    return next()
  }

  return res.status(401).json({ error: "unauthorized" })
}

function decodeDataUrl(input: string) {
  const match = input.match(/^data:([^;,]+)?;base64,(.+)$/)
  if (!match) {
    throw new Error("content must be a base64 data URL")
  }
  return {
    mimeType: match[1] || "application/octet-stream",
    buffer: Buffer.from(match[2], "base64")
  }
}

function computeExercisePointReward(input: {
  exercisePointsDate: string | null
  exercisePointsEarned: number
  todayKey: string
  requested: number
}) {
  const earnedToday =
    input.exercisePointsDate === input.todayKey ? input.exercisePointsEarned : 0
  const remaining = Math.max(0, EXERCISE_DAILY_POINTS_CAP - earnedToday)
  const added = Math.max(0, Math.min(Math.floor(input.requested), remaining))
  return {
    added,
    nextEarnedToday: earnedToday + added,
    cap: EXERCISE_DAILY_POINTS_CAP
  }
}

function shanghaiDayRange(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  })
  const parts = formatter.formatToParts(now)
  const year = Number(parts.find(p => p.type === "year")?.value ?? "1970")
  const month = Number(parts.find(p => p.type === "month")?.value ?? "01")
  const day = Number(parts.find(p => p.type === "day")?.value ?? "01")
  const startMs = Date.UTC(year, month - 1, day, 0, 0, 0) - 8 * 60 * 60 * 1000
  return {
    start: new Date(startMs),
    end: new Date(startMs + 24 * 60 * 60 * 1000)
  }
}

function isChoiceOption(value: unknown): value is ChoiceOption {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === "string" &&
    typeof item.text === "string" &&
    (item.imageUrl === undefined ||
      item.imageUrl === null ||
      typeof item.imageUrl === "string")
  )
}

function isMultipleChoiceQuestion(
  value: unknown
): value is MultipleChoiceQuestion {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>
  if (
    typeof item.id !== "string" ||
    typeof item.prompt !== "string" ||
    typeof item.correctOptionId !== "string" ||
    (item.promptImageUrl !== undefined &&
      item.promptImageUrl !== null &&
      typeof item.promptImageUrl !== "string") ||
    !Array.isArray(item.options)
  ) {
    return false
  }

  return item.options.every(isChoiceOption)
}

function isCodingTask(value: unknown): value is CodingTask {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.description === "string" &&
    (item.materialRequirement === undefined ||
      item.materialRequirement === null ||
      typeof item.materialRequirement === "string") &&
    (item.scoringRubric === undefined ||
      item.scoringRubric === null ||
      typeof item.scoringRubric === "string") &&
    (item.requirementSteps === undefined ||
      (Array.isArray(item.requirementSteps) &&
        item.requirementSteps.every(step => {
          if (!step || typeof step !== "object") return false
          const node = step as Record<string, unknown>
          return (
            typeof node.id === "string" &&
            typeof node.text === "string" &&
            (node.imageUrl === undefined ||
              node.imageUrl === null ||
              typeof node.imageUrl === "string")
          )
        }))) &&
    typeof item.inputDescription === "string" &&
    typeof item.outputDescription === "string" &&
    typeof item.sampleInput1 === "string" &&
    typeof item.sampleOutput1 === "string" &&
    typeof item.sampleInput2 === "string" &&
    typeof item.sampleOutput2 === "string" &&
    (item.answerMode === undefined ||
      item.answerMode === "TEXT" ||
      item.answerMode === "SCRATCH_FILE") &&
    (item.descriptionImageUrl === undefined ||
      item.descriptionImageUrl === null ||
      typeof item.descriptionImageUrl === "string") &&
    (item.referenceImageUrls === undefined ||
      (Array.isArray(item.referenceImageUrls) &&
        item.referenceImageUrls.every(url => typeof url === "string"))) &&
    (item.placeholder === undefined ||
      item.placeholder === null ||
      typeof item.placeholder === "string")
  )
}

function parseMultipleChoice(value: unknown): MultipleChoiceQuestion[] | null {
  if (!Array.isArray(value)) return null
  if (!value.every(isMultipleChoiceQuestion)) return null

  for (const question of value) {
    if (!question.id.trim() || !question.prompt.trim()) return null
    if (question.options.length < 2) return null
    if (question.options.some(option => !option.id.trim())) {
      return null
    }
    const optionIds = new Set(question.options.map(option => option.id))
    if (optionIds.size !== question.options.length) return null
    if (!optionIds.has(question.correctOptionId)) return null
  }

  return value
}

function parseCodingTasks(
  value: unknown,
  fallback?: {
    codingTitle: string
    codingPrompt: string
    codingPlaceholder: string | null
  }
): CodingTask[] | null {
  if (value === undefined || value === null) {
    if (!fallback) return []
    if (!fallback.codingTitle || !fallback.codingPrompt) return []
    return [
      {
        id: "coding-1",
        title: fallback.codingTitle,
        description: fallback.codingPrompt,
        inputDescription: "",
        outputDescription: "",
        sampleInput1: "",
        sampleOutput1: "",
        sampleInput2: "",
        sampleOutput2: "",
        placeholder: fallback.codingPlaceholder
      }
    ]
  }

  if (!Array.isArray(value)) return null
  if (!value.every(isCodingTask)) return null

  for (const task of value) {
    if (!task.id.trim() || !task.title.trim() || !task.description.trim()) return null
    if (task.requirementSteps && task.requirementSteps.some(step => !step.id.trim())) {
      return null
    }
    if (task.answerMode && task.answerMode !== "TEXT" && task.answerMode !== "SCRATCH_FILE") {
      return null
    }
  }

  return value
}

function parseSubmissionAnswers(value: unknown): SubmissionAnswer[] | null {
  if (!Array.isArray(value)) return null

  const parsed: SubmissionAnswer[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") return null
    const answer = item as Record<string, unknown>
    const questionId = asString(answer.questionId)
    const selectedOptionId = asString(answer.selectedOptionId)
    if (!questionId || !selectedOptionId) return null
    parsed.push({ questionId, selectedOptionId })
  }

  return parsed
}

function parseCodingSubmissionAnswers(value: unknown): CodingSubmissionAnswer[] | null {
  if (!Array.isArray(value)) return null

  const parsed: CodingSubmissionAnswer[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") return null
    const answer = item as Record<string, unknown>
    const taskId = asString(answer.taskId)
    if (!taskId) return null

    const content = typeof answer.answer === "string" ? answer.answer.trim() : ""
    const scratchFileRaw =
      answer.scratchFile && typeof answer.scratchFile === "object"
        ? (answer.scratchFile as Record<string, unknown>)
        : null
    const scratchFile =
      scratchFileRaw &&
      typeof scratchFileRaw.objectKey === "string" &&
      typeof scratchFileRaw.fileName === "string" &&
      typeof scratchFileRaw.mimeType === "string" &&
      typeof scratchFileRaw.size === "number" &&
      typeof scratchFileRaw.downloadUrl === "string"
        ? {
            objectKey: scratchFileRaw.objectKey.trim(),
            fileName: scratchFileRaw.fileName.trim(),
            mimeType: scratchFileRaw.mimeType.trim(),
            size: Math.max(0, Math.floor(scratchFileRaw.size)),
            downloadUrl: scratchFileRaw.downloadUrl.trim()
          }
        : null

    if (!content && !scratchFile) return null
    if (content.length > 20000) return null
    parsed.push({
      taskId,
      answer: content || undefined,
      scratchFile
    })
  }

  return parsed
}

function parseStoredSubmissionResults(value: unknown): SubmissionResult[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(item => {
    if (!item || typeof item !== "object") return []
    const result = item as Record<string, unknown>
    const questionId = asString(result.questionId)
    const selectedOptionId =
      result.selectedOptionId === null ? null : asString(result.selectedOptionId)
    const correctOptionId = asString(result.correctOptionId)
    const isCorrect = result.isCorrect === true
    if (!questionId || !correctOptionId) return []
    return [{ questionId, selectedOptionId, correctOptionId, isCorrect }]
  })
}

function parseStoredCodingAnswers(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.flatMap(item => {
    if (!item || typeof item !== "object") return []
    const answer = item as Record<string, unknown>
    const taskId = asString(answer.taskId)
    const title = asString(answer.title)
    const content = typeof answer.answer === "string" ? answer.answer : ""
    const scratchFile =
      answer.scratchFile &&
      typeof answer.scratchFile === "object" &&
      typeof (answer.scratchFile as Record<string, unknown>).objectKey === "string"
        ? {
            objectKey: asString((answer.scratchFile as Record<string, unknown>).objectKey),
            fileName: asString((answer.scratchFile as Record<string, unknown>).fileName),
            mimeType: asString((answer.scratchFile as Record<string, unknown>).mimeType),
            size:
              typeof (answer.scratchFile as Record<string, unknown>).size === "number"
                ? Math.max(0, Math.floor((answer.scratchFile as Record<string, unknown>).size as number))
                : 0,
            downloadUrl: getSignedDownloadUrl(
              asString((answer.scratchFile as Record<string, unknown>).objectKey)
            )
          }
        : null
    if (!taskId) return []
    return [{ taskId, title, answer: content, scratchFile }]
  })
}

function parseStoredChoiceFeedback(value: unknown): ChoiceTeacherFeedback[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(item => {
    if (!item || typeof item !== "object") return []
    const feedback = item as Record<string, unknown>
    const questionId = asString(feedback.questionId)
    const comment = typeof feedback.comment === "string" ? feedback.comment.trim() : ""
    if (!questionId || !comment) return []
    return [{ questionId, comment }]
  })
}

function shuffle<T>(items: T[]) {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

function serializeExerciseBank(bank: {
  id: string
  slug: string
  title: string
  summary: string | null
  imageUrl: string | null
  subject: "CPP" | "SCRATCH"
  difficultyType: "LEVEL" | "OTHER"
  difficultyLevel: number | null
  level: number
  multipleChoice: unknown
  codingTasks: unknown
  codingTitle: string
  codingPrompt: string
  codingPlaceholder: string | null
}) {
  const multipleChoice = parseMultipleChoice(bank.multipleChoice)
  const codingTasks = parseCodingTasks(bank.codingTasks, {
    codingTitle: bank.codingTitle,
    codingPrompt: bank.codingPrompt,
    codingPlaceholder: bank.codingPlaceholder
  })
  if (!multipleChoice || !codingTasks) return null

  return {
    id: bank.id,
    slug: bank.slug,
    title: bank.title,
    summary: bank.summary,
    imageUrl: bank.imageUrl,
    subject: bank.subject,
    difficultyType: bank.difficultyType,
    difficultyLevel: bank.difficultyLevel,
    level: bank.level,
    multipleChoice,
    codingTasks
  }
}

router.get("/", requireStudent, async (req: any, res) => {
  const level = req.query?.level === undefined ? NaN : asInt(req.query.level)
  const subject = req.query?.subject === "SCRATCH" ? "SCRATCH" : req.query?.subject === "CPP" ? "CPP" : ""
  const difficultyType =
    req.query?.difficultyType === "OTHER"
      ? "OTHER"
      : req.query?.difficultyType === "LEVEL"
        ? "LEVEL"
        : ""
  const exerciseBanks = await prisma.exerciseBank.findMany({
    where: {
      isPublished: true,
      ...(subject ? { subject } : {}),
      ...(difficultyType ? { difficultyType } : {}),
      ...(Number.isInteger(level)
        ? { difficultyType: "LEVEL", difficultyLevel: level }
        : {})
    },
    orderBy: [{ difficultyType: "asc" }, { difficultyLevel: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      imageUrl: true,
      subject: true,
      difficultyType: true,
      difficultyLevel: true,
      level: true,
      multipleChoice: true,
      codingTasks: true,
      codingTitle: true,
      codingPrompt: true,
      codingPlaceholder: true,
      _count: { select: { submissions: true } }
    }
  })

  res.json(
    exerciseBanks.map(bank => {
      const serialized = serializeExerciseBank(bank)
      return {
        id: bank.id,
        slug: bank.slug,
        title: bank.title,
        summary: bank.summary,
        imageUrl: bank.imageUrl,
        subject: bank.subject,
        difficultyType: bank.difficultyType,
        difficultyLevel: bank.difficultyLevel,
        level: bank.level,
        multipleChoiceCount: serialized?.multipleChoice.length ?? 0,
        codingTaskCount: serialized?.codingTasks.length ?? 0,
        codingTitle: serialized?.codingTasks[0]?.title ?? bank.codingTitle,
        submissionsCount: bank._count.submissions
      }
    })
  )
})

router.get("/assets/:encodedKey", requireStudentOrAdmin, async (req, res) => {
  const encodedKey = asString(req.params.encodedKey)
  if (!encodedKey) return res.status(400).json({ error: "invalid key" })

  let key = ""
  try {
    key = decodeURIComponent(encodedKey)
  } catch {
    return res.status(400).json({ error: "invalid key" })
  }
  if (!key || key.includes("..")) {
    return res.status(400).json({ error: "invalid key" })
  }

  const signedUrl = getSignedDownloadUrl(key, 60 * 10)
  const upstream = await fetch(signedUrl)
  if (!upstream.ok) {
    return res.status(404).json({ error: "asset not found" })
  }

  const body = Buffer.from(await upstream.arrayBuffer())
  const contentType = upstream.headers.get("content-type") || "application/octet-stream"
  res.setHeader("content-type", contentType)
  res.setHeader("cache-control", "private, max-age=300")
  return res.status(200).send(body)
})

router.get("/:slug", requireStudent, async (req, res) => {
  const slug = asString(req.params.slug)
  if (!slug) return res.status(400).json({ error: "invalid slug" })

  const bank = await prisma.exerciseBank.findFirst({
    where: { slug, isPublished: true },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      imageUrl: true,
      subject: true,
      difficultyType: true,
      difficultyLevel: true,
      level: true,
      multipleChoice: true,
      codingTasks: true,
      codingTitle: true,
      codingPrompt: true,
      codingPlaceholder: true
    }
  })

  if (!bank) return res.status(404).json({ error: "not found" })

  const serialized = serializeExerciseBank(bank)
  if (!serialized) {
    return res.status(500).json({ error: "exercise data is invalid" })
  }

  res.json({
    ...serialized,
    multipleChoice: serialized.multipleChoice.map(question => ({
      id: question.id,
      prompt: question.prompt,
      options: shuffle(question.options)
    }))
  })
})

router.get("/:slug/submissions", requireStudent, async (req: any, res) => {
  const slug = asString(req.params.slug)
  if (!slug) return res.status(400).json({ error: "invalid slug" })

  const exercise = await prisma.exerciseBank.findFirst({
    where: { slug, isPublished: true },
    select: { id: true }
  })
  if (!exercise) return res.status(404).json({ error: "not found" })

  const submissions = await prisma.exerciseSubmission.findMany({
    where: {
      exerciseBankId: exercise.id,
      studentId: req.studentId as string
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      multipleChoiceFeedback: true,
      multipleChoicePoints: true,
      codingPoints: true,
      totalPoints: true,
      totalMaxPoints: true,
      multipleChoiceScore: true,
      multipleChoiceTotal: true,
      codingStatus: true,
      codingIsCorrect: true,
      teacherFeedback: true,
      createdAt: true,
      reviewedAt: true
    }
  })

  res.json(
    submissions.map(submission => ({
      id: submission.id,
      multipleChoiceFeedback: parseStoredChoiceFeedback(submission.multipleChoiceFeedback),
      multipleChoicePoints: submission.multipleChoicePoints,
      codingPoints: submission.codingPoints,
      totalPoints: submission.totalPoints,
      totalMaxPoints: submission.totalMaxPoints,
      score: submission.multipleChoiceScore,
      total: submission.multipleChoiceTotal,
      codingStatus: submission.codingStatus,
      codingIsCorrect: submission.codingIsCorrect,
      teacherFeedback: submission.teacherFeedback,
      createdAt: submission.createdAt.toISOString(),
      reviewedAt: submission.reviewedAt?.toISOString() ?? null
    }))
  )
})

router.get("/:slug/submissions/:submissionId", requireStudent, async (req: any, res) => {
  const slug = asString(req.params.slug)
  const submissionId = asString(req.params.submissionId)
  if (!slug || !submissionId) return res.status(400).json({ error: "invalid params" })

  const bank = await prisma.exerciseBank.findFirst({
    where: { slug, isPublished: true },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      imageUrl: true,
      subject: true,
      difficultyType: true,
      difficultyLevel: true,
      level: true,
      multipleChoice: true,
      codingTasks: true,
      codingTitle: true,
      codingPrompt: true,
      codingPlaceholder: true
    }
  })
  if (!bank) return res.status(404).json({ error: "not found" })

  const serialized = serializeExerciseBank(bank)
  if (!serialized) {
    return res.status(500).json({ error: "exercise data is invalid" })
  }

  const submission = await prisma.exerciseSubmission.findFirst({
    where: {
      id: submissionId,
      exerciseBankId: bank.id,
      studentId: req.studentId as string
    },
    select: {
      id: true,
      multipleChoiceAnswers: true,
      multipleChoiceFeedback: true,
      multipleChoicePoints: true,
      codingPoints: true,
      totalPoints: true,
      totalMaxPoints: true,
      multipleChoiceScore: true,
      multipleChoiceTotal: true,
      codingAnswers: true,
      codingStatus: true,
      codingIsCorrect: true,
      teacherFeedback: true,
      createdAt: true,
      reviewedAt: true
    }
  })
  if (!submission) return res.status(404).json({ error: "not found" })

  res.json({
    submission: {
      id: submission.id,
      multipleChoiceFeedback: parseStoredChoiceFeedback(submission.multipleChoiceFeedback),
      multipleChoicePoints: submission.multipleChoicePoints,
      codingPoints: submission.codingPoints,
      totalPoints: submission.totalPoints,
      totalMaxPoints: submission.totalMaxPoints,
      score: submission.multipleChoiceScore,
      total: submission.multipleChoiceTotal,
      results: parseStoredSubmissionResults(submission.multipleChoiceAnswers),
      codingAnswers: parseStoredCodingAnswers(submission.codingAnswers),
      codingStatus: submission.codingStatus,
      codingIsCorrect: submission.codingIsCorrect,
      teacherFeedback: submission.teacherFeedback,
      createdAt: submission.createdAt.toISOString(),
      reviewedAt: submission.reviewedAt?.toISOString() ?? null
    },
    exercise: serialized
  })
})

router.post("/:slug/scratch-upload", requireStudent, async (req: any, res) => {
  const slug = asString(req.params.slug)
  const taskId = asString(req.body?.taskId)
  const fileName = asString(req.body?.fileName)
  const dataUrl = typeof req.body?.content === "string" ? req.body.content : ""
  const mimeTypeRaw = asString(req.body?.mimeType)

  if (!slug) return res.status(400).json({ error: "invalid slug" })
  if (!taskId) return res.status(400).json({ error: "taskId is required" })
  if (!fileName) return res.status(400).json({ error: "fileName is required" })
  if (!dataUrl) return res.status(400).json({ error: "content is required" })

  const bank = await prisma.exerciseBank.findFirst({
    where: { slug, isPublished: true },
    select: {
      slug: true,
      codingTasks: true,
      codingTitle: true,
      codingPrompt: true,
      codingPlaceholder: true
    }
  })
  if (!bank) return res.status(404).json({ error: "not found" })

  const codingTasks = parseCodingTasks(bank.codingTasks, {
    codingTitle: bank.codingTitle,
    codingPrompt: bank.codingPrompt,
    codingPlaceholder: bank.codingPlaceholder
  })
  if (!codingTasks) return res.status(500).json({ error: "exercise data is invalid" })

  const task = codingTasks.find(item => item.id === taskId)
  if (!task) return res.status(400).json({ error: "unknown taskId" })
  if ((task.answerMode ?? "TEXT") !== "SCRATCH_FILE") {
    return res.status(400).json({ error: "this task does not accept scratch files" })
  }

  let decoded: { mimeType: string; buffer: Buffer }
  try {
    decoded = decodeDataUrl(dataUrl)
  } catch (error: unknown) {
    return res.status(400).json({ error: error instanceof Error ? error.message : "invalid file content" })
  }

  if (decoded.buffer.byteLength > 25_000_000) {
    return res.status(400).json({ error: "scratch file is too large" })
  }

  const objectKey = createExerciseScratchSubmissionObjectKey({
    studentId: req.studentId as string,
    slug: bank.slug,
    taskId,
    fileName
  })
  const uploaded = await uploadObject({
    key: objectKey,
    body: decoded.buffer,
    contentType: mimeTypeRaw || decoded.mimeType
  })

  res.json({
    ok: true,
    file: {
      objectKey: uploaded.key,
      fileName,
      mimeType: mimeTypeRaw || decoded.mimeType,
      size: uploaded.size,
      downloadUrl: getSignedDownloadUrl(uploaded.key)
    }
  })
})

router.post("/:slug/submissions", requireStudent, async (req: any, res) => {
  const slug = asString(req.params.slug)
  const answers = parseSubmissionAnswers(req.body?.answers)
  const codingAnswers = parseCodingSubmissionAnswers(req.body?.codingAnswers)

  if (!slug) return res.status(400).json({ error: "invalid slug" })
  if (!answers) return res.status(400).json({ error: "answers are invalid" })
  if (!codingAnswers) return res.status(400).json({ error: "codingAnswers are invalid" })

  const bank = await prisma.exerciseBank.findFirst({
    where: { slug, isPublished: true },
    select: {
      id: true,
      title: true,
      multipleChoice: true,
      codingTasks: true,
      codingTitle: true,
      codingPrompt: true,
      codingPlaceholder: true
    }
  })
  if (!bank) return res.status(404).json({ error: "not found" })

  const multipleChoice = parseMultipleChoice(bank.multipleChoice)
  const codingTasks = parseCodingTasks(bank.codingTasks, {
    codingTitle: bank.codingTitle,
    codingPrompt: bank.codingPrompt,
    codingPlaceholder: bank.codingPlaceholder
  })
  if (!multipleChoice || !codingTasks) {
    return res.status(500).json({ error: "exercise data is invalid" })
  }

  const answerMap = new Map<string, string>()
  for (const answer of answers) {
    answerMap.set(answer.questionId, answer.selectedOptionId)
  }
  const codingAnswerMap = new Map<string, CodingSubmissionAnswer>()
  for (const answer of codingAnswers) {
    codingAnswerMap.set(answer.taskId, answer)
  }

  if (answerMap.size !== multipleChoice.length) {
    return res.status(400).json({ error: "all multiple-choice questions must be answered" })
  }
  if (codingAnswerMap.size !== codingTasks.length) {
    return res.status(400).json({ error: "all coding tasks must be answered" })
  }
  for (const task of codingTasks) {
    const submitted = codingAnswerMap.get(task.id)
    if (!submitted) {
      return res.status(400).json({ error: "all coding tasks must be answered" })
    }
    if ((task.answerMode ?? "TEXT") === "SCRATCH_FILE") {
      if (!submitted.scratchFile?.objectKey) {
        return res.status(400).json({ error: "scratch file is required for this task" })
      }
    } else if (!(submitted.answer ?? "").trim()) {
      return res.status(400).json({ error: "text answer is required for this task" })
    }
  }
  if (multipleChoice.length + codingTasks.length === 0) {
    return res.status(400).json({ error: "exercise has no content" })
  }

  let score = 0
  const results = multipleChoice.map(question => {
    const selectedOptionId = answerMap.get(question.id)
    if (!selectedOptionId) {
      return {
        questionId: question.id,
        selectedOptionId: null,
        correctOptionId: question.correctOptionId,
        isCorrect: false
      }
    }
    const isCorrect = selectedOptionId === question.correctOptionId
    if (isCorrect) score += 1
    return {
      questionId: question.id,
      selectedOptionId,
      correctOptionId: question.correctOptionId,
      isCorrect
    }
  })

  const codingAnswerList = codingTasks.map(task => {
    const submitted = codingAnswerMap.get(task.id)
    return {
      taskId: task.id,
      title: task.title,
      answerMode: task.answerMode ?? "TEXT",
      answer: submitted?.answer ?? "",
      scratchFile: submitted?.scratchFile ?? null
    }
  })
  const weights = computePointWeights(multipleChoice.length, codingTasks.length)
  const multipleChoicePoints = Math.round(score * weights.choicePoints)
  const studentId = req.studentId as string
  const todayKey = shanghaiDateKey()

  const out = await prisma.$transaction(async tx => {
    const submission = await tx.exerciseSubmission.create({
      data: {
        exerciseBankId: bank.id,
        studentId,
        multipleChoiceAnswers: results,
        multipleChoiceScore: score,
        multipleChoiceTotal: multipleChoice.length,
        multipleChoicePoints,
        codingPoints: 0,
        codingMaxPoints: weights.codingMaxPoints,
        totalPoints: multipleChoicePoints,
        totalMaxPoints: weights.totalMaxPoints,
        codingAnswer: codingAnswerList
          .map(item =>
            item.answerMode === "SCRATCH_FILE"
              ? `${item.title}\n[Scratch 文件] ${item.scratchFile?.fileName ?? "未命名"}`
              : `${item.title}\n${item.answer}`
          )
          .join("\n\n"),
        codingAnswers: codingAnswerList
      },
      select: {
        id: true,
        codingStatus: true,
        createdAt: true,
        totalPoints: true,
        totalMaxPoints: true,
        multipleChoicePoints: true,
        codingMaxPoints: true
      }
    })

    const student = await tx.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        nickname: true,
        className: true,
        pointsBalance: true,
        petXp: true,
        exercisePointsDate: true,
        exercisePointsEarned: true
      }
    })
    if (!student) return null

    const pointReward = computeExercisePointReward({
      exercisePointsDate: student.exercisePointsDate,
      exercisePointsEarned: student.exercisePointsEarned,
      todayKey,
      requested: multipleChoicePoints
    })
    const dayRange = shanghaiDayRange()
    const todayActivities = await tx.studentActivity.findMany({
      where: {
        studentId,
        kind: "POINTS_AWARD",
        createdAt: {
          gte: dayRange.start,
          lt: dayRange.end
        }
      },
      select: {
        meta: true
      }
    })
    const earnedXpToday = todayActivities.reduce((sum, item) => {
      const meta = item.meta as Record<string, unknown> | null
      if (!meta || meta.source !== "exercise_submission_reward") return sum
      const xp = typeof meta.xpAdded === "number" ? meta.xpAdded : Number(meta.xpAdded ?? 0)
      return sum + (Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0)
    }, 0)
    const xpRemaining = Math.max(0, EXERCISE_DAILY_XP_CAP - earnedXpToday)
    const xpAdded = Math.min(EXERCISE_XP_PER_SUBMISSION, xpRemaining)

    const updatedStudent = await tx.student.update({
      where: { id: student.id },
      data: {
        pointsBalance: student.pointsBalance + pointReward.added,
        petXp: student.petXp + xpAdded,
        exercisePointsDate: todayKey,
        exercisePointsEarned: pointReward.nextEarnedToday
      },
      select: {
        pointsBalance: true,
        petXp: true
      }
    })

    await tx.studentActivity.create({
      data: {
        studentId,
        kind: "POINTS_AWARD",
        pointsRequested: multipleChoicePoints,
        pointsAdded: pointReward.added,
        ok: true,
        meta: {
          source: "exercise_submission_reward",
          submissionId: submission.id,
          slug,
          xpRequested: EXERCISE_XP_PER_SUBMISSION,
          xpAdded
        }
      }
    })

    return {
      submission,
      student: {
        nickname: student.nickname,
        className: student.className
      },
      reward: {
        pointsRequested: multipleChoicePoints,
        pointsAdded: pointReward.added,
        pointsEarnedToday: pointReward.nextEarnedToday,
        pointsDailyCap: pointReward.cap,
        xpRequested: EXERCISE_XP_PER_SUBMISSION,
        xpEarnedToday: earnedXpToday + xpAdded,
        xpDailyCap: EXERCISE_DAILY_XP_CAP,
        xpAdded,
        pointsBalance: updatedStudent.pointsBalance,
        petXp: updatedStudent.petXp
      }
    }
  })
  if (!out) return res.status(401).json({ error: "student not found" })

  try {
    await createAdminNotificationForAll({
      category: "EXERCISE",
      title: "有学生提交了习题",
      content: `${out.student.nickname}（${out.student.className ?? "未分班"}）提交了《${bank.title}》。`,
      payload: {
        studentId,
        studentNickname: out.student.nickname,
        className: out.student.className ?? null,
        exerciseSlug: slug,
        exerciseTitle: bank.title,
        submissionId: out.submission.id
      }
    })
  } catch (e) {
    console.error("failed to create admin exercise submission notification", e)
  }

  res.json({
    ok: true,
    submission: {
      id: out.submission.id,
      codingStatus: out.submission.codingStatus,
      createdAt: out.submission.createdAt.toISOString(),
      totalPoints: out.submission.totalPoints,
      totalMaxPoints: out.submission.totalMaxPoints
    },
    score,
    total: multipleChoice.length,
    multipleChoicePoints,
    codingMaxPoints: out.submission.codingMaxPoints,
    reward: out.reward,
    results
  })
})

export default router
