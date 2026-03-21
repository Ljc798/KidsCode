import { Router } from "express"
import { prisma } from "@kidscode/database"
import { requireAdmin } from "../middleware/requireAdmin"

const router = Router()

router.use(requireAdmin)

const asString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

router.get("/", async (_req, res) => {
  const games = await prisma.miniGame.findMany({
    orderBy: { slug: "asc" },
    select: {
      slug: true,
      title: true,
      emoji: true,
      isActive: true,
      updatedAt: true
    }
  })

  res.json({
    games: games.map(game => ({
      ...game,
      updatedAt: game.updatedAt.toISOString()
    })),
    total: games.length,
    active: games.filter(game => game.isActive).length
  })
})

router.post("/enable-all", async (_req, res) => {
  const result = await prisma.miniGame.updateMany({
    where: { isActive: false },
    data: { isActive: true }
  })

  const active = await prisma.miniGame.count({ where: { isActive: true } })
  return res.json({
    ok: true,
    enabledCount: result.count,
    active
  })
})

router.post("/disable-all", async (_req, res) => {
  const result = await prisma.miniGame.updateMany({
    where: { isActive: true },
    data: { isActive: false }
  })

  const active = await prisma.miniGame.count({ where: { isActive: true } })
  return res.json({
    ok: true,
    disabledCount: result.count,
    active
  })
})

router.patch("/:slug/status", async (req, res) => {
  const slug = asString(req.params.slug)
  const isActive = req.body?.isActive

  if (!slug) return res.status(400).json({ error: "invalid slug" })
  if (typeof isActive !== "boolean") {
    return res.status(400).json({ error: "isActive must be boolean" })
  }

  const exists = await prisma.miniGame.findUnique({
    where: { slug },
    select: { slug: true }
  })
  if (!exists) return res.status(404).json({ error: "not found" })

  const game = await prisma.miniGame.update({
    where: { slug },
    data: { isActive },
    select: {
      slug: true,
      title: true,
      emoji: true,
      isActive: true,
      updatedAt: true
    }
  })

  return res.json({
    ok: true,
    game: {
      ...game,
      updatedAt: game.updatedAt.toISOString()
    }
  })
})

export default router
