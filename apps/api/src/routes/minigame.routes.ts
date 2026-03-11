import { Router } from "express"
import { prisma } from "@kidscode/database"

const router = Router()

type Concept = "BRANCH" | "LOOP"

const asString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

const isConcept = (value: unknown): value is Concept =>
  value === "BRANCH" || value === "LOOP"

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
router.post("/:slug/validate", async (req, res) => {
  const slug = asString(req.params.slug)
  const concept = req.body?.concept
  const code = asString(req.body?.code)

  if (!slug) return res.status(400).json({ ok: false, message: "invalid slug" })
  if (!isConcept(concept))
    return res.status(400).json({ ok: false, message: "invalid concept" })
  if (!code) return res.status(400).json({ ok: false, message: "code is required" })

  const normalized = code.toLowerCase()
  if (concept === "BRANCH") {
    if (!normalized.includes("if")) {
      return res.json({ ok: false, message: "需要包含 if 来完成分支判断。" })
    }
    return res.json({ ok: true, message: "分支用得很好，继续游戏！" })
  }

  if (!normalized.includes("for") && !normalized.includes("while")) {
    return res.json({ ok: false, message: "需要包含 for 或 while 来完成循环。" })
  }
  return res.json({ ok: true, message: "循环写得不错，继续游戏！" })
})

export default router

