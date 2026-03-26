import { Router } from "express"
import { prisma } from "@kidscode/database"
import {
  createThreadMessage,
  ensureAdminThreadByStudent,
  listMessages,
  listThreads,
  markThreadRead,
  resolveChatActorFromHeaders
} from "../lib/chat"
import {
  getStudentNotificationUnreadCount,
  listStudentNotifications,
  createSystemNoticeBatch,
  markAllStudentNotificationsRead,
  markStudentNotificationRead
} from "../lib/notification"
import {
  getAdminNotificationUnreadCount,
  listAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead
} from "../lib/adminNotification"

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

router.get("/notifications", async (req: any, res) => {
  const actor = getActor(req, res)
  if (!actor) return
  if (actor.role !== "STUDENT") return res.json({ ok: true, notifications: [] })
  const limitRaw = Number(req.query?.limit ?? 50)
  const limit = Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 50
  const unreadOnlyRaw = String(req.query?.unreadOnly ?? "").toLowerCase()
  const unreadOnly = unreadOnlyRaw === "1" || unreadOnlyRaw === "true"

  const notifications = await listStudentNotifications(actor.studentId, { unreadOnly, limit })
  return res.json({ ok: true, notifications })
})

router.get("/notifications/unread-count", async (req: any, res) => {
  const actor = getActor(req, res)
  if (!actor) return
  if (actor.role !== "STUDENT") return res.json({ ok: true, unreadCount: 0 })
  const unreadCount = await getStudentNotificationUnreadCount(actor.studentId)
  return res.json({ ok: true, unreadCount })
})

router.post("/notifications/read-all", async (req: any, res) => {
  const actor = getActor(req, res)
  if (!actor) return
  if (actor.role !== "STUDENT") return res.json({ ok: true })
  await markAllStudentNotificationsRead(actor.studentId)
  return res.json({ ok: true })
})

router.post("/notifications/:id/read", async (req: any, res) => {
  const actor = getActor(req, res)
  if (!actor) return
  if (actor.role !== "STUDENT") return res.json({ ok: true })
  const id = typeof req.params?.id === "string" ? req.params.id.trim() : ""
  if (!id) return res.status(400).json({ error: "invalid notification id" })
  await markStudentNotificationRead(actor.studentId, id)
  return res.json({ ok: true })
})

router.post("/admin/notifications", async (req: any, res) => {
  const actor = getActor(req, res)
  if (!actor) return
  if (actor.role !== "ADMIN") return res.status(403).json({ error: "forbidden" })

  const title = typeof req.body?.title === "string" ? req.body.title.trim() : ""
  const content = typeof req.body?.content === "string" ? req.body.content.trim() : ""
  const targetType =
    typeof req.body?.targetType === "string" ? req.body.targetType.trim().toUpperCase() : "ALL"
  const className =
    typeof req.body?.className === "string" ? req.body.className.trim() : ""
  const studentId =
    typeof req.body?.studentId === "string" ? req.body.studentId.trim() : ""

  if (!title) return res.status(400).json({ error: "title is required" })
  if (!content) return res.status(400).json({ error: "content is required" })

  let recipients: Array<{ id: string }> = []
  if (targetType === "STUDENT") {
    if (!studentId) return res.status(400).json({ error: "studentId is required" })
    recipients = await (prisma as any).student.findMany({
      where: { id: studentId },
      select: { id: true }
    })
  } else if (targetType === "CLASS") {
    if (!className) return res.status(400).json({ error: "className is required" })
    recipients = await (prisma as any).student.findMany({
      where: { className },
      select: { id: true }
    })
  } else {
    recipients = await (prisma as any).student.findMany({
      select: { id: true }
    })
  }

  const sentCount = await createSystemNoticeBatch({
    studentIds: recipients.map(item => item.id),
    title,
    content,
    payload: {
      source: "admin_broadcast",
      targetType,
      className: className || null,
      studentId: studentId || null,
      adminUserId: actor.adminUserId
    }
  })

  return res.json({ ok: true, sentCount })
})

router.get("/admin/inbox", async (req: any, res) => {
  const actor = getActor(req, res)
  if (!actor) return
  if (actor.role !== "ADMIN") return res.status(403).json({ error: "forbidden" })
  const limitRaw = Number(req.query?.limit ?? 80)
  const limit = Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 80
  const categoryRaw = typeof req.query?.category === "string" ? req.query.category.trim().toUpperCase() : ""
  const category = categoryRaw === "EXERCISE" || categoryRaw === "CLASSROOM_PROJECT" ? categoryRaw : undefined
  const notifications = await listAdminNotifications(actor.adminUserId, { limit, category })
  return res.json({ ok: true, notifications })
})

router.get("/admin/inbox/unread-count", async (req: any, res) => {
  const actor = getActor(req, res)
  if (!actor) return
  if (actor.role !== "ADMIN") return res.status(403).json({ error: "forbidden" })
  const unreadCount = await getAdminNotificationUnreadCount(actor.adminUserId)
  return res.json({ ok: true, unreadCount })
})

router.post("/admin/inbox/:id/read", async (req: any, res) => {
  const actor = getActor(req, res)
  if (!actor) return
  if (actor.role !== "ADMIN") return res.status(403).json({ error: "forbidden" })
  const id = typeof req.params?.id === "string" ? req.params.id.trim() : ""
  if (!id) return res.status(400).json({ error: "invalid notification id" })
  await markAdminNotificationRead(actor.adminUserId, id)
  return res.json({ ok: true })
})

router.post("/admin/inbox/read-all", async (req: any, res) => {
  const actor = getActor(req, res)
  if (!actor) return
  if (actor.role !== "ADMIN") return res.status(403).json({ error: "forbidden" })
  await markAllAdminNotificationsRead(actor.adminUserId)
  return res.json({ ok: true })
})

export default router
