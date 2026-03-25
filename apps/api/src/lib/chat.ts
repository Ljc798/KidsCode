import { prisma } from "@kidscode/database"
import { getTokenFromRequest as getStudentToken, verifyStudentToken } from "./studentToken"
import { getTokenFromRequest as getAdminToken, verifyAdminToken } from "./adminToken"

export type ChatActor =
  | { role: "STUDENT"; studentId: string }
  | { role: "ADMIN"; adminUserId: string }

export function resolveChatActorFromHeaders(headers: {
  cookie?: unknown
  authorization?: unknown
}): ChatActor | null {
  const adminToken = getAdminToken({ headers })
  const admin = adminToken ? verifyAdminToken(adminToken) : null
  if (admin) return { role: "ADMIN", adminUserId: admin.userId }

  const studentToken = getStudentToken({ headers })
  const student = studentToken ? verifyStudentToken(studentToken) : null
  if (student) return { role: "STUDENT", studentId: student.studentId }

  return null
}

export async function ensureStudentThread(studentId: string) {
  const db = prisma as any
  const existing = await db.chatThread.findUnique({
    where: { studentId }
  })
  if (existing) return existing
  return db.chatThread.create({
    data: { studentId }
  })
}

export async function ensureAdminThreadByStudent(
  actor: ChatActor,
  studentId: string
) {
  if (actor.role !== "ADMIN") return null
  const db = prisma as any
  const student = await db.student.findUnique({
    where: { id: studentId },
    select: { id: true, nickname: true, className: true }
  })
  if (!student) return null

  const thread = await ensureStudentThread(studentId)
  const unread = await db.chatMessage.count({
    where: {
      threadId: thread.id,
      senderRole: "STUDENT",
      readByAdminAt: null
    }
  })

  return {
    id: thread.id,
    studentId: thread.studentId,
    studentNickname: student.nickname,
    studentClassName: student.className,
    lastMessageAt: thread.lastMessageAt?.toISOString() ?? null,
    lastMessagePreview: thread.lastMessagePreview ?? null,
    unreadCount: unread
  }
}

export async function canAccessThread(actor: ChatActor, threadId: string) {
  const db = prisma as any
  const thread = await db.chatThread.findUnique({
    where: { id: threadId },
    select: { id: true, studentId: true }
  })
  if (!thread) return null
  if (actor.role === "STUDENT" && thread.studentId !== actor.studentId) return null
  return thread
}

export async function listThreads(actor: ChatActor) {
  const db = prisma as any
  if (actor.role === "STUDENT") {
    const thread = await ensureStudentThread(actor.studentId)
    const unread = await db.chatMessage.count({
      where: {
        threadId: thread.id,
        senderRole: "ADMIN",
        readByStudentAt: null
      }
    })
    return [
      {
        id: thread.id,
        studentId: thread.studentId,
        studentNickname: "老师",
        studentClassName: null,
        lastMessageAt: thread.lastMessageAt?.toISOString() ?? null,
        lastMessagePreview: thread.lastMessagePreview ?? null,
        unreadCount: unread
      }
    ]
  }

  const threads = await db.chatThread.findMany({
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    include: {
      student: {
        select: {
          id: true,
          nickname: true,
          className: true
        }
      }
    },
    take: 100
  })

  const unreadByThread = new Map<string, number>()
  const threadIds = (threads as Array<any>).map(item => item.id as string)
  const unreadGroups = await db.chatMessage.groupBy({
    by: ["threadId"],
    where: {
      threadId: { in: threadIds },
      senderRole: "STUDENT",
      readByAdminAt: null
    },
    _count: { _all: true }
  })
  for (const row of unreadGroups as Array<{ threadId: string; _count: { _all: number } }>) {
    unreadByThread.set(row.threadId, row._count._all)
  }

  return (threads as Array<any>).map(item => ({
    id: item.id,
    studentId: item.studentId,
    studentNickname: item.student.nickname,
    studentClassName: item.student.className,
    lastMessageAt: item.lastMessageAt?.toISOString() ?? null,
    lastMessagePreview: item.lastMessagePreview ?? null,
    unreadCount: unreadByThread.get(item.id) ?? 0
  }))
}

export async function listMessages(actor: ChatActor, threadId: string, limit = 50) {
  const db = prisma as any
  const thread = await canAccessThread(actor, threadId)
  if (!thread) return null

  const rows = await db.chatMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    take: Math.max(1, Math.min(limit, 200))
  })

  return (rows as Array<any>).map(row => ({
    id: row.id,
    threadId: row.threadId,
    senderRole: row.senderRole,
    senderStudentId: row.senderStudentId,
    senderAdminUserId: row.senderAdminUserId,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    readByStudentAt: row.readByStudentAt?.toISOString() ?? null,
    readByAdminAt: row.readByAdminAt?.toISOString() ?? null
  }))
}

export async function createThreadMessage(actor: ChatActor, threadId: string, content: string) {
  const db = prisma as any
  const text = content.trim()
  if (!text) return null

  const thread = await canAccessThread(actor, threadId)
  if (!thread) return null

  const now = new Date()
  const created = await db.$transaction(async (tx: any) => {
    const msg = await tx.chatMessage.create({
      data: {
        threadId,
        senderRole: actor.role,
        senderStudentId: actor.role === "STUDENT" ? actor.studentId : null,
        senderAdminUserId: actor.role === "ADMIN" ? actor.adminUserId : null,
        content: text,
        readByStudentAt: actor.role === "STUDENT" ? now : null,
        readByAdminAt: actor.role === "ADMIN" ? now : null
      }
    })

    await tx.chatThread.update({
      where: { id: threadId },
      data: {
        lastMessageAt: msg.createdAt,
        lastMessagePreview: text.slice(0, 80)
      }
    })
    return msg
  })

  return {
    id: created.id,
    threadId: created.threadId,
    senderRole: created.senderRole,
    senderStudentId: created.senderStudentId,
    senderAdminUserId: created.senderAdminUserId,
    content: created.content,
    createdAt: created.createdAt.toISOString(),
    readByStudentAt: created.readByStudentAt?.toISOString() ?? null,
    readByAdminAt: created.readByAdminAt?.toISOString() ?? null
  }
}

export async function markThreadRead(actor: ChatActor, threadId: string) {
  const db = prisma as any
  const thread = await canAccessThread(actor, threadId)
  if (!thread) return false

  const now = new Date()
  if (actor.role === "STUDENT") {
    await db.chatMessage.updateMany({
      where: {
        threadId,
        senderRole: "ADMIN",
        readByStudentAt: null
      },
      data: {
        readByStudentAt: now
      }
    })
  } else {
    await db.chatMessage.updateMany({
      where: {
        threadId,
        senderRole: "STUDENT",
        readByAdminAt: null
      },
      data: {
        readByAdminAt: now
      }
    })
  }

  return true
}
