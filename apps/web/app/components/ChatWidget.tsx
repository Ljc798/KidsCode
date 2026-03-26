"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { API_BASE, apiFetch } from "@/app/lib/api"

type ChatActor =
  | { ok: true; role: "STUDENT"; studentId: string }
  | { ok: true; role: "ADMIN"; adminUserId: string }

type ChatThread = {
  id: string
  studentId: string
  studentNickname: string
  studentClassName: string | null
  lastMessageAt: string | null
  lastMessagePreview: string | null
  unreadCount: number
}

type ChatMessage = {
  id: string
  threadId: string
  senderRole: "STUDENT" | "ADMIN"
  senderStudentId: string | null
  senderAdminUserId: string | null
  content: string
  createdAt: string
  readByStudentAt?: string | null
  readByAdminAt?: string | null
}

type StudentItem = {
  id: string
  nickname: string
  className: string | null
}

type NotificationItem = {
  id: string
  type: "REVIEW_DONE" | "REVIEW_COMMENT" | "REWARD_GRANTED" | "SYSTEM_NOTICE"
  title: string
  content: string
  payload: unknown
  isRead: boolean
  readAt: string | null
  createdAt: string
}

type AdminNotificationItem = {
  id: string
  category: "EXERCISE" | "CLASSROOM_PROJECT"
  title: string
  content: string
  payload: unknown
  isRead: boolean
  readAt: string | null
  createdAt: string
}

type LeftMode =
  | "threads"
  | "students"
  | "notifications"
  | "broadcast"
  | "adminInbox"

function buildWsUrl() {
  const explicit = process.env.NEXT_PUBLIC_CHAT_WS_URL
  if (explicit) return explicit

  if (typeof window === "undefined") return ""
  if (API_BASE.startsWith("http://") || API_BASE.startsWith("https://")) {
    try {
      const u = new URL(API_BASE)
      const protocol = u.protocol === "https:" ? "wss:" : "ws:"
      return `${protocol}//${u.host}/ws/chat`
    } catch {
      // ignore parse failures and use fallback below
    }
  }
  const protocol = window.location.protocol === "https:" ? "wss" : "ws"
  const host = window.location.hostname
  const port = window.location.port

  if (host === "localhost" || host === "127.0.0.1") {
    return `${protocol}://${host}:3001/ws/chat`
  }

  if (port && port !== "80" && port !== "443") {
    return `${protocol}://${host}:3001/ws/chat`
  }

  return `${protocol}://${window.location.host}/ws/chat`
}

function fmtTime(value: string | null) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  })
}

export default function ChatWidget() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [actor, setActor] = useState<ChatActor | null>(null)
  const [open, setOpen] = useState(false)
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [loadingThreads, setLoadingThreads] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingNotifications, setLoadingNotifications] = useState(false)
  const [loadingAdminInbox, setLoadingAdminInbox] = useState(false)
  const [studentsLoaded, setStudentsLoaded] = useState(false)
  const [notificationsLoaded, setNotificationsLoaded] = useState(false)
  const [adminInboxLoaded, setAdminInboxLoaded] = useState(false)
  const [students, setStudents] = useState<StudentItem[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [adminInbox, setAdminInbox] = useState<AdminNotificationItem[]>([])
  const [activeNotificationId, setActiveNotificationId] = useState<string | null>(null)
  const [activeAdminNotificationId, setActiveAdminNotificationId] = useState<string | null>(null)
  const [adminInboxCategory, setAdminInboxCategory] = useState<"ALL" | "EXERCISE" | "CLASSROOM_PROJECT">("ALL")
  const [leftMode, setLeftMode] = useState<LeftMode>("threads")
  const [broadcastTargetType, setBroadcastTargetType] = useState<"ALL" | "CLASS" | "STUDENT">("ALL")
  const [broadcastClassName, setBroadcastClassName] = useState("")
  const [broadcastStudentId, setBroadcastStudentId] = useState("")
  const [broadcastTitle, setBroadcastTitle] = useState("")
  const [broadcastContent, setBroadcastContent] = useState("")
  const [broadcastSending, setBroadcastSending] = useState(false)
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null)
  const [wsRetry, setWsRetry] = useState(0)
  const [wsDown, setWsDown] = useState(false)
  const [launcherAlert, setLauncherAlert] = useState(false)
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0)
  const [adminNotificationUnreadCount, setAdminNotificationUnreadCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const heartbeatRef = useRef<number | null>(null)
  const reconnectRef = useRef<number | null>(null)
  const launcherAlertTimeoutRef = useRef<number | null>(null)
  const prevUnreadRef = useRef(0)

  const activeThread = useMemo(
    () => threads.find(t => t.id === activeThreadId) ?? null,
    [activeThreadId, threads]
  )
  const activeNotification = useMemo(
    () => notifications.find(item => item.id === activeNotificationId) ?? null,
    [activeNotificationId, notifications]
  )
  const activeAdminNotification = useMemo(
    () => adminInbox.find(item => item.id === activeAdminNotificationId) ?? null,
    [activeAdminNotificationId, adminInbox]
  )

  const chatUnread = useMemo(
    () => threads.reduce((sum, thread) => sum + thread.unreadCount, 0),
    [threads]
  )

  const totalUnread = useMemo(() => {
    if (actor?.role === "ADMIN") return chatUnread + adminNotificationUnreadCount
    return chatUnread + notificationUnreadCount
  }, [actor, chatUnread, notificationUnreadCount, adminNotificationUnreadCount])

  const studentsByClass = useMemo(() => {
    const map = new Map<string, StudentItem[]>()
    for (const item of students) {
      const key = item.className?.trim() || "未分班"
      const list = map.get(key)
      if (list) {
        list.push(item)
      } else {
        map.set(key, [item])
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "zh-CN"))
      .map(([className, list]) => ({
        className,
        students: list.sort((a, b) => a.nickname.localeCompare(b.nickname, "zh-CN"))
      }))
  }, [students])

  const classNames = useMemo(
    () =>
      Array.from(
        new Set(students.map(item => item.className?.trim()).filter(Boolean) as string[])
      ).sort((a, b) => a.localeCompare(b, "zh-CN")),
    [students]
  )

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const me = await apiFetch<ChatActor>("/chat/me")
        if (!cancelled) {
          setActor(me)
          setReady(true)
        }
      } catch {
        if (!cancelled) setReady(true)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!open || !actor) return
    let cancelled = false
    const run = async () => {
      setLoadingThreads(true)
      try {
        const data = await apiFetch<{ ok: true; threads: ChatThread[] }>("/chat/threads")
        if (cancelled) return
        setThreads(data.threads)
        if (!activeThreadId && data.threads.length > 0) {
          setActiveThreadId(data.threads[0]!.id)
        } else if (activeThreadId && !data.threads.some(item => item.id === activeThreadId)) {
          setActiveThreadId(data.threads[0]?.id ?? null)
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载会话失败")
      } finally {
        if (!cancelled) setLoadingThreads(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [open, actor, activeThreadId])

  useEffect(() => {
    if (!actor || open) return
    let cancelled = false
    const run = async () => {
      try {
        const data = await apiFetch<{ ok: true; threads: ChatThread[] }>("/chat/threads")
        if (cancelled) return
        setThreads(data.threads)
      } catch {
        // ignore background refresh errors
      }
    }
    run()
    const timer = window.setInterval(run, 12000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [actor, open])

  useEffect(() => {
    if (
      !open ||
      actor?.role !== "ADMIN" ||
      (leftMode !== "students" && leftMode !== "broadcast") ||
      studentsLoaded
    )
      return
    let cancelled = false
    const run = async () => {
      setLoadingStudents(true)
      try {
        const rows = await apiFetch<StudentItem[]>("/students")
        if (cancelled) return
        setStudents(
          rows.map(item => ({
            id: item.id,
            nickname: item.nickname,
            className: item.className ?? null
          }))
        )
        setStudentsLoaded(true)
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载学生失败")
      } finally {
        if (!cancelled) setLoadingStudents(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [open, actor, leftMode, studentsLoaded])

  useEffect(() => {
    if (!open || actor?.role !== "STUDENT" || leftMode !== "notifications" || notificationsLoaded) return
    let cancelled = false
    const run = async () => {
      setLoadingNotifications(true)
      try {
        const data = await apiFetch<{ ok: true; notifications: NotificationItem[] }>(
          "/chat/notifications?limit=80"
        )
        if (cancelled) return
        setNotifications(data.notifications)
        setNotificationsLoaded(true)
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载通知失败")
      } finally {
        if (!cancelled) setLoadingNotifications(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [open, actor, leftMode, notificationsLoaded])

  useEffect(() => {
    if (leftMode !== "notifications") return
    if (!activeNotificationId && notifications.length > 0) {
      setActiveNotificationId(notifications[0]!.id)
    } else if (
      activeNotificationId &&
      !notifications.some(item => item.id === activeNotificationId)
    ) {
      setActiveNotificationId(notifications[0]?.id ?? null)
    }
  }, [leftMode, notifications, activeNotificationId])

  useEffect(() => {
    if (leftMode !== "adminInbox") return
    if (!activeAdminNotificationId && adminInbox.length > 0) {
      setActiveAdminNotificationId(adminInbox[0]!.id)
    } else if (
      activeAdminNotificationId &&
      !adminInbox.some(item => item.id === activeAdminNotificationId)
    ) {
      setActiveAdminNotificationId(adminInbox[0]?.id ?? null)
    }
  }, [leftMode, adminInbox, activeAdminNotificationId])

  useEffect(() => {
    setAdminInboxLoaded(false)
  }, [adminInboxCategory])

  useEffect(() => {
    if (!actor || actor.role !== "STUDENT") return
    let cancelled = false
    const run = async () => {
      try {
        const data = await apiFetch<{ ok: true; unreadCount: number }>(
          "/chat/notifications/unread-count"
        )
        if (!cancelled) setNotificationUnreadCount(data.unreadCount)
      } catch {
        // ignore count refresh errors
      }
    }
    run()
    const timer = window.setInterval(run, 15000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [actor])

  useEffect(() => {
    if (!open || actor?.role !== "ADMIN" || leftMode !== "adminInbox" || adminInboxLoaded) return
    let cancelled = false
    const run = async () => {
      setLoadingAdminInbox(true)
      try {
        const categoryQuery =
          adminInboxCategory === "ALL" ? "" : `&category=${encodeURIComponent(adminInboxCategory)}`
        const data = await apiFetch<{ ok: true; notifications: AdminNotificationItem[] }>(
          `/chat/admin/inbox?limit=80${categoryQuery}`
        )
        if (cancelled) return
        setAdminInbox(data.notifications)
        setAdminInboxLoaded(true)
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载老师通知失败")
      } finally {
        if (!cancelled) setLoadingAdminInbox(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [open, actor, leftMode, adminInboxLoaded, adminInboxCategory])

  useEffect(() => {
    if (!actor || actor.role !== "ADMIN") return
    let cancelled = false
    const run = async () => {
      try {
        const data = await apiFetch<{ ok: true; unreadCount: number }>(
          "/chat/admin/inbox/unread-count"
        )
        if (!cancelled) setAdminNotificationUnreadCount(data.unreadCount)
      } catch {
        // ignore
      }
    }
    run()
    const timer = window.setInterval(run, 15000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [actor])

  useEffect(() => {
    if (!open || !activeThreadId || leftMode !== "threads") return
    let cancelled = false
    const run = async () => {
      setLoadingMessages(true)
      setError(null)
      try {
        const data = await apiFetch<{ ok: true; messages: ChatMessage[] }>(
          `/chat/threads/${activeThreadId}/messages?limit=80`
        )
        if (cancelled) return
        setMessages(data.messages)
        await apiFetch(`/chat/threads/${activeThreadId}/read`, { method: "POST" })
        setThreads(current =>
          current.map(item => (item.id === activeThreadId ? { ...item, unreadCount: 0 } : item))
        )
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "加载消息失败")
      } finally {
        if (!cancelled) setLoadingMessages(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [open, activeThreadId, leftMode])

  useEffect(() => {
    if (!open || !actor) return
    let shouldReconnect = true
    const ws = new WebSocket(buildWsUrl())
    wsRef.current = ws

    ws.onopen = () => {
      setWsDown(false)
      if (heartbeatRef.current) window.clearInterval(heartbeatRef.current)
      heartbeatRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }))
        }
      }, 20_000)
      if (activeThreadId) {
        ws.send(JSON.stringify({ type: "subscribe", threadId: activeThreadId }))
      }
    }

    ws.onmessage = event => {
      let data: any
      try {
        data = JSON.parse(String(event.data))
      } catch {
        return
      }
      if (data?.type === "message" && data?.threadId && data?.message) {
        const msg = data.message as ChatMessage
        setThreads(current =>
          current.map(item =>
            item.id === msg.threadId
              ? {
                  ...item,
                  lastMessageAt: msg.createdAt,
                  lastMessagePreview: msg.content,
                  unreadCount:
                    msg.threadId === activeThreadId
                      ? 0
                      : item.unreadCount +
                        (msg.senderRole === "STUDENT" && actor.role === "STUDENT"
                          ? 0
                          : msg.senderRole === "ADMIN" && actor.role === "ADMIN"
                            ? 0
                            : 1)
                }
              : item
          )
        )

        if (msg.threadId === activeThreadId) {
          setMessages(current => [...current, msg])
          apiFetch(`/chat/threads/${msg.threadId}/read`, { method: "POST" }).catch(() => {})
        }
      }

      if (data?.type === "notification" && data?.notification) {
        const incoming = data.notification as NotificationItem
        setNotifications(current => [incoming, ...current.filter(item => item.id !== incoming.id)])
        return
      }

      if (data?.type === "notification_unread_count") {
        const count = Number(data.unreadCount)
        if (Number.isFinite(count)) setNotificationUnreadCount(Math.max(0, Math.floor(count)))
        return
      }

      if (data?.type === "admin_notification" && data?.notification) {
        const incoming = data.notification as AdminNotificationItem
        setAdminInbox(current => [incoming, ...current.filter(item => item.id !== incoming.id)])
        return
      }

      if (data?.type === "admin_notification_unread_count") {
        const count = Number(data.unreadCount)
        if (Number.isFinite(count)) setAdminNotificationUnreadCount(Math.max(0, Math.floor(count)))
        return
      }
    }

    ws.onerror = () => {
      setWsDown(true)
    }

    ws.onclose = () => {
      setWsDown(true)
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }
      if (shouldReconnect && open) {
        if (reconnectRef.current) window.clearTimeout(reconnectRef.current)
        reconnectRef.current = window.setTimeout(() => {
          setWsRetry(v => v + 1)
        }, 1500)
      }
    }

    return () => {
      shouldReconnect = false
      if (reconnectRef.current) {
        window.clearTimeout(reconnectRef.current)
        reconnectRef.current = null
      }
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }
      ws.close()
      wsRef.current = null
    }
  }, [open, actor, activeThreadId, wsRetry])

  useEffect(() => {
    if (!open || !activeThreadId || !wsDown) return
    let cancelled = false
    const run = async () => {
      try {
        const data = await apiFetch<{ ok: true; messages: ChatMessage[] }>(
          `/chat/threads/${activeThreadId}/messages?limit=80`
        )
        if (cancelled) return
        setMessages(data.messages)
      } catch {
        // ignore polling failures
      }
    }
    run()
    const timer = window.setInterval(run, 5000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [open, activeThreadId, wsDown])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, open])

  useEffect(() => {
    if (open) {
      setLauncherAlert(false)
      return
    }
    if (totalUnread > prevUnreadRef.current) {
      setLauncherAlert(true)
      if (launcherAlertTimeoutRef.current) {
        window.clearTimeout(launcherAlertTimeoutRef.current)
      }
      launcherAlertTimeoutRef.current = window.setTimeout(() => {
        setLauncherAlert(false)
      }, 12000)
    }
    prevUnreadRef.current = totalUnread
  }, [totalUnread, open])

  useEffect(() => {
    return () => {
      if (launcherAlertTimeoutRef.current) {
        window.clearTimeout(launcherAlertTimeoutRef.current)
        launcherAlertTimeoutRef.current = null
      }
    }
  }, [])

  if (!ready || !actor) return null

  const openStudentChat = async (student: StudentItem) => {
    setError(null)
    try {
      let target = threads.find(item => item.studentId === student.id) ?? null
      if (!target) {
        const data = await apiFetch<{ ok: true; thread: ChatThread }>(
          `/chat/threads/by-student/${student.id}`,
          { method: "POST" }
        )
        target = data.thread
        setThreads(current => {
          if (current.some(item => item.id === target!.id)) return current
          return [target!, ...current]
        })
      }
      setActiveThreadId(target.id)
      setLeftMode("threads")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "创建会话失败")
    }
  }

  const markNotificationRead = async (id: string) => {
    setNotifications(current =>
      current.map(item =>
        item.id === id ? { ...item, isRead: true, readAt: item.readAt ?? new Date().toISOString() } : item
      )
    )
    setNotificationUnreadCount(current => Math.max(0, current - 1))
    try {
      await apiFetch(`/chat/notifications/${id}/read`, { method: "POST" })
    } catch {
      // ignore
    }
  }

  const resolveNotificationUrl = (item: NotificationItem) => {
    const highlight = item.type === "REVIEW_DONE" || item.type === "REVIEW_COMMENT"
    const payload = (item.payload ?? {}) as Record<string, unknown>
    const projectId = typeof payload.projectId === "string" ? payload.projectId : ""
    if (projectId) {
      const query = new URLSearchParams()
      query.set("projectId", projectId)
      if (highlight) query.set("highlight", "comment")
      return `/me?${query.toString()}`
    }

    const exerciseSlug = typeof payload.exerciseSlug === "string" ? payload.exerciseSlug : ""
    const submissionId = typeof payload.submissionId === "string" ? payload.submissionId : ""
    if (exerciseSlug) {
      const query = new URLSearchParams()
      query.set("mode", "records")
      if (submissionId) query.set("submissionId", submissionId)
      if (highlight) query.set("highlight", "comment")
      return `/exercises/${encodeURIComponent(exerciseSlug)}?${query.toString()}`
    }
    return ""
  }

  const resolveAdminNotificationUrl = (item: AdminNotificationItem) => {
    const payload = (item.payload ?? {}) as Record<string, unknown>
    if (item.category === "EXERCISE") {
      const query = new URLSearchParams()
      const studentId = typeof payload.studentId === "string" ? payload.studentId : ""
      const submissionId = typeof payload.submissionId === "string" ? payload.submissionId : ""
      if (studentId) query.set("studentId", studentId)
      query.set("codingStatus", "PENDING")
      if (submissionId) query.set("reviewId", submissionId)
      return `/admin/reviews?${query.toString()}`
    }
    const query = new URLSearchParams()
    query.set("reviewStatus", "PENDING")
    const projectId = typeof payload.projectId === "string" ? payload.projectId : ""
    if (projectId) query.set("projectId", projectId)
    return `/admin/projects?${query.toString()}`
  }

  const onNotificationClick = async (item: NotificationItem) => {
    setActiveNotificationId(item.id)
    if (!item.isRead) {
      await markNotificationRead(item.id)
    }
  }

  const openNotificationTarget = (item: NotificationItem | null) => {
    if (!item) return
    const url = resolveNotificationUrl(item)
    if (!url) return
    setOpen(false)
    router.push(url)
  }

  const openAdminNotificationTarget = (item: AdminNotificationItem | null) => {
    if (!item) return
    if (!item.isRead) {
      void markAdminNotificationRead(item.id)
    }
    const url = resolveAdminNotificationUrl(item)
    setOpen(false)
    router.push(url)
  }

  const markAllNotificationsRead = async () => {
    setNotifications(current =>
      current.map(item =>
        item.isRead ? item : { ...item, isRead: true, readAt: new Date().toISOString() }
      )
    )
    setNotificationUnreadCount(0)
    try {
      await apiFetch("/chat/notifications/read-all", { method: "POST" })
    } catch {
      // ignore
    }
  }

  const markAdminNotificationRead = async (id: string) => {
    setAdminInbox(current =>
      current.map(item =>
        item.id === id ? { ...item, isRead: true, readAt: item.readAt ?? new Date().toISOString() } : item
      )
    )
    setAdminNotificationUnreadCount(current => Math.max(0, current - 1))
    try {
      await apiFetch(`/chat/admin/inbox/${id}/read`, { method: "POST" })
    } catch {
      // ignore
    }
  }

  const markAllAdminNotificationsRead = async () => {
    setAdminInbox(current =>
      current.map(item =>
        item.isRead ? item : { ...item, isRead: true, readAt: new Date().toISOString() }
      )
    )
    setAdminNotificationUnreadCount(0)
    try {
      await apiFetch("/chat/admin/inbox/read-all", { method: "POST" })
    } catch {
      // ignore
    }
  }

  const sendBroadcast = async () => {
    if (actor?.role !== "ADMIN") return
    const title = broadcastTitle.trim()
    const content = broadcastContent.trim()
    if (!title || !content) {
      setBroadcastResult("标题和内容不能为空")
      return
    }
    if (broadcastTargetType === "CLASS" && !broadcastClassName) {
      setBroadcastResult("请选择班级")
      return
    }
    if (broadcastTargetType === "STUDENT" && !broadcastStudentId) {
      setBroadcastResult("请选择学生")
      return
    }
    setBroadcastSending(true)
    setBroadcastResult(null)
    try {
      const data = await apiFetch<{ ok: true; sentCount: number }>("/chat/admin/notifications", {
        method: "POST",
        body: JSON.stringify({
          targetType: broadcastTargetType,
          className: broadcastTargetType === "CLASS" ? broadcastClassName : undefined,
          studentId: broadcastTargetType === "STUDENT" ? broadcastStudentId : undefined,
          title,
          content
        })
      })
      setBroadcastResult(`发送成功：${data.sentCount} 人`)
      setBroadcastContent("")
      setBroadcastTitle("")
    } catch (e: unknown) {
      setBroadcastResult(e instanceof Error ? e.message : "发送失败")
    } finally {
      setBroadcastSending(false)
    }
  }

  const sendMessage = async () => {
    const content = text.trim()
    if (!content || !activeThreadId || sending) return
    setSending(true)
    setError(null)
    try {
      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "send", threadId: activeThreadId, content }))
      } else {
        const data = await apiFetch<{ ok: true; message: ChatMessage }>(
          `/chat/threads/${activeThreadId}/messages`,
          {
            method: "POST",
            body: JSON.stringify({ content })
          }
        )
        setMessages(current => [...current, data.message])
      }
      setText("")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "发送失败")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`fixed bottom-5 right-5 z-40 inline-flex h-14 items-center justify-center rounded-full px-5 text-sm font-extrabold text-white shadow-xl transition ${
          launcherAlert || totalUnread > 0
            ? "animate-pulse bg-rose-600 hover:bg-rose-500"
            : "bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
        }`}
      >
        聊天{totalUnread > 0 ? ` (${totalUnread})` : ""}
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4">
          <div className="h-[78vh] w-[min(1180px,96vw)] overflow-hidden rounded-3xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-black/10 px-5 py-3 dark:border-white/10">
              <div>
                <div className="text-base font-extrabold text-zinc-950 dark:text-white">
                  {actor.role === "STUDENT" ? "联系老师" : "学生聊天"}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {actor.role === "STUDENT"
                    ? "与老师会话"
                    : activeThread
                    ? `${activeThread.studentNickname} ${activeThread.studentClassName ?? ""}`
                    : "请选择会话"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-black/10 px-2 py-1 text-xs text-zinc-600 dark:border-white/10 dark:text-zinc-300"
              >
                关闭
              </button>
            </div>

            <div className="grid h-[calc(78vh-57px)] grid-cols-[56px_minmax(0,1fr)] md:grid-cols-[64px_300px_minmax(0,1fr)]">
              <aside className="border-r border-black/10 bg-zinc-50 px-2 py-3 dark:border-white/10 dark:bg-zinc-900/40">
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setLeftMode("threads")}
                    className={`inline-flex h-11 items-center justify-center rounded-xl border text-lg ${
                      leftMode === "threads"
                        ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                        : "border-black/10 bg-white text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
                    }`}
                    title="会话列表"
                  >
                    💬
                  </button>
                  {actor.role === "STUDENT" ? (
                    <button
                      type="button"
                      onClick={() => setLeftMode("notifications")}
                      className={`relative inline-flex h-11 items-center justify-center rounded-xl border text-lg ${
                        leftMode === "notifications"
                          ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                          : "border-black/10 bg-white text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
                      }`}
                      title="消息通知"
                    >
                      🔔
                      {notificationUnreadCount > 0 ? (
                        <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                          {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
                        </span>
                      ) : null}
                    </button>
                  ) : null}
                  {actor.role === "ADMIN" ? (
                    <button
                      type="button"
                      onClick={() => setLeftMode("adminInbox")}
                      className={`relative inline-flex h-11 items-center justify-center rounded-xl border text-lg ${
                        leftMode === "adminInbox"
                          ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                          : "border-black/10 bg-white text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
                      }`}
                      title="提交通知"
                    >
                      🧾
                      {adminNotificationUnreadCount > 0 ? (
                        <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                          {adminNotificationUnreadCount > 99 ? "99+" : adminNotificationUnreadCount}
                        </span>
                      ) : null}
                    </button>
                  ) : null}
                  {actor.role === "ADMIN" ? (
                    <button
                      type="button"
                      onClick={() => setLeftMode("students")}
                      className={`inline-flex h-11 items-center justify-center rounded-xl border text-lg ${
                        leftMode === "students"
                          ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                          : "border-black/10 bg-white text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
                      }`}
                      title="学生列表"
                    >
                      👥
                    </button>
                  ) : null}
                  {actor.role === "ADMIN" ? (
                    <button
                      type="button"
                      onClick={() => setLeftMode("broadcast")}
                      className={`inline-flex h-11 items-center justify-center rounded-xl border text-lg ${
                        leftMode === "broadcast"
                          ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                          : "border-black/10 bg-white text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200"
                      }`}
                      title="消息推送"
                    >
                      📢
                    </button>
                  ) : null}
                </div>
              </aside>

              <aside className="hidden border-r border-black/10 md:block dark:border-white/10">
                <div className="border-b border-black/10 px-4 py-3 text-sm font-bold text-zinc-900 dark:border-white/10 dark:text-zinc-100">
                  {leftMode === "students"
                    ? "学生列表（按班级）"
                    : leftMode === "notifications"
                      ? "消息通知"
                      : leftMode === "adminInbox"
                        ? "提交通知"
                      : leftMode === "broadcast"
                        ? "消息推送"
                      : actor.role === "ADMIN"
                        ? "会话列表"
                        : "联系老师"}
                </div>
                <div className="h-[calc(78vh-110px)] overflow-y-auto">
                  {leftMode === "adminInbox" && actor.role === "ADMIN" ? (
                    <div className="space-y-2 p-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={adminInboxCategory}
                          onChange={e =>
                            setAdminInboxCategory(
                              e.target.value as "ALL" | "EXERCISE" | "CLASSROOM_PROJECT"
                            )
                          }
                          className="h-8 w-full rounded-lg border border-black/10 px-2 text-xs dark:border-white/10 dark:bg-zinc-900"
                        >
                          <option value="ALL">全部类型</option>
                          <option value="EXERCISE">习题提交</option>
                          <option value="CLASSROOM_PROJECT">课堂创作提交</option>
                        </select>
                        <button
                          type="button"
                          onClick={markAllAdminNotificationsRead}
                          className="shrink-0 rounded-lg border border-black/10 px-2 py-1 text-[11px] text-zinc-600 dark:border-white/10 dark:text-zinc-300"
                        >
                          全部已读
                        </button>
                      </div>
                      {loadingAdminInbox ? (
                        <div className="px-1 py-2 text-xs text-zinc-500 dark:text-zinc-400">加载中...</div>
                      ) : adminInbox.length === 0 ? (
                        <div className="px-1 py-2 text-xs text-zinc-500 dark:text-zinc-400">暂无提交通知</div>
                      ) : (
                        adminInbox.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setActiveAdminNotificationId(item.id)
                              if (!item.isRead) void markAdminNotificationRead(item.id)
                            }}
                            className={`w-full rounded-xl border px-3 py-2 text-left text-xs ${
                              item.id === activeAdminNotificationId
                                ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                                : item.isRead
                                  ? "border-black/10 text-zinc-700 dark:border-white/10 dark:text-zinc-200"
                                  : "border-amber-300 bg-amber-50 text-zinc-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-white"
                            }`}
                          >
                            <div className="font-semibold">{item.title}</div>
                            <div className="mt-1">
                              {item.category === "EXERCISE" ? "习题提交" : "课堂创作提交"}
                            </div>
                            <div className="mt-1 line-clamp-1 opacity-80">{item.content}</div>
                          </button>
                        ))
                      )}
                    </div>
                  ) : leftMode === "broadcast" && actor.role === "ADMIN" ? (
                    <div className="space-y-3 p-3">
                      <div>
                        <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">推送对象</div>
                        <select
                          value={broadcastTargetType}
                          onChange={e => setBroadcastTargetType(e.target.value as "ALL" | "CLASS" | "STUDENT")}
                          className="h-9 w-full rounded-lg border border-black/10 px-2 text-xs dark:border-white/10 dark:bg-zinc-900"
                        >
                          <option value="ALL">全体学生</option>
                          <option value="CLASS">按班级</option>
                          <option value="STUDENT">单个学生</option>
                        </select>
                      </div>

                      {broadcastTargetType === "CLASS" ? (
                        <div>
                          <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">班级</div>
                          <select
                            value={broadcastClassName}
                            onChange={e => setBroadcastClassName(e.target.value)}
                            className="h-9 w-full rounded-lg border border-black/10 px-2 text-xs dark:border-white/10 dark:bg-zinc-900"
                          >
                            <option value="">请选择班级</option>
                            {classNames.map(name => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      {broadcastTargetType === "STUDENT" ? (
                        <div>
                          <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">学生</div>
                          <select
                            value={broadcastStudentId}
                            onChange={e => setBroadcastStudentId(e.target.value)}
                            className="h-9 w-full rounded-lg border border-black/10 px-2 text-xs dark:border-white/10 dark:bg-zinc-900"
                          >
                            <option value="">请选择学生</option>
                            {students.map(item => (
                              <option key={item.id} value={item.id}>
                                {item.nickname} {item.className ? `(${item.className})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      <div>
                        <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">标题</div>
                        <input
                          value={broadcastTitle}
                          onChange={e => setBroadcastTitle(e.target.value)}
                          className="h-9 w-full rounded-lg border border-black/10 px-2 text-xs dark:border-white/10 dark:bg-zinc-900"
                          placeholder="例如：本周作业提醒"
                        />
                      </div>

                      <div>
                        <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">内容</div>
                        <textarea
                          value={broadcastContent}
                          onChange={e => setBroadcastContent(e.target.value)}
                          rows={5}
                          className="w-full rounded-lg border border-black/10 px-2 py-2 text-xs dark:border-white/10 dark:bg-zinc-900"
                          placeholder="请输入推送内容"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={sendBroadcast}
                        disabled={broadcastSending}
                        className="h-9 w-full rounded-lg bg-zinc-950 text-xs font-bold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-950"
                      >
                        {broadcastSending ? "发送中..." : "发送消息"}
                      </button>
                      {broadcastResult ? (
                        <div className="text-xs text-zinc-600 dark:text-zinc-300">{broadcastResult}</div>
                      ) : null}
                    </div>
                  ) : leftMode === "students" && actor.role === "ADMIN" ? (
                    loadingStudents ? (
                      <div className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">加载学生中...</div>
                    ) : studentsByClass.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">暂无学生</div>
                    ) : (
                      <div className="space-y-3 p-3">
                        {studentsByClass.map(group => (
                          <div key={group.className}>
                            <div className="px-1 pb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                              {group.className}
                            </div>
                            <div className="space-y-2">
                              {group.students.map(student => {
                                const active = activeThread?.studentId === student.id
                                return (
                                  <button
                                    key={student.id}
                                    type="button"
                                    onClick={() => openStudentChat(student)}
                                    className={`w-full rounded-xl border px-3 py-2 text-left text-xs ${
                                      active
                                        ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                                        : "border-black/10 text-zinc-700 dark:border-white/10 dark:text-zinc-200"
                                    }`}
                                  >
                                    <div className="font-semibold">{student.nickname}</div>
                                    <div className="mt-1 opacity-80">点击进入聊天</div>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : leftMode === "notifications" && actor.role === "STUDENT" ? (
                    loadingNotifications ? (
                      <div className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">加载通知中...</div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">暂无通知</div>
                    ) : (
                      <div className="space-y-2 p-3">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={markAllNotificationsRead}
                            className="rounded-lg border border-black/10 px-2 py-1 text-[11px] text-zinc-600 dark:border-white/10 dark:text-zinc-300"
                          >
                            全部已读
                          </button>
                        </div>
                        {notifications.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => onNotificationClick(item)}
                            className={`w-full rounded-xl border px-3 py-2 text-left text-xs ${
                              item.id === activeNotificationId
                                ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                                : item.isRead
                                  ? "border-black/10 text-zinc-600 dark:border-white/10 dark:text-zinc-300"
                                  : "border-rose-300 bg-rose-50 text-zinc-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-white"
                            }`}
                          >
                            <div className="font-semibold">{item.title}</div>
                            <div className="mt-1 line-clamp-2 opacity-90">{item.content}</div>
                            <div className="mt-1 text-[10px] opacity-70">
                              {fmtTime(item.createdAt)} {item.isRead ? "· 已读" : "· 未读"}
                            </div>
                          </button>
                        ))}
                      </div>
                    )
                  ) : loadingThreads ? (
                    <div className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">加载会话中...</div>
                  ) : threads.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">暂无会话</div>
                  ) : (
                    <div className="space-y-2 p-3">
                      {threads.map(thread => (
                        <button
                          key={thread.id}
                          type="button"
                          onClick={() => setActiveThreadId(thread.id)}
                          className={`w-full rounded-xl border px-3 py-2 text-left text-xs ${
                            thread.id === activeThreadId
                              ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                              : "border-black/10 text-zinc-700 dark:border-white/10 dark:text-zinc-200"
                          }`}
                        >
                          <div className="font-semibold">
                            {actor.role === "STUDENT" ? "老师" : thread.studentNickname}
                            {thread.unreadCount > 0 ? ` · 未读${thread.unreadCount}` : ""}
                          </div>
                          <div className="mt-1 line-clamp-1 opacity-80">{thread.lastMessagePreview ?? "暂无消息"}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </aside>

              {leftMode === "threads" ? (
                <div className="grid min-h-0 grid-rows-[1fr_auto]">
                  <div ref={listRef} className="overflow-y-auto px-4 py-3">
                    {loadingMessages ? (
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">加载消息中...</div>
                    ) : messages.length === 0 ? (
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">先发一条消息吧。</div>
                    ) : (
                      <div className="space-y-2">
                        {messages.map(msg => {
                          const mine =
                            (actor.role === "STUDENT" && msg.senderRole === "STUDENT") ||
                            (actor.role === "ADMIN" && msg.senderRole === "ADMIN")
                          return (
                            <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                              <div
                                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                                  mine
                                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                                    : "border border-black/10 bg-zinc-50 text-zinc-800 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-100"
                                }`}
                              >
                                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                                <div
                                  className={`mt-1 text-[10px] ${
                                    mine
                                      ? "text-white/70 dark:text-zinc-600"
                                      : "text-zinc-500 dark:text-zinc-400"
                                  }`}
                                >
                                  {fmtTime(msg.createdAt)}
                                  {mine ? (
                                    <span className="ml-2">
                                      {actor.role === "STUDENT"
                                        ? msg.readByAdminAt
                                          ? "已读"
                                          : "未读"
                                        : msg.readByStudentAt
                                          ? "已读"
                                          : "未读"}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-black/10 px-4 py-3 dark:border-white/10">
                    {error ? <div className="mb-2 text-xs text-red-600 dark:text-red-300">{error}</div> : null}
                    {wsDown ? (
                      <div className="mb-2 text-xs text-amber-600 dark:text-amber-300">
                        聊天实时连接不可用，已切换为轮询刷新。
                      </div>
                    ) : null}
                    <div className="flex items-end gap-2">
                      <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            sendMessage()
                          }
                        }}
                        placeholder="输入消息，Enter发送，Shift+Enter换行"
                        rows={2}
                        className="min-h-10 w-full min-w-0 resize-y rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/60"
                      />
                      <button
                        type="button"
                        onClick={sendMessage}
                        disabled={!activeThreadId || sending || !text.trim()}
                        className="h-10 min-w-[72px] shrink-0 whitespace-nowrap rounded-xl bg-zinc-950 px-4 text-sm font-bold text-white [text-orientation:mixed] [writing-mode:horizontal-tb] disabled:opacity-40 dark:bg-white dark:text-zinc-950"
                      >
                        发送
                      </button>
                    </div>
                  </div>
                </div>
              ) : leftMode === "notifications" && actor.role === "STUDENT" ? (
                <div className="min-h-0 overflow-y-auto px-5 py-4">
                  {!activeNotification ? (
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">请选择左侧一条通知查看详情。</div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                          {activeNotification.title}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {fmtTime(activeNotification.createdAt)} · {activeNotification.isRead ? "已读" : "未读"}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4 text-sm whitespace-pre-wrap break-words text-zinc-800 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-200">
                        {activeNotification.content}
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => openNotificationTarget(activeNotification)}
                          className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-zinc-950"
                        >
                          前往详情
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : leftMode === "adminInbox" && actor.role === "ADMIN" ? (
                <div className="min-h-0 overflow-y-auto px-5 py-4">
                  {!activeAdminNotification ? (
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">请选择左侧一条提交通知查看详情。</div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                          {activeAdminNotification.title}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {activeAdminNotification.category === "EXERCISE" ? "习题提交" : "课堂创作提交"} · {fmtTime(activeAdminNotification.createdAt)} · {activeAdminNotification.isRead ? "已读" : "未读"}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4 text-sm whitespace-pre-wrap break-words text-zinc-800 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-200">
                        {activeAdminNotification.content}
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => openAdminNotificationTarget(activeAdminNotification)}
                          className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-zinc-950"
                        >
                          去批改
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="min-h-0 overflow-y-auto px-5 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                  请在左侧选择一个会话或功能。
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
