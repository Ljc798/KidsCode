import { Router } from "express"
import { prisma } from "@kidscode/database"
import { applyPetMeatReward, buildPetProfile, shanghaiDateKey } from "../lib/studentHelper"
import { getTokenFromRequest as getStudentToken, verifyStudentToken } from "../lib/studentToken"
import { getTokenFromRequest as getAdminToken, verifyAdminToken } from "../lib/adminToken"

const router = Router()

const asString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

function resolveViewer(req: any) {
  const adminToken = getAdminToken(req)
  const admin = adminToken ? verifyAdminToken(adminToken) : null
  if (admin) return { role: "ADMIN" as const, adminUserId: admin.userId }

  const studentToken = getStudentToken(req)
  const student = studentToken ? verifyStudentToken(studentToken) : null
  if (student) return { role: "STUDENT" as const, studentId: student.studentId }

  return null
}

async function awardQuickPoints(studentId: string, requested: number) {
  const todayKey = shanghaiDateKey()
  const cap = 1000

  return prisma.$transaction(async tx => {
    const current: any = await tx.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        pointsBalance: true,
        xp: true,
        petXp: true,
        petMeat: true,
        petMood: true,
        petEnergy: true,
        dailyPointsDate: true,
        dailyPointsEarned: true
      }
    })
    if (!current) return null

    const earnedToday = current.dailyPointsDate === todayKey ? current.dailyPointsEarned : 0
    const remaining = Math.max(0, cap - earnedToday)
    const added = Math.max(0, Math.min(Math.floor(requested), remaining))
    const nextEarned = earnedToday + added

    const updated: any = await tx.student.update({
      where: { id: studentId },
      data: {
        pointsBalance: current.pointsBalance + added,
        xp: current.xp + added,
        petXp: current.petXp + added,
        petMood: Math.min(100, current.petMood + Math.max(2, Math.floor(added / 5))),
        petEnergy: Math.min(100, current.petEnergy + Math.max(1, Math.floor(added / 10))),
        dailyPointsDate: todayKey,
        dailyPointsEarned: nextEarned
      },
      select: {
        id: true,
        nickname: true,
        className: true,
        pointsBalance: true,
        petName: true,
        petSpecies: true,
        petXp: true,
        petMeat: true,
        petMood: true,
        petEnergy: true
      }
    })

    await tx.studentActivity.create({
      data: {
        studentId,
        kind: "POINTS_AWARD",
        pointsRequested: requested,
        pointsAdded: added,
        ok: true,
        meta: { source: "pet_quick_reward" }
      }
    })

    return { added, updated }
  })
}

async function awardQuickMeat(studentId: string, requested: number) {
  return prisma.$transaction(async tx => {
    const current: any = await tx.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        petXp: true,
        petMeat: true,
        petMood: true,
        petEnergy: true
      }
    })
    if (!current) return null

    const added = Math.max(0, Math.floor(requested))
    const nextPet = applyPetMeatReward({
      petXp: current.petXp,
      petMeat: current.petMeat ?? 0,
      addedMeat: added
    })

    const updated: any = await tx.student.update({
      where: { id: studentId },
      data: {
        petXp: nextPet.petXp,
        petMeat: nextPet.petMeat,
        petMood: Math.min(100, current.petMood + Math.max(4, added * 3)),
        petEnergy: Math.min(100, current.petEnergy + Math.max(3, added * 2))
      },
      select: {
        id: true,
        nickname: true,
        className: true,
        pointsBalance: true,
        petName: true,
        petSpecies: true,
        petXp: true,
        petMeat: true,
        petMood: true,
        petEnergy: true
      }
    })

    await tx.studentActivity.create({
      data: {
        studentId,
        kind: "POINTS_AWARD",
        ok: true,
        meta: {
          source: "pet_meat_reward",
          meatAdded: added,
          levelsGained: nextPet.levelsGained
        }
      }
    })

    return { added, levelsGained: nextPet.levelsGained, updated }
  })
}

router.get("/", async (req: any, res) => {
  const viewer = resolveViewer(req)
  if (!viewer) return res.status(401).json({ error: "unauthorized" })

  const requestedClassName = asString(req.query?.className)

  const classes = await prisma.student.findMany({
    where: { className: { not: null } },
    distinct: ["className"],
    orderBy: { className: "asc" },
    select: { className: true }
  })

  const classList = classes
    .map(item => item.className)
    .filter((value): value is string => Boolean(value))

  let currentStudentId: string | null = null
  let activeClassName = requestedClassName

  if (viewer.role === "STUDENT") {
    currentStudentId = viewer.studentId
    const currentStudent = await prisma.student.findUnique({
      where: { id: viewer.studentId },
      select: { className: true }
    })
    if (!activeClassName) activeClassName = currentStudent?.className ?? ""
  } else if (!activeClassName) {
    activeClassName = classList[0] ?? ""
  }

  if (!activeClassName) {
    return res.json({
      viewerRole: viewer.role,
      className: "",
      currentStudentId,
      classes: classList,
      items: []
    })
  }

  const students: any[] = await prisma.student.findMany({
    where: { className: activeClassName },
    orderBy: [{ petXp: "desc" }, { nickname: "asc" }],
    select: {
      id: true,
      nickname: true,
      className: true,
      petName: true,
      petSpecies: true,
      petXp: true,
      petMeat: true,
      petMood: true,
      petEnergy: true,
      pointsBalance: true
    }
  })

  res.json({
    viewerRole: viewer.role,
    className: activeClassName,
    currentStudentId,
    classes: classList,
    items: students.map(student => ({
      id: student.id,
      nickname: student.nickname,
      className: student.className,
      pointsBalance: student.pointsBalance,
      pet: buildPetProfile({
        petName: student.petName,
        petSpecies: student.petSpecies,
        petXp: student.petXp,
        petMeat: student.petMeat ?? 0,
        petMood: student.petMood,
        petEnergy: student.petEnergy
      })
    }))
  })
})

router.post("/rewards", async (req: any, res) => {
  const viewer = resolveViewer(req)
  if (!viewer || viewer.role !== "ADMIN") {
    return res.status(401).json({ error: "unauthorized" })
  }

  const studentId = asString(req.body?.studentId)
  const rewardType = asString(req.body?.rewardType || "POINTS")
  const amountRaw = req.body?.amount
  const amount =
    typeof amountRaw === "number"
      ? amountRaw
      : typeof amountRaw === "string" && amountRaw.trim() !== ""
        ? Number(amountRaw)
        : NaN

  if (!studentId) return res.status(400).json({ error: "studentId is required" })
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({ error: "amount must be a positive integer" })
  }

  const rewarded =
    rewardType === "MEAT"
      ? await awardQuickMeat(studentId, amount)
      : await awardQuickPoints(studentId, amount)
  if (!rewarded) return res.status(404).json({ error: "student not found" })

  res.json({
    ok: true,
    rewardType,
    added: rewarded.added,
    levelsGained: "levelsGained" in rewarded ? rewarded.levelsGained : 0,
    student: {
      id: rewarded.updated.id,
      nickname: rewarded.updated.nickname,
      className: rewarded.updated.className,
      pointsBalance: rewarded.updated.pointsBalance,
      pet: buildPetProfile({
        petName: rewarded.updated.petName,
        petSpecies: rewarded.updated.petSpecies,
        petXp: rewarded.updated.petXp,
        petMeat: rewarded.updated.petMeat ?? 0,
        petMood: rewarded.updated.petMood,
        petEnergy: rewarded.updated.petEnergy
      })
    }
  })
})

export default router
