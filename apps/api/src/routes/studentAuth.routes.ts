import { Router } from "express"
import { prisma } from "@kidscode/database"
import {
  signStudentToken,
  verifyStudentToken,
  getTokenFromRequest
} from "../lib/studentToken"
import { requireStudent } from "../middleware/requireStudent"
import { shanghaiDateKey, computeLevelFromXp } from "../lib/studentHelper"

const router = Router()

const asString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

function normalizeAccount(input: string) {
  return input.trim().toLowerCase()
}

function setCookie(res: any, token: string) {
  const maxAge = 60 * 60 * 24 * 7
  const secure = process.env.NODE_ENV === "production"
  const cookie = [
    `kidscode_student=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    secure ? "Secure" : ""
  ]
    .filter(Boolean)
    .join("; ")
  res.setHeader("Set-Cookie", cookie)
}

function clearCookie(res: any) {
  const secure = process.env.NODE_ENV === "production"
  const cookie = [
    "kidscode_student=",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    secure ? "Secure" : ""
  ]
    .filter(Boolean)
    .join("; ")
  res.setHeader("Set-Cookie", cookie)
}

// POST /auth/student/login
router.post("/login", async (req, res) => {
  const account = normalizeAccount(asString(req.body?.account ?? req.body?.phone))
  const password = asString(req.body?.password)

  if (!account) return res.status(400).json({ error: "account is required" })
  if (!password) return res.status(400).json({ error: "password is required" })

  const user =
    (await prisma.user.findUnique({
      where: { account },
      select: {
        id: true,
        role: true,
        password: true,
        student: { select: { id: true, nickname: true } }
      }
    })) ??
    (await prisma.user.findUnique({
      // Back-compat: older student accounts might still be stored in phone.
      where: { phone: account },
      select: {
        id: true,
        role: true,
        password: true,
        student: { select: { id: true, nickname: true } }
      }
    }))

  if (!user || user.role !== "STUDENT" || !user.student) {
    return res.status(401).json({ error: "invalid credentials" })
  }

  // Back-compat: passwords are currently stored as plaintext in this repo.
  if (user.password !== password) {
    return res.status(401).json({ error: "invalid credentials" })
  }

  const token = signStudentToken(user.student.id, 60 * 60 * 24 * 7)
  setCookie(res, token)
  return res.json({ ok: true, student: { id: user.student.id, nickname: user.student.nickname } })
})

// POST /auth/student/logout
router.post("/logout", async (_req, res) => {
  clearCookie(res)
  return res.json({ ok: true })
})

// GET /auth/student/me
router.get("/me", async (req, res) => {
  const token = getTokenFromRequest(req as any)
  const ok = token ? verifyStudentToken(token) : null
  if (!ok) return res.status(401).json({ ok: false })

  const student = await prisma.student.findUnique({
    where: { id: ok.studentId },
    select: {
      id: true,
      nickname: true,
      age: true,
      className: true,
      concept: true,
      pointsBalance: true,
      starCoinsBalance: true,
      dailyPointsDate: true,
      dailyPointsEarned: true,
      xp: true,
      user: { select: { phone: true, account: true } }
    }
  })
  if (!student) return res.status(401).json({ ok: false })

  const todayKey = shanghaiDateKey()
  const earnedToday = student.dailyPointsDate === todayKey ? student.dailyPointsEarned : 0
  const level = computeLevelFromXp(student.xp)

  return res.json({
    ok: true,
    student: {
      id: student.id,
      nickname: student.nickname,
      age: student.age,
      className: student.className,
      concept: student.concept,
      account: student.user.account ?? student.user.phone,
      pointsBalance: student.pointsBalance,
      starCoinsBalance: student.starCoinsBalance,
      earnedToday,
      dailyCap: 1000,
      level
    }
  })
})

// POST /auth/student/earn
// Body: { points: number }
router.post(
  "/earn",
  requireStudent,
  async (req: any, res) => {
    const raw = req.body?.points
    const requested = typeof raw === "number" ? raw : Number(raw)
    if (!Number.isFinite(requested) || requested <= 0) {
      return res.status(400).json({ ok: false, error: "points must be a positive number" })
    }

    const points = Math.floor(requested)
    const studentId = req.studentId as string
    const todayKey = shanghaiDateKey()

    // Use a transaction to avoid race conditions.
    const out = await prisma.$transaction(async tx => {
      const s = await tx.student.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          pointsBalance: true,
          xp: true,
          dailyPointsDate: true,
          dailyPointsEarned: true
        }
      })
      if (!s) return null

      const earnedToday = s.dailyPointsDate === todayKey ? s.dailyPointsEarned : 0
      const cap = 1000
      const remaining = Math.max(0, cap - earnedToday)
      const added = Math.max(0, Math.min(points, remaining))
      const nextEarned = earnedToday + added

      const updated = await tx.student.update({
        where: { id: studentId },
        data: {
          pointsBalance: s.pointsBalance + added,
          xp: s.xp + added,
          dailyPointsDate: todayKey,
          dailyPointsEarned: nextEarned
        },
        select: {
          pointsBalance: true,
          xp: true,
          dailyPointsDate: true,
          dailyPointsEarned: true
        }
      })

      // Record the activity
      await tx.studentActivity.create({
        data: {
          studentId,
          kind: "POINTS_AWARD",
          pointsRequested: points,
          pointsAdded: added,
          ok: true
        }
      })

      return { added, updated }
    })

    if (!out) return res.status(401).json({ ok: false })

    const level = computeLevelFromXp(out.updated.xp)
    const todayEarned =
      out.updated.dailyPointsDate === todayKey ? out.updated.dailyPointsEarned : 0

    return res.json({
      ok: true,
      added: out.added,
      pointsBalance: out.updated.pointsBalance,
      earnedToday: todayEarned,
      dailyCap: 1000,
      level
    })
  }
)

export default router
