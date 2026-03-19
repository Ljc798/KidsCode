import { getTokenFromRequest, verifyAdminToken } from "../lib/adminToken"

export function requireAdmin(req: any, res: any, next: any) {
  const token = getTokenFromRequest(req)
  const ok = token ? verifyAdminToken(token) : null
  if (!ok) return res.status(401).json({ error: "unauthorized" })
  req.adminUserId = ok.userId
  return next()
}

