import { Router } from "express"
import { prisma } from "@kidscode/database"
import { requireAdmin } from "../middleware/requireAdmin"

const router = Router()

type ChoiceOption = {
  id: string
  text: string
}

type MultipleChoiceQuestion = {
  id: string
  prompt: string
  options: ChoiceOption[]
  correctOptionId: string
}

type CodingTask = {
  id: string
  title: string
  description: string
  inputDescription: string
  outputDescription: string
  sampleInput1: string
  sampleOutput1: string
  sampleInput2: string
  sampleOutput2: string
  placeholder?: string | null
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

const asBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
}

function isChoiceOption(value: unknown): value is ChoiceOption {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>
  return typeof item.id === "string" && typeof item.text === "string"
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
    typeof item.inputDescription === "string" &&
    typeof item.outputDescription === "string" &&
    typeof item.sampleInput1 === "string" &&
    typeof item.sampleOutput1 === "string" &&
    typeof item.sampleInput2 === "string" &&
    typeof item.sampleOutput2 === "string" &&
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
    if (question.options.some(option => !option.id.trim() || !option.text.trim())) {
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
  }

  return value
}

router.use(requireAdmin)

router.get("/", async (_req, res) => {
  const banks = await prisma.exerciseBank.findMany({
    orderBy: [{ level: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      imageUrl: true,
      level: true,
      isPublished: true,
      updatedAt: true,
      multipleChoice: true,
      codingTasks: true,
      codingTitle: true,
      codingPrompt: true,
      codingPlaceholder: true,
      _count: { select: { submissions: true } }
    }
  })

  res.json(
    banks.map(bank => {
      const multipleChoice = parseMultipleChoice(bank.multipleChoice) ?? []
      const codingTasks =
        parseCodingTasks(bank.codingTasks, {
          codingTitle: bank.codingTitle,
          codingPrompt: bank.codingPrompt,
          codingPlaceholder: bank.codingPlaceholder
        }) ?? []

      return {
        id: bank.id,
        slug: bank.slug,
        title: bank.title,
        summary: bank.summary,
        imageUrl: bank.imageUrl,
        level: bank.level,
        isPublished: bank.isPublished,
        updatedAt: bank.updatedAt.toISOString(),
        multipleChoiceCount: multipleChoice.length,
        codingTaskCount: codingTasks.length,
        submissionsCount: bank._count.submissions
      }
    })
  )
})

router.get("/:id", async (req, res) => {
  const id = asString(req.params.id)
  if (!id) return res.status(400).json({ error: "invalid id" })

  const bank = await prisma.exerciseBank.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      imageUrl: true,
      level: true,
      isPublished: true,
      multipleChoice: true,
      codingTasks: true,
      codingTitle: true,
      codingPrompt: true,
      codingPlaceholder: true,
      createdAt: true,
      updatedAt: true
    }
  })

  if (!bank) return res.status(404).json({ error: "not found" })

  const codingTasks = parseCodingTasks(bank.codingTasks, {
    codingTitle: bank.codingTitle,
    codingPrompt: bank.codingPrompt,
    codingPlaceholder: bank.codingPlaceholder
  })
  const multipleChoice = parseMultipleChoice(bank.multipleChoice)
  if (!codingTasks || !multipleChoice) {
    return res.status(500).json({ error: "exercise data is invalid" })
  }

  res.json({
    id: bank.id,
    slug: bank.slug,
    title: bank.title,
    summary: bank.summary,
    imageUrl: bank.imageUrl,
    level: bank.level,
    isPublished: bank.isPublished,
    multipleChoice,
    codingTasks,
    createdAt: bank.createdAt.toISOString(),
    updatedAt: bank.updatedAt.toISOString()
  })
})

router.post("/", async (req, res) => {
  const title = asString(req.body?.title)
  const summary = asString(req.body?.summary)
  const imageUrl = asString(req.body?.imageUrl)
  const level = asInt(req.body?.level)
  const multipleChoice = parseMultipleChoice(req.body?.multipleChoice)
  const codingTasks = parseCodingTasks(req.body?.codingTasks)
  const providedSlug = asString(req.body?.slug)
  const slug = slugify(providedSlug || title)
  const isPublished = asBoolean(req.body?.isPublished, true)

  if (!title) return res.status(400).json({ error: "title is required" })
  if (!slug) return res.status(400).json({ error: "slug is required" })
  if (!Number.isInteger(level) || level < 1 || level > 18) {
    return res.status(400).json({ error: "level must be between 1 and 18" })
  }
  if (!multipleChoice) {
    return res.status(400).json({ error: "multipleChoice is invalid" })
  }
  if (!codingTasks) {
    return res.status(400).json({ error: "codingTasks is invalid" })
  }
  if (multipleChoice.length + codingTasks.length === 0) {
    return res.status(400).json({ error: "add at least one question or coding task" })
  }

  try {
    const firstTask = codingTasks[0] ?? null
    const bank = await prisma.exerciseBank.create({
      data: {
        slug,
        title,
        summary: summary || null,
        imageUrl: imageUrl || null,
        level,
        multipleChoice,
        codingTasks,
        codingTitle: firstTask?.title ?? "",
        codingPrompt: firstTask?.description ?? "",
        codingPlaceholder: firstTask?.placeholder ?? null,
        isPublished
      }
    })

    res.json({
      ...bank,
      createdAt: bank.createdAt.toISOString(),
      updatedAt: bank.updatedAt.toISOString()
    })
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "slug already exists" })
    }
    throw error
  }
})

router.patch("/:id", async (req, res) => {
  const id = asString(req.params.id)
  if (!id) return res.status(400).json({ error: "invalid id" })

  const data: Record<string, unknown> = {}
  if (req.body?.title !== undefined) {
    const title = asString(req.body.title)
    if (!title) return res.status(400).json({ error: "title cannot be empty" })
    data.title = title
  }
  if (req.body?.slug !== undefined) {
    const slug = slugify(asString(req.body.slug))
    if (!slug) return res.status(400).json({ error: "slug cannot be empty" })
    data.slug = slug
  }
  if (req.body?.summary !== undefined) {
    data.summary = asString(req.body.summary) || null
  }
  if (req.body?.imageUrl !== undefined) {
    data.imageUrl = asString(req.body.imageUrl) || null
  }
  if (req.body?.level !== undefined) {
    const level = asInt(req.body.level)
    if (!Number.isInteger(level) || level < 1 || level > 18) {
      return res.status(400).json({ error: "level must be between 1 and 18" })
    }
    data.level = level
  }
  if (req.body?.multipleChoice !== undefined) {
    const multipleChoice = parseMultipleChoice(req.body.multipleChoice)
    if (!multipleChoice) {
      return res.status(400).json({ error: "multipleChoice is invalid" })
    }
    data.multipleChoice = multipleChoice
  }
  if (req.body?.codingTasks !== undefined) {
    const codingTasks = parseCodingTasks(req.body.codingTasks)
    if (!codingTasks) {
      return res.status(400).json({ error: "codingTasks is invalid" })
    }
    data.codingTasks = codingTasks
    data.codingTitle = codingTasks[0]?.title ?? ""
    data.codingPrompt = codingTasks[0]?.description ?? ""
    data.codingPlaceholder = codingTasks[0]?.placeholder ?? null
  }
  if (req.body?.isPublished !== undefined) {
    data.isPublished = asBoolean(req.body.isPublished, true)
  }

  if (data.multipleChoice !== undefined || data.codingTasks !== undefined) {
    const existing = await prisma.exerciseBank.findUnique({
      where: { id },
      select: {
        multipleChoice: true,
        codingTasks: true,
        codingTitle: true,
        codingPrompt: true,
        codingPlaceholder: true
      }
    })
    if (!existing) return res.status(404).json({ error: "not found" })

    const multipleChoice =
      data.multipleChoice === undefined
        ? parseMultipleChoice(existing.multipleChoice) ?? []
        : (data.multipleChoice as MultipleChoiceQuestion[])
    const codingTasks =
      data.codingTasks === undefined
        ? parseCodingTasks(existing.codingTasks, {
            codingTitle: existing.codingTitle,
            codingPrompt: existing.codingPrompt,
            codingPlaceholder: existing.codingPlaceholder
          }) ?? []
        : (data.codingTasks as CodingTask[])

    if (multipleChoice.length + codingTasks.length === 0) {
      return res.status(400).json({ error: "add at least one question or coding task" })
    }
  }

  try {
    const bank = await prisma.exerciseBank.update({
      where: { id },
      data
    })

    res.json({
      ...bank,
      createdAt: bank.createdAt.toISOString(),
      updatedAt: bank.updatedAt.toISOString()
    })
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(404).json({ error: "not found" })
    }
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "slug already exists" })
    }
    throw error
  }
})

router.delete("/:id", async (req, res) => {
  const id = asString(req.params.id)
  if (!id) return res.status(400).json({ error: "invalid id" })

  try {
    await prisma.exerciseBank.delete({ where: { id } })
    res.json({ ok: true })
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(404).json({ error: "not found" })
    }
    throw error
  }
})

export default router
