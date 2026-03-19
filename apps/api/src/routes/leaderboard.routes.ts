
import { Router } from "express"
import { prisma } from "@kidscode/database"
import { shanghaiDateKey, computeLevelFromXp } from "../lib/studentHelper"

const router = Router()

// GET /leaderboard/:category?className=M1
// category: daily, xp, games
router.get("/:category", async (req, res) => {
  const { category } = req.params
  const className = req.query.className as string | undefined

  if (!className) {
    return res.status(400).json({ ok: false, error: "className is required" })
  }

  const todayKey = shanghaiDateKey()

  let students: any[] = []

  if (category === "daily") {
    students = await prisma.student.findMany({
      where: {
        className,
        dailyPointsDate: todayKey
      },
      orderBy: {
        dailyPointsEarned: "desc"
      },
      take: 20,
      select: {
        id: true,
        nickname: true,
        dailyPointsEarned: true,
        xp: true
      }
    })
  } else if (category === "xp") {
    students = await prisma.student.findMany({
      where: {
        className
      },
      orderBy: {
        xp: "desc"
      },
      take: 20,
      select: {
        id: true,
        nickname: true,
        xp: true
      }
    })
  } else if (category === "games") {
    students = await prisma.student.findMany({
      where: {
        className
      },
      orderBy: {
        gamesCompleted: "desc"
      },
      take: 20,
      select: {
        id: true,
        nickname: true,
        gamesCompleted: true,
        xp: true
      }
    })
  } else {
    return res.status(400).json({ ok: false, error: "invalid category" })
  }

  const result = students.map((s, index) => {
    const levelInfo = computeLevelFromXp(s.xp)
    return {
      rank: index + 1,
      id: s.id,
      nickname: s.nickname,
      value: category === "daily" ? s.dailyPointsEarned : (category === "xp" ? levelInfo.level : s.gamesCompleted),
      xp: s.xp,
      level: levelInfo.level
    }
  })

  return res.json({
    ok: true,
    category,
    className,
    date: todayKey,
    leaderboard: result
  })
})

export default router
