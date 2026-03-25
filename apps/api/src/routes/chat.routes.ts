import { Router } from "express"
import {
  createThreadMessage,
  ensureAdminThreadByStudent,
  listMessages,
  listThreads,
  markThreadRead,
  resolveChatActorFromHeaders
} from "../lib/chat"

const router = Router()

function getActor(req: any, res: any) {
  const actor = resolveChatActorFromHeaders(req.headers ?? {})
  if (!actor) {
    res.status(401).json({ error: "unauthorized" })
    return null
  }
  return actor
}

router.get("/me", async (req: any, res) => {
  const actor = getActor(req, res)
  if (!actor) return
  if (actor.role === "STUDENT") {
    return res.json({ ok: true, role: "STUDENT", studentId: actor.studentId })
  }
  return res.json({ ok: true, role: "ADMIN", adminUserId: actor.adminUserId })
})

router.get("/threads", async (req: any, res) => {
  const actor = getActor(req, res)
  if (!actor) return
  const threads = await listThreads(actor)
  return res.json({ ok: true, threads })
})

router.post("/threads/by-student/:studentId", async (req: any, res) => {
  const actor = getActor(req, res)
  if (!actor) return
  const studentId =
    typeof req.params?.studentId === "string" ? req.params.studentId.trim() : ""
  if (!studentId) return res.status(400).json({ error: "invalid student id" })

  const thread = await ensureAdminThreadByStudent(actor, studentId)
  if (!thread) return res.status(404).json({ error: "student not found" })
  return res.json({ ok: true, thread })
})

router.get("/threads/:id/messages", async (req: any, res) => {
  const actor = getActor(req, res)
  if (!actor) return
  const threadId = typeof req.params?.id === "string" ? req.params.id.trim() : ""
  if (!threadId) return res.status(400).json({ error: "invalid thread id" })
  const limitRaw = Number(req.query?.limit ?? 50)
  const limit = Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 50

  const messages = await listMessages(actor, threadId, limit)
  if (!messages) return res.status(404).json({ error: "thread not found" })
  return res.json({ ok: true, messages })
})

router.post("/threads/:id/messages", async (req: any, res) => {
  const actor = getActor(req, res)
  if (!actor) return
  const threadId = typeof req.params?.id === "string" ? req.params.id.trim() : ""
  const content = typeof req.body?.content === "string" ? req.body.content : ""
  if (!threadId) return res.status(400).json({ error: "invalid thread id" })
  if (!content.trim()) return res.status(400).json({ error: "content is required" })

  const message = await createThreadMessage(actor, threadId, content)
  if (!message) return res.status(404).json({ error: "thread not found" })
  return res.json({ ok: true, message })
})

router.post("/threads/:id/read", async (req: any, res) => {
  const actor = getActor(req, res)
  if (!actor) return
  const threadId = typeof req.params?.id === "string" ? req.params.id.trim() : ""
  if (!threadId) return res.status(400).json({ error: "invalid thread id" })
  const ok = await markThreadRead(actor, threadId)
  if (!ok) return res.status(404).json({ error: "thread not found" })
  return res.json({ ok: true })
})

export default router
