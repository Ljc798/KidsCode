import { Router } from "express"
import { prisma } from "@kidscode/database"
import { signAdminToken, verifyAdminToken, getTokenFromRequest } from "../lib/adminToken"

const router = Router()

const asString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

function setCookie(res: any, token: string) {
  const maxAge = 60 * 60 * 24 * 7
  const secure = process.env.NODE_ENV === "production"
  // SameSite=Lax works for normal navigation and protects CSRF a bit.
  const cookie = [
    `kidscode_admin=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    secure ? "Secure" : ""
  ]
    .filter(Boolean)
    .join("; ")
  res.setHeader("Set-Cookie", cookie)
}

function clearCookie(res: any) {
  const secure = process.env.NODE_ENV === "production"
  const cookie = [
    "kidscode_admin=",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    secure ? "Secure" : ""
  ]
    .filter(Boolean)
    .join("; ")
  res.setHeader("Set-Cookie", cookie)
}

// POST /auth/admin/login
router.post("/login", async (req, res) => {
  const phone = asString(req.body?.phone)
  const password = asString(req.body?.password)

  if (!phone) return res.status(400).json({ error: "phone is required" })
  if (!password) return res.status(400).json({ error: "password is required" })

  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, role: true, password: true }
  })

  if (!user || user.role !== "ADMIN") {
    return res.status(401).json({ error: "invalid credentials" })
  }

  // Back-compat: passwords are currently stored as plaintext in this repo.
  if (user.password !== password) {
    return res.status(401).json({ error: "invalid credentials" })
  }

  const token = signAdminToken(user.id, 60 * 60 * 24 * 7)

  setCookie(res, token)
  return res.json({ ok: true })
})

// POST /auth/admin/logout
router.post("/logout", async (_req, res) => {
  clearCookie(res)
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
