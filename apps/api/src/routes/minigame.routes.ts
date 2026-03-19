import { Router } from "express"
import type { Request, Response, NextFunction } from "express"
import { prisma } from "@kidscode/database"
import { getTokenFromRequest, verifyStudentToken } from "../lib/studentToken"
import { shanghaiDateKey } from "../lib/studentHelper"

const router = Router()

type Concept = "BRANCH" | "LOOP"

const asString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

const isConcept = (value: unknown): value is Concept =>
  value === "BRANCH" || value === "LOOP"

function requireStudentForSubmit(
  req: Request & { studentId?: string },
  res: Response,
  next: NextFunction
) {
  const token = getTokenFromRequest(req as any)
  const ok = token ? verifyStudentToken(token) : null
  if (!ok) return res.status(401).json({ ok: false, message: "请先登录再提交。" })
  req.studentId = ok.studentId
  return next()
}

async function awardPointsOnce(
  studentId: string,
  requested: number,
  todayKey: string,
  miniGameSlug?: string
) {
  const cap = 1000
  const out = await prisma.$transaction(async tx => {
    const s = await tx.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        pointsBalance: true,
        xp: true,
        dailyPointsDate: true,
        dailyPointsEarned: true,
        gamesCompleted: true
      }
    })
    if (!s) return null

    const earnedToday = s.dailyPointsDate === todayKey ? s.dailyPointsEarned : 0
    const remaining = Math.max(0, cap - earnedToday)
    const added = Math.max(0, Math.min(Math.floor(requested), remaining))
    const nextEarned = earnedToday + added

    const updated = await tx.student.update({
      where: { id: studentId },
      data: {
        pointsBalance: s.pointsBalance + added,
        xp: s.xp + added,
        dailyPointsDate: todayKey,
        dailyPointsEarned: nextEarned,
        gamesCompleted: miniGameSlug ? s.gamesCompleted + 1 : s.gamesCompleted
      },
      select: { pointsBalance: true, dailyPointsDate: true, dailyPointsEarned: true }
    })

    // Record the activity
    await tx.studentActivity.create({
      data: {
        studentId,
        kind: "MINIGAME_PLAY",
        miniGameSlug,
        pointsRequested: requested,
        pointsAdded: added,
        ok: true
      }
    })

    return { added, updated, cap }
  })

  if (!out) return null
  const earnedToday = out.updated.dailyPointsDate === todayKey ? out.updated.dailyPointsEarned : 0
  return {
    added: out.added,
    pointsBalance: out.updated.pointsBalance,
    earnedToday,
    dailyCap: out.cap
  }
}

router.get("/", async (_req, res) => {
  const games = await prisma.miniGame.findMany({
    where: { isActive: true },
    orderBy: { slug: "asc" }
  })
  res.json(games)
})

router.get("/:slug", async (req, res) => {
  const slug = asString(req.params.slug)
  if (!slug) return res.status(400).json({ error: "invalid slug" })

  const game = await prisma.miniGame.findUnique({ where: { slug } })
  if (!game) return res.status(404).json({ error: "not found" })
  res.json(game)
})

// Placeholder validation:
// - BRANCH: must contain "if"
// - LOOP: must contain "for" or "while"
router.post("/:slug/validate", requireStudentForSubmit, async (req: any, res) => {
  const slug = asString(req.params.slug)
  const code = asString(req.body?.code)

  if (!slug) return res.status(400).json({ ok: false, message: "invalid slug" })
  if (!code) return res.status(400).json({ ok: false, message: "code is required" })
  if (code.length > 4000)
    return res.status(400).json({ ok: false, message: "code is too long" })

  const game = await prisma.miniGame.findUnique({
    where: { slug },
    select: { slug: true, requires: true }
  })
  if (!game) return res.status(404).json({ ok: false, message: "游戏不存在。" })
  const concept = game.requires
  if (!isConcept(concept))
    return res.status(500).json({ ok: false, message: "invalid concept" })

  const normalized = code.toLowerCase()
  const studentId = req.studentId as string
  const todayKey = shanghaiDateKey()
  const requested = 30

  // Record code submission
  await prisma.$transaction(async tx => {
    await tx.student.update({
      where: { id: studentId },
      data: { codeSubmissions: { increment: 1 } }
    })
    await tx.studentActivity.create({
      data: {
        studentId,
        kind: "CODE_SUBMIT",
        miniGameSlug: slug,
        code,
        ok: true
      }
    })
  })

  if (concept === "BRANCH") {
    if (!normalized.includes("if")) {
      return res.json({ ok: false, message: "需要包含 if 来完成分支判断。" })
    }

    const reward = await awardPointsOnce(studentId, requested, todayKey, slug)
    if (!reward) return res.status(401).json({ ok: false, message: "请先登录再提交。" })
    return res.json({
      ok: true,
      message: "分支用得很好，继续游戏！",
      reward: {
        requested,
        ...reward
      }
    })
  }

  if (!normalized.includes("for") && !normalized.includes("while")) {
    return res.json({ ok: false, message: "需要包含 for 或 while 来完成循环。" })
  }

  const reward = await awardPointsOnce(studentId, requested, todayKey, slug)
  if (!reward) return res.status(401).json({ ok: false, message: "请先登录再提交。" })
  return res.json({
    ok: true,
    message: "循环写得不错，继续游戏！",
    reward: {
      requested,
      ...reward
    }
  })
})

export default router
