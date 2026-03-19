import type { Request, Response, NextFunction } from "express"
import { getTokenFromRequest, verifyStudentToken } from "../lib/studentToken"

export function requireStudent(req: Request & { studentId?: string }, res: Response, next: NextFunction) {
  const token = getTokenFromRequest(req as any)
  const ok = token ? verifyStudentToken(token) : null
  if (!ok) return res.status(401).json({ error: "unauthorized" })
  req.studentId = ok.studentId
  return next()
}

