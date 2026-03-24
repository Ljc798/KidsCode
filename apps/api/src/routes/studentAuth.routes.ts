import { Router } from "express"
import { prisma } from "@kidscode/database"
import {
  signStudentToken,
  verifyStudentToken,
  getTokenFromRequest
} from "../lib/studentToken"
import { signAdminToken } from "../lib/adminToken"
import { requireStudent } from "../middleware/requireStudent"
import { shanghaiDateKey, buildPetProfile, recoverPetEnergy } from "../lib/studentHelper"

const router = Router()

const asString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

function normalizeAccount(input: string) {
  return input.trim().toLowerCase()
}

function serializeCookie(name: string, token: string) {
  const maxAge = 60 * 60 * 24 * 7
  const secure = process.env.NODE_ENV === "production"
  return [
    `${name}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    secure ? "Secure" : ""
  ]
    .filter(Boolean)
    .join("; ")
}

function setCookies(res: any, cookies: string[]) {
  res.setHeader("Set-Cookie", cookies)
}

function clearCookie(name: string) {
  const secure = process.env.NODE_ENV === "production"
  return [
    `${name}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    secure ? "Secure" : ""
  ]
    .filter(Boolean)
    .join("; ")
}

const PET_SPECIES = ["云朵龙", "奶油猫", "闪电狗", "月光兔", "极光鸟"] as const

function canUseAdmin(user: { role: "STUDENT" | "PARENT" | "ADMIN"; isAdmin: boolean }) {
  return user.role === "ADMIN" || user.isAdmin
}

async function ensureStudentProfile(user: {
  id: string
  account: string | null
  phone: string | null
  student: { id: string; nickname: string } | null
}) {
  if (user.student) return user.student

  const nickname = user.account ?? user.phone ?? "管理员"
  return prisma.student.create({
    data: {
      userId: user.id,
      nickname,
      age: 18
    },
    select: { id: true, nickname: true }
  })
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
        isAdmin: true,
        account: true,
        phone: true,
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
        isAdmin: true,
        account: true,
        phone: true,
        password: true,
        student: { select: { id: true, nickname: true } }
      }
    }))

  if (!user || (!user.student && !canUseAdmin(user))) {
    return res.status(401).json({ error: "账号或密码错误" })
  }

  // Back-compat: passwords are currently stored as plaintext in this repo.
  if (user.password !== password) {
    return res.status(401).json({ error: "账号或密码错误" })
  }

  const student = await ensureStudentProfile(user)
  const cookies = [serializeCookie("kidscode_student", signStudentToken(student.id, 60 * 60 * 24 * 7))]

  if (canUseAdmin(user)) {
    cookies.push(serializeCookie("kidscode_admin", signAdminToken(user.id, 60 * 60 * 24 * 7)))
  }

  setCookies(res, cookies)
  return res.json({
    ok: true,
    student: { id: student.id, nickname: student.nickname },
    isAdmin: canUseAdmin(user)
  })
})

// POST /auth/student/logout
router.post("/logout", async (_req, res) => {
  setCookies(res, [clearCookie("kidscode_student"), clearCookie("kidscode_admin")])
  return res.json({ ok: true })
})

// GET /auth/student/me
router.get("/me", async (req, res) => {
  const token = getTokenFromRequest(req as any)
  const ok = token ? verifyStudentToken(token) : null
  if (!ok) return res.status(401).json({ ok: false })

  const student: any = await prisma.student.findUnique({
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
      exercisePointsDate: true,
      exercisePointsEarned: true,
      petName: true,
      petSpecies: true,
      petXp: true,
      petMeat: true,
      petMood: true,
      petEnergy: true,
      petEnergyRefreshedAt: true,
      user: { select: { phone: true, account: true } }
    }
  })
  if (!student) return res.status(401).json({ ok: false })

  const recovered = recoverPetEnergy({
    petEnergy: student.petEnergy,
    petEnergyRefreshedAt: student.petEnergyRefreshedAt
  })
  if (recovered.shouldPersist) {
    await prisma.student.update({
      where: { id: student.id },
      data: {
        petEnergy: recovered.energy,
        petEnergyRefreshedAt: recovered.refreshedAt
      }
    })
  }

  const todayKey = shanghaiDateKey()
  const earnedToday = student.dailyPointsDate === todayKey ? student.dailyPointsEarned : 0
  const exerciseEarnedToday =
    student.exercisePointsDate === todayKey ? student.exercisePointsEarned : 0
  const pet = buildPetProfile({
    petName: student.petName,
    petSpecies: student.petSpecies,
    petXp: student.petXp,
    petMeat: student.petMeat ?? 0,
    petMood: student.petMood,
    petEnergy: recovered.energy
  })

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
      exerciseEarnedToday,
      exerciseDailyCap: 200,
      pet
    }
  })
})

router.patch("/me", requireStudent, async (req: any, res) => {
  const studentId = req.studentId as string
  const nickname = req.body?.nickname === undefined ? undefined : asString(req.body.nickname)
  const petName = req.body?.petName === undefined ? undefined : asString(req.body.petName)
  const petSpecies =
    req.body?.petSpecies === undefined ? undefined : asString(req.body.petSpecies)

  if (nickname !== undefined && !nickname) {
    return res.status(400).json({ error: "nickname cannot be empty" })
  }
  if (petName !== undefined && !petName) {
    return res.status(400).json({ error: "petName cannot be empty" })
  }
  if (petSpecies !== undefined && !PET_SPECIES.includes(petSpecies as (typeof PET_SPECIES)[number])) {
    return res.status(400).json({ error: "petSpecies is invalid" })
  }

  const updated: any = await prisma.student.update({
    where: { id: studentId },
    data: {
      ...(nickname === undefined ? {} : { nickname }),
      ...(petName === undefined ? {} : { petName }),
      ...(petSpecies === undefined ? {} : { petSpecies })
    },
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
      exercisePointsDate: true,
      exercisePointsEarned: true,
      petName: true,
      petSpecies: true,
      petXp: true,
      petMeat: true,
      petMood: true,
      petEnergy: true,
      user: { select: { phone: true, account: true } }
    }
  })

  const todayKey = shanghaiDateKey()
  const earnedToday = updated.dailyPointsDate === todayKey ? updated.dailyPointsEarned : 0
  const exerciseEarnedToday =
    updated.exercisePointsDate === todayKey ? updated.exercisePointsEarned : 0
  const pet = buildPetProfile({
    petName: updated.petName,
    petSpecies: updated.petSpecies,
    petXp: updated.petXp,
    petMeat: updated.petMeat ?? 0,
    petMood: updated.petMood,
    petEnergy: updated.petEnergy
  })

  res.json({
    ok: true,
    student: {
      id: updated.id,
      nickname: updated.nickname,
      age: updated.age,
      className: updated.className,
      concept: updated.concept,
      account: updated.user.account ?? updated.user.phone,
      pointsBalance: updated.pointsBalance,
      starCoinsBalance: updated.starCoinsBalance,
      earnedToday,
      dailyCap: 1000,
      exerciseEarnedToday,
      exerciseDailyCap: 200,
      pet
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
      const s: any = await tx.student.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          pointsBalance: true,
          petName: true,
          petSpecies: true,
          petXp: true,
          petMeat: true,
          petMood: true,
          petEnergy: true,
          petEnergyRefreshedAt: true,
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
      const recovered = recoverPetEnergy({
        petEnergy: s.petEnergy,
        petEnergyRefreshedAt: s.petEnergyRefreshedAt
      })

      const updated: any = await tx.student.update({
        where: { id: studentId },
        data: {
          pointsBalance: s.pointsBalance + added,
          xp: { increment: added },
          petXp: s.petXp + added,
          petMood: Math.min(100, s.petMood + Math.max(1, Math.floor(added / 20))),
          petEnergy: Math.max(0, recovered.energy - 1),
          petEnergyRefreshedAt: new Date(),
          dailyPointsDate: todayKey,
          dailyPointsEarned: nextEarned
        },
        select: {
          pointsBalance: true,
          petName: true,
          petSpecies: true,
          petXp: true,
          petMeat: true,
          petMood: true,
          petEnergy: true,
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

    const pet = buildPetProfile({
      petName: out.updated.petName,
      petSpecies: out.updated.petSpecies,
      petXp: out.updated.petXp,
      petMeat: out.updated.petMeat ?? 0,
      petMood: out.updated.petMood,
      petEnergy: out.updated.petEnergy
    })
    const todayEarned =
      out.updated.dailyPointsDate === todayKey ? out.updated.dailyPointsEarned : 0

    return res.json({
      ok: true,
      added: out.added,
      pointsBalance: out.updated.pointsBalance,
      earnedToday: todayEarned,
      dailyCap: 1000,
      pet
    })
  }
)

export default router
