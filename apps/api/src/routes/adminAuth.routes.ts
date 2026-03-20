import { Router } from "express"
import { prisma } from "@kidscode/database"
import { signAdminToken, verifyAdminToken, getTokenFromRequest } from "../lib/adminToken"
import { signStudentToken } from "../lib/studentToken"

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

// POST /auth/admin/login
router.post("/login", async (req, res) => {
  const credential = asString(req.body?.account ?? req.body?.phone)
  const password = asString(req.body?.password)

  if (!credential) return res.status(400).json({ error: "account is required" })
  if (!password) return res.status(400).json({ error: "password is required" })

  const account = normalizeAccount(credential)
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
      where: { phone: credential },
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

  if (!user || !canUseAdmin(user)) {
    return res.status(401).json({ error: "账号或密码错误" })
  }

  // Back-compat: passwords are currently stored as plaintext in this repo.
  if (user.password !== password) {
    return res.status(401).json({ error: "账号或密码错误" })
  }

  const student = await ensureStudentProfile(user)
  setCookies(res, [
    serializeCookie("kidscode_admin", signAdminToken(user.id, 60 * 60 * 24 * 7)),
    serializeCookie("kidscode_student", signStudentToken(student.id, 60 * 60 * 24 * 7))
  ])
  return res.json({ ok: true, student: { id: student.id, nickname: student.nickname } })
})

// POST /auth/admin/logout
router.post("/logout", async (_req, res) => {
  setCookies(res, [clearCookie("kidscode_admin"), clearCookie("kidscode_student")])
  return res.json({ ok: true })
})

// GET /auth/admin/me
router.get("/me", async (req, res) => {
  const token = getTokenFromRequest(req as any)
  const ok = token ? verifyAdminToken(token) : null
  if (!ok) return res.status(401).json({ ok: false })
  return res.json({ ok: true })
})

export default router
