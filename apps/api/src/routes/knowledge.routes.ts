import { Router } from "express"
import { prisma } from "@kidscode/database"

const router = Router()

const asString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

router.get("/cpp", async (_req, res) => {
  const items = await prisma.knowledgeArticle.findMany({
    where: { language: "CPP", isPublished: true },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    select: {
      slug: true,
      title: true,
      summary: true,
      order: true,
      updatedAt: true
    }
  })
  res.json(items)
})

router.get("/cpp/:slug", async (req, res) => {
  const slug = asString(req.params.slug)
  if (!slug) return res.status(400).json({ error: "invalid slug" })

  const item = await prisma.knowledgeArticle.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      summary: true,
      contentMd: true,
      order: true,
      updatedAt: true
    }
  })
  if (!item) return res.status(404).json({ error: "not found" })
  res.json(item)
})

export default router

