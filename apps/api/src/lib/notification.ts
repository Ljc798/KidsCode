import { prisma } from "@kidscode/database"
import { emitStudentNotification } from "../chatWs"

export type NotificationDTO = {
  id: string
  type: "REVIEW_DONE" | "REVIEW_COMMENT" | "REWARD_GRANTED" | "SYSTEM_NOTICE"
  title: string
  content: string
  payload: unknown
  isRead: boolean
  readAt: string | null
  createdAt: string
}

function serialize(row: any): NotificationDTO {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content,
    payload: row.payload ?? null,
    isRead: Boolean(row.isRead),
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString()
  }
}

export async function createStudentNotification(input: {
  recipientStudentId: string
  type: NotificationDTO["type"]
  title: string
  content: string
  payload?: unknown
}) {
  const db = prisma as any
  const created = await db.notification.create({
    data: {
      recipientStudentId: input.recipientStudentId,
      type: input.type,
      title: input.title,
      content: input.content,
      payload: input.payload ?? null
    }
  })

  const unreadCount = await db.notification.count({
    where: {
      recipientStudentId: input.recipientStudentId,
      isRead: false
    }
  })

  const dto = serialize(created)
  emitStudentNotification(input.recipientStudentId, dto, unreadCount)
  return dto
}

export async function listStudentNotifications(
  recipientStudentId: string,
  options?: { unreadOnly?: boolean; limit?: number }
) {
  const db = prisma as any
  const rows = await db.notification.findMany({
    where: {
      recipientStudentId,
      ...(options?.unreadOnly ? { isRead: false } : {})
    },
    orderBy: [{ createdAt: "desc" }],
    take: Math.max(1, Math.min(options?.limit ?? 50, 200))
  })
  return (rows as Array<any>).map(serialize)
}

export async function getStudentNotificationUnreadCount(recipientStudentId: string) {
  const db = prisma as any
  return db.notification.count({
    where: {
      recipientStudentId,
      isRead: false
    }
  })
}

export async function markStudentNotificationRead(
  recipientStudentId: string,
  notificationId: string
) {
  const db = prisma as any
  const now = new Date()
  const updated = await db.notification.updateMany({
    where: {
      id: notificationId,
      recipientStudentId,
      isRead: false
    },
    data: {
      isRead: true,
      readAt: now
    }
  })
  const unreadCount = await getStudentNotificationUnreadCount(recipientStudentId)
  emitStudentNotification(recipientStudentId, null, unreadCount)
  return updated.count > 0
}

export async function markAllStudentNotificationsRead(recipientStudentId: string) {
  const db = prisma as any
  const now = new Date()
  await db.notification.updateMany({
    where: {
      recipientStudentId,
      isRead: false
    },
    data: {
      isRead: true,
      readAt: now
    }
  })
  emitStudentNotification(recipientStudentId, null, 0)
  return true
}

export async function createSystemNoticeBatch(input: {
  studentIds: string[]
  title: string
  content: string
  payload?: unknown
}) {
  const ids = Array.from(new Set(input.studentIds.filter(Boolean)))
  if (ids.length === 0) return 0
  for (const studentId of ids) {
    await createStudentNotification({
      recipientStudentId: studentId,
      type: "SYSTEM_NOTICE",
      title: input.title,
      content: input.content,
      payload: input.payload
    })
  }
  return ids.length
}
