import { Router } from "express"
import { prisma } from "@kidscode/database"

const router = Router()

type StudentDTO = {
  id: string
  phone: string
  nickname: string
  age: number
  createdAt: string
}

const asString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

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
  createdAt: Date
  user: { phone: string }
}): StudentDTO => ({
  id: student.id,
  phone: student.user.phone,
  nickname: student.nickname,
  age: student.age,
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
    const phone = asString(req.body?.phone)
    const password = asString(req.body?.password)
    const nickname = asString(req.body?.nickname)
    const age = asNumber(req.body?.age)

    if (!phone) return res.status(400).json({ error: "phone is required" })
    if (!/^1\d{10}$/.test(phone))
      return res.status(400).json({ error: "phone must be a valid CN mobile number" })
    if (!password) return res.status(400).json({ error: "password is required" })
    if (!nickname) return res.status(400).json({ error: "nickname is required" })
    if (!Number.isInteger(age) || age <= 0)
      return res.status(400).json({ error: "age must be a positive integer" })

    try {
      const student = await prisma.student.create({
        data: {
          age,
          nickname,
          user: {
            create: {
              phone,
              password,
              role: "STUDENT"
            }
          }
        },
        include: { user: { select: { phone: true } } }
      })

      res.json(serializeStudent(student))
    } catch (e: any) {
      // Prisma unique constraint violation
      if (e?.code === "P2002") {
        return res.status(409).json({ error: "phone already exists" })
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
      include: { user: { select: { phone: true } } }
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
      include: { user: { select: { phone: true } } }
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

    const phone = req.body?.phone === undefined ? undefined : asString(req.body.phone)
    const password =
      req.body?.password === undefined ? undefined : asString(req.body.password)
    const nickname = req.body?.nickname === undefined ? undefined : asString(req.body.nickname)
    const age = req.body?.age === undefined ? undefined : asNumber(req.body.age)

    if (phone !== undefined) {
      if (!phone) return res.status(400).json({ error: "phone cannot be empty" })
      if (!/^1\d{10}$/.test(phone))
        return res.status(400).json({ error: "phone must be a valid CN mobile number" })
    }
    if (password !== undefined && !password)
      return res.status(400).json({ error: "password cannot be empty" })
    if (nickname !== undefined && !nickname)
      return res.status(400).json({ error: "nickname cannot be empty" })
    if (age !== undefined && (!Number.isInteger(age) || age <= 0))
      return res.status(400).json({ error: "age must be a positive integer" })

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
          user: {
            update: {
              ...(phone === undefined ? {} : { phone }),
              ...(password === undefined ? {} : { password })
            }
          }
        },
        include: { user: { select: { phone: true } } }
      })

      res.json(serializeStudent(updated))
    } catch (e: any) {
      if (e?.code === "P2002") {
        return res.status(409).json({ error: "phone already exists" })
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
