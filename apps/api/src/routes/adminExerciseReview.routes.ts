import { Router } from "express"
import { prisma } from "@kidscode/database"
import { requireAdmin } from "../middleware/requireAdmin"
import { shanghaiDateKey } from "../lib/studentHelper"
import { createStudentNotification } from "../lib/notification"

const router = Router()
const EXERCISE_DAILY_POINTS_CAP = 200

type ChoiceTeacherFeedback = {
  questionId: string
  comment: string
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

function parseChoiceFeedback(value: unknown): ChoiceTeacherFeedback[] | null {
  if (!Array.isArray(value)) return null

  const parsed: ChoiceTeacherFeedback[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") return null
    const feedback = item as Record<string, unknown>
    const questionId = asString(feedback.questionId)
    const comment = typeof feedback.comment === "string" ? feedback.comment.trim() : ""
    if (!questionId) return null
    if (comment) parsed.push({ questionId, comment })
  }

  return parsed
}

function serializeChoiceFeedback(value: unknown): ChoiceTeacherFeedback[] {
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

router.use(requireAdmin)

router.get("/", async (req, res) => {
  const level = req.query?.level === undefined ? NaN : asInt(req.query.level)
  const studentId = asString(req.query?.studentId)
  const codingStatus = asString(req.query?.codingStatus)

  const submissions = await prisma.exerciseSubmission.findMany({
    where: {
      ...(studentId ? { studentId } : {}),
      ...(codingStatus === "PENDING" || codingStatus === "REVIEWED"
        ? { codingStatus }
        : {}),
      ...(Number.isInteger(level) ? { exerciseBank: { level } } : {})
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      multipleChoiceScore: true,
      multipleChoiceTotal: true,
      multipleChoicePoints: true,
      codingPoints: true,
      codingMaxPoints: true,
      totalPoints: true,
      totalMaxPoints: true,
      codingStatus: true,
      codingIsCorrect: true,
      teacherFeedback: true,
      createdAt: true,
      reviewedAt: true,
      exerciseBank: {
        select: { id: true, title: true, level: true, slug: true }
      },
      student: {
        select: {
          id: true,
          nickname: true,
          className: true,
          user: { select: { account: true, phone: true } }
        }
      }
    }
  })

  const students = await prisma.student.findMany({
    orderBy: [{ nickname: "asc" }],
    select: {
      id: true,
      nickname: true,
      className: true,
      user: { select: { account: true, phone: true } }
    }
  })

  res.json({
    items: submissions.map(item => ({
      id: item.id,
      multipleChoiceScore: item.multipleChoiceScore,
      multipleChoiceTotal: item.multipleChoiceTotal,
      multipleChoicePoints: item.multipleChoicePoints,
      codingPoints: item.codingPoints,
      codingMaxPoints: item.codingMaxPoints,
      totalPoints: item.totalPoints,
      totalMaxPoints: item.totalMaxPoints,
      codingStatus: item.codingStatus,
      codingIsCorrect: item.codingIsCorrect,
      teacherFeedback: item.teacherFeedback,
      createdAt: item.createdAt.toISOString(),
      reviewedAt: item.reviewedAt?.toISOString() ?? null,
      exercise: item.exerciseBank,
      student: {
        id: item.student.id,
        nickname: item.student.nickname,
        className: item.student.className,
        account: item.student.user.account ?? item.student.user.phone ?? ""
      }
    })),
    filters: {
      students: students.map(student => ({
        id: student.id,
        nickname: student.nickname,
        className: student.className,
        account: student.user.account ?? student.user.phone ?? ""
      }))
    }
  })
})

router.get("/:id", async (req, res) => {
  const id = asString(req.params.id)
  if (!id) return res.status(400).json({ error: "invalid id" })

  const submission = await prisma.exerciseSubmission.findUnique({
    where: { id },
    select: {
      id: true,
      multipleChoiceAnswers: true,
      multipleChoiceFeedback: true,
      multipleChoiceScore: true,
      multipleChoiceTotal: true,
      multipleChoicePoints: true,
      codingAnswer: true,
      codingAnswers: true,
      codingPoints: true,
      codingMaxPoints: true,
      totalPoints: true,
      totalMaxPoints: true,
      codingStatus: true,
      codingIsCorrect: true,
      teacherFeedback: true,
      createdAt: true,
      reviewedAt: true,
      exerciseBank: {
        select: {
          id: true,
          title: true,
          level: true,
          multipleChoice: true,
          codingTasks: true,
          codingTitle: true,
          codingPrompt: true,
          codingPlaceholder: true
        }
      },
      student: {
        select: {
          id: true,
          nickname: true,
          className: true,
          user: { select: { account: true, phone: true } }
        }
      }
    }
  })

  if (!submission) return res.status(404).json({ error: "not found" })

  res.json({
    id: submission.id,
    multipleChoiceAnswers: submission.multipleChoiceAnswers,
    multipleChoiceFeedback: serializeChoiceFeedback(submission.multipleChoiceFeedback),
    multipleChoiceScore: submission.multipleChoiceScore,
    multipleChoiceTotal: submission.multipleChoiceTotal,
    multipleChoicePoints: submission.multipleChoicePoints,
    codingAnswer: submission.codingAnswer,
    codingAnswers: submission.codingAnswers,
    codingPoints: submission.codingPoints,
    codingMaxPoints: submission.codingMaxPoints,
    totalPoints: submission.totalPoints,
    totalMaxPoints: submission.totalMaxPoints,
    codingStatus: submission.codingStatus,
    codingIsCorrect: submission.codingIsCorrect,
    teacherFeedback: submission.teacherFeedback,
    createdAt: submission.createdAt.toISOString(),
    reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    exercise: submission.exerciseBank,
    student: {
      id: submission.student.id,
      nickname: submission.student.nickname,
      className: submission.student.className,
      account: submission.student.user.account ?? submission.student.user.phone ?? ""
    }
  })
})

router.patch("/:id", async (req, res) => {
  const id = asString(req.params.id)
  if (!id) return res.status(400).json({ error: "invalid id" })

  const teacherFeedback = asString(req.body?.teacherFeedback)
  const codingStatus = asString(req.body?.codingStatus)
  const codingPoints = asInt(req.body?.codingPoints)
  const codingIsCorrectRaw = req.body?.codingIsCorrect
  const multipleChoiceFeedback = parseChoiceFeedback(req.body?.multipleChoiceFeedback)

  if (multipleChoiceFeedback === null) {
    return res.status(400).json({ error: "invalid multipleChoiceFeedback" })
  }
  if (codingStatus && codingStatus !== "PENDING" && codingStatus !== "REVIEWED") {
    return res.status(400).json({ error: "invalid codingStatus" })
  }
  if (
    codingIsCorrectRaw !== undefined &&
    typeof codingIsCorrectRaw !== "boolean" &&
    codingIsCorrectRaw !== null
  ) {
    return res.status(400).json({ error: "invalid codingIsCorrect" })
  }

  const existing = await prisma.exerciseSubmission.findUnique({
    where: { id },
    select: {
      id: true,
      studentId: true,
      multipleChoicePoints: true,
      codingPoints: true,
      codingMaxPoints: true,
      exerciseBank: {
        select: {
          multipleChoice: true,
          title: true,
          slug: true
        }
      }
    }
  })
  if (!existing) return res.status(404).json({ error: "not found" })

  const questionIds = new Set(
    Array.isArray(existing.exerciseBank.multipleChoice)
      ? existing.exerciseBank.multipleChoice.flatMap(item => {
          if (!item || typeof item !== "object") return []
          const question = item as Record<string, unknown>
          const questionId = asString(question.id)
          return questionId ? [questionId] : []
        })
      : []
  )

  if (multipleChoiceFeedback.some(item => !questionIds.has(item.questionId))) {
    return res.status(400).json({ error: "multipleChoiceFeedback contains unknown questionId" })
  }

  if (!Number.isInteger(codingPoints) || codingPoints < 0 || codingPoints > existing.codingMaxPoints) {
    return res.status(400).json({
      error: `codingPoints must be an integer between 0 and ${existing.codingMaxPoints}`
    })
  }

  const nextStatus = codingStatus === "PENDING" ? "PENDING" : "REVIEWED"
  const reviewedAt = nextStatus === "REVIEWED" ? new Date() : null
  const totalPoints = existing.multipleChoicePoints + codingPoints
  const codingDelta = Math.max(0, codingPoints - existing.codingPoints)
  const todayKey = shanghaiDateKey()

  const out = await prisma.$transaction(async tx => {
    let reward: null | {
      pointsRequested: number
      pointsAdded: number
      pointsEarnedToday: number
      pointsDailyCap: number
      xpAdded: number
      pointsBalance: number
      petXp: number
    } = null

    if (codingDelta > 0) {
      const student = await tx.student.findUnique({
        where: { id: existing.studentId },
        select: {
          id: true,
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
        requested: codingDelta
      })
      const xpAdded = codingDelta

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
          studentId: student.id,
          kind: "POINTS_AWARD",
          pointsRequested: codingDelta,
          pointsAdded: pointReward.added,
          ok: true,
          meta: {
            source: "exercise_review_reward",
            submissionId: id,
            codingDelta,
            xpAdded
          }
        }
      })

      reward = {
        pointsRequested: codingDelta,
        pointsAdded: pointReward.added,
        pointsEarnedToday: pointReward.nextEarnedToday,
        pointsDailyCap: pointReward.cap,
        xpAdded,
        pointsBalance: updatedStudent.pointsBalance,
        petXp: updatedStudent.petXp
      }
    }

    const updated = await tx.exerciseSubmission.update({
      where: { id },
      data: {
        multipleChoiceFeedback,
        teacherFeedback: teacherFeedback || null,
        codingStatus: nextStatus,
        codingIsCorrect:
          codingIsCorrectRaw === null || codingIsCorrectRaw === undefined
            ? null
            : Boolean(codingIsCorrectRaw),
        codingPoints,
        totalPoints,
        reviewedAt
      }
    })

    return { updated, reward }
  })
  if (!out) return res.status(404).json({ error: "student not found" })

  try {
    await createStudentNotification({
      recipientStudentId: existing.studentId,
      type: "REVIEW_DONE",
      title: "练习已批改",
      content: `《${existing.exerciseBank.title}》已批改完成，请查看反馈。`,
      payload: {
        submissionId: out.updated.id,
        exerciseTitle: existing.exerciseBank.title,
        exerciseSlug: existing.exerciseBank.slug
      }
    })

    if (out.updated.teacherFeedback) {
      await createStudentNotification({
        recipientStudentId: existing.studentId,
        type: "REVIEW_COMMENT",
        title: "老师新增了评语",
        content: out.updated.teacherFeedback.slice(0, 120),
        payload: {
          submissionId: out.updated.id,
          exerciseSlug: existing.exerciseBank.slug
        }
      })
    }

    if (out.reward && out.reward.pointsAdded > 0) {
      await createStudentNotification({
        recipientStudentId: existing.studentId,
        type: "REWARD_GRANTED",
        title: "收到练习奖励",
        content: `积分 +${out.reward.pointsAdded}，成长值 +${out.reward.xpAdded}。`,
        payload: {
          submissionId: out.updated.id,
          exerciseSlug: existing.exerciseBank.slug,
          reward: out.reward
        }
      })
    }
  } catch (e) {
    console.error("failed to create exercise review notification", e)
  }

  res.json({
    id: out.updated.id,
    codingStatus: out.updated.codingStatus,
    codingIsCorrect: out.updated.codingIsCorrect,
    codingPoints: out.updated.codingPoints,
    totalPoints: out.updated.totalPoints,
    totalMaxPoints: out.updated.totalMaxPoints,
    teacherFeedback: out.updated.teacherFeedback,
    multipleChoiceFeedback: serializeChoiceFeedback(out.updated.multipleChoiceFeedback),
    reviewedAt: out.updated.reviewedAt?.toISOString() ?? null,
    reward: out.reward
  })
})

export default router
