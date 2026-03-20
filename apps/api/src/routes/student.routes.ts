import { Router } from "express"
import { prisma } from "@kidscode/database"
import { requireAdmin } from "../middleware/requireAdmin"

const router = Router()

// Admin-only: student account management
router.use(requireAdmin)

type StudentDTO = {
  id: string
  account: string
  nickname: string
  age: number
  className: string | null
  concept: "BRANCH" | "LOOP"
  petName: string
  petSpecies: string
  createdAt: string
}

const asString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

function normalizeAccount(input: string) {
  return input.trim().toLowerCase()
}

function isValidAccount(value: string) {
  // Letters/numbers + _ and -, stored in lowercase by normalizeAccount().
  return /^[a-z0-9_-]{1,32}$/.test(value)
}

function isConcept(value: unknown): value is "BRANCH" | "LOOP" {
  return value === "BRANCH" || value === "LOOP"
}

const asNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return NaN
}

const serializeStudent = (student: {
  id: string
  age: number
  nickname: string
  className: string | null
  concept: "BRANCH" | "LOOP"
  petName: string
  petSpecies: string
  createdAt: Date
  user: { account: string | null; phone: string | null }
}): StudentDTO => ({
  id: student.id,
  account: student.user.account ?? student.user.phone ?? "",
  nickname: student.nickname,
  age: student.age,
  className: student.className,
  concept: student.concept,
  petName: student.petName,
  petSpecies: student.petSpecies,
  createdAt: student.createdAt.toISOString()
})

const asyncHandler =
  (fn: (req: any, res: any) => Promise<void>) => (req: any, res: any) =>
    fn(req, res).catch((err: any) => {
      console.error(err)
      res.status(500).json({ error: "Internal Server Error" })
    })

// CREATE (creates User + Student in a transaction)
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const account = normalizeAccount(asString(req.body?.account ?? req.body?.phone))
    const password =
      req.body?.password === undefined ? "123456" : asString(req.body?.password)
    const nickname = asString(req.body?.nickname)
    const age = asNumber(req.body?.age)
    const className =
      req.body?.className === undefined ? null : asString(req.body?.className)
    const conceptRaw = req.body?.concept
    const concept = conceptRaw === undefined ? "BRANCH" : conceptRaw
    const petName =
      req.body?.petName === undefined ? "小码兽" : asString(req.body?.petName)
    const petSpecies =
      req.body?.petSpecies === undefined ? "云朵龙" : asString(req.body?.petSpecies)

    if (!account) return res.status(400).json({ error: "account is required" })
    if (!isValidAccount(account)) {
      return res.status(400).json({
        error: "account must be 1-32 chars of letters/numbers/_/-"
      })
    }
    if (!password) return res.status(400).json({ error: "password cannot be empty" })
    if (!nickname) return res.status(400).json({ error: "nickname is required" })
    if (!Number.isInteger(age) || age <= 0)
      return res.status(400).json({ error: "age must be a positive integer" })
    if (className !== null && !className)
      return res.status(400).json({ error: "className cannot be empty" })
    if (!isConcept(concept))
      return res.status(400).json({ error: "concept must be BRANCH or LOOP" })
    if (!petName) return res.status(400).json({ error: "petName is required" })
    if (!petSpecies) return res.status(400).json({ error: "petSpecies is required" })

    try {
      const student = await prisma.student.create({
        data: {
          age,
          nickname,
          className,
          concept,
          petName,
          petSpecies,
          user: {
            create: {
              account,
              password,
              role: "STUDENT"
            }
          }
        },
        include: { user: { select: { phone: true, account: true } } }
      })

      res.json(serializeStudent(student))
    } catch (e: any) {
      // Prisma unique constraint violation
      if (e?.code === "P2002") {
        return res.status(409).json({ error: "account already exists" })
      }
      throw e
    }
  })
)

// LIST
router.get(
  "/",
  asyncHandler(async (_, res) => {
    const students = await prisma.student.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { phone: true, account: true } } }
    })
    res.json(students.map(serializeStudent))
  })
)

// GET ONE
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = asString(req.params.id)
    if (!id) return res.status(400).json({ error: "invalid id" })

    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: { select: { phone: true, account: true } } }
    })

    if (!student) return res.status(404).json({ error: "not found" })
    res.json(serializeStudent(student))
  })
)

// UPDATE (Student + optional User fields)
router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = asString(req.params.id)
    if (!id) return res.status(400).json({ error: "invalid id" })

    const accountRaw =
      req.body?.account === undefined
        ? req.body?.phone === undefined
          ? undefined
          : asString(req.body.phone)
        : asString(req.body.account)
    const password =
      req.body?.password === undefined ? undefined : asString(req.body.password)
    const nickname = req.body?.nickname === undefined ? undefined : asString(req.body.nickname)
    const age = req.body?.age === undefined ? undefined : asNumber(req.body.age)
    const classNameRaw =
      req.body?.className === undefined ? undefined : asString(req.body.className)
    const conceptRaw = req.body?.concept === undefined ? undefined : req.body.concept
    const petNameRaw = req.body?.petName === undefined ? undefined : asString(req.body.petName)
    const petSpeciesRaw =
      req.body?.petSpecies === undefined ? undefined : asString(req.body.petSpecies)

    const account =
      accountRaw === undefined ? undefined : normalizeAccount(accountRaw)
    if (account !== undefined) {
      if (!account) return res.status(400).json({ error: "account cannot be empty" })
      if (!isValidAccount(account)) {
        return res.status(400).json({
          error: "account must be 1-32 chars of letters/numbers/_/-"
        })
      }
    }
    if (password !== undefined && !password)
      return res.status(400).json({ error: "password cannot be empty" })
    if (nickname !== undefined && !nickname)
      return res.status(400).json({ error: "nickname cannot be empty" })
    if (age !== undefined && (!Number.isInteger(age) || age <= 0))
      return res.status(400).json({ error: "age must be a positive integer" })
    const className = classNameRaw === undefined ? undefined : classNameRaw
    if (className !== undefined && !className)
      return res.status(400).json({ error: "className cannot be empty" })
    const concept = conceptRaw === undefined ? undefined : conceptRaw
    if (concept !== undefined && !isConcept(concept)) {
      return res.status(400).json({ error: "concept must be BRANCH or LOOP" })
    }
    if (petNameRaw !== undefined && !petNameRaw) {
      return res.status(400).json({ error: "petName cannot be empty" })
    }
    if (petSpeciesRaw !== undefined && !petSpeciesRaw) {
      return res.status(400).json({ error: "petSpecies cannot be empty" })
    }

    // Ensure exists and get userId for update/delete safety
    const existing = await prisma.student.findUnique({
      where: { id },
      select: { id: true, userId: true }
    })
    if (!existing) return res.status(404).json({ error: "not found" })

    try {
      const updated = await prisma.student.update({
        where: { id },
        data: {
          ...(age === undefined ? {} : { age }),
          ...(nickname === undefined ? {} : { nickname }),
          ...(className === undefined ? {} : { className }),
          ...(concept === undefined ? {} : { concept }),
          ...(petNameRaw === undefined ? {} : { petName: petNameRaw }),
          ...(petSpeciesRaw === undefined ? {} : { petSpecies: petSpeciesRaw }),
          user: {
            update: {
              ...(account === undefined ? {} : { account }),
              ...(password === undefined ? {} : { password })
            }
          }
        },
        include: { user: { select: { phone: true, account: true } } }
      })

      res.json(serializeStudent(updated))
    } catch (e: any) {
      if (e?.code === "P2002") {
        return res.status(409).json({ error: "account already exists" })
      }
      throw e
    }
  })
)

// DELETE
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = asString(req.params.id)
    if (!id) return res.status(400).json({ error: "invalid id" })

    const existing = await prisma.student.findUnique({
      where: { id },
      select: { id: true, userId: true }
    })
    if (!existing) return res.status(404).json({ error: "not found" })

    await prisma.$transaction([
      prisma.student.delete({ where: { id } }),
      prisma.user.delete({ where: { id: existing.userId } })
    ])

    res.json({ success: true })
  })
)

export default router
