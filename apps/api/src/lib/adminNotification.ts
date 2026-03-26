import { prisma } from "@kidscode/database"
import { emitAdminNotification } from "../chatWs"

export type AdminNotificationDTO = {
  id: string
  category: "EXERCISE" | "CLASSROOM_PROJECT"
  title: string
  content: string
  payload: unknown
  isRead: boolean
  readAt: string | null
  createdAt: string
}

function serialize(row: any): AdminNotificationDTO {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    content: row.content,
    payload: row.payload ?? null,
    isRead: Boolean(row.isRead),
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString()
  }
}

export async function getAdminNotificationUnreadCount(adminUserId: string) {
  const db = prisma as any
  return db.adminNotification.count({
    where: {
      recipientAdminUserId: adminUserId,
      isRead: false
    }
  })
}

export async function listAdminNotifications(
  adminUserId: string,
  options?: { limit?: number; category?: "EXERCISE" | "CLASSROOM_PROJECT" }
) {
  const db = prisma as any
  const rows = await db.adminNotification.findMany({
    where: {
      recipientAdminUserId: adminUserId,
      ...(options?.category ? { category: options.category } : {})
    },
    orderBy: [{ createdAt: "desc" }],
    take: Math.max(1, Math.min(options?.limit ?? 60, 200))
  })
  return (rows as Array<any>).map(serialize)
}

export async function markAdminNotificationRead(adminUserId: string, notificationId: string) {
  const db = prisma as any
  const now = new Date()
  await db.adminNotification.updateMany({
    where: {
      id: notificationId,
      recipientAdminUserId: adminUserId,
      isRead: false
    },
    data: {
      isRead: true,
      readAt: now
    }
  })
  const unreadCount = await getAdminNotificationUnreadCount(adminUserId)
  emitAdminNotification(adminUserId, null, unreadCount)
  return true
}

export async function markAllAdminNotificationsRead(adminUserId: string) {
  const db = prisma as any
  const now = new Date()
  await db.adminNotification.updateMany({
    where: {
      recipientAdminUserId: adminUserId,
      isRead: false
    },
    data: {
      isRead: true,
      readAt: now
    }
  })
  emitAdminNotification(adminUserId, null, 0)
  return true
}

export async function createAdminNotificationForAll(input: {
  category: "EXERCISE" | "CLASSROOM_PROJECT"
  title: string
  content: string
  payload?: unknown
}) {
  const db = prisma as any
  const admins = await db.user.findMany({
    where: {
      role: "ADMIN"
    },
    select: { id: true }
  })
  for (const admin of admins as Array<{ id: string }>) {
    const created = await db.adminNotification.create({
      data: {
        recipientAdminUserId: admin.id,
        category: input.category,
        title: input.title,
        content: input.content,
        payload: input.payload ?? null
      }
    })
    const unreadCount = await getAdminNotificationUnreadCount(admin.id)
    emitAdminNotification(admin.id, serialize(created), unreadCount)
  }

  return admins.length
}
