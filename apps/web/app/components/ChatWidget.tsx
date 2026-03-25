"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { apiFetch } from "@/app/lib/api"

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
}

type StudentItem = {
  id: string
  nickname: string
  className: string | null
}

type LeftMode = "threads" | "students"

function buildWsUrl() {
  const explicit = process.env.NEXT_PUBLIC_CHAT_WS_URL
  if (explicit) return explicit

  if (typeof window === "undefined") return ""
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
  const [studentsLoaded, setStudentsLoaded] = useState(false)
  const [students, setStudents] = useState<StudentItem[]>([])
  const [leftMode, setLeftMode] = useState<LeftMode>("threads")
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const heartbeatRef = useRef<number | null>(null)

  const activeThread = useMemo(
    () => threads.find(t => t.id === activeThreadId) ?? null,
    [activeThreadId, threads]
  )

  const totalUnread = useMemo(
    () => threads.reduce((sum, thread) => sum + thread.unreadCount, 0),
    [threads]
  )

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
    if (!open || actor?.role !== "ADMIN" || leftMode !== "students" || studentsLoaded) return
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
    if (!open || !activeThreadId) return
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
  }, [open, activeThreadId])

  useEffect(() => {
    if (!open || !actor) return
    const ws = new WebSocket(buildWsUrl())
    wsRef.current = ws

    ws.onopen = () => {
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
    }

    ws.onerror = () => {
      setError("聊天连接异常，正在尝试恢复。")
    }

    ws.onclose = () => {
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }
    }

    return () => {
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }
      ws.close()
      wsRef.current = null
    }
  }, [open, actor, activeThreadId])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, open])

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
        className="fixed bottom-5 right-5 z-40 inline-flex h-14 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-xl hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
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
                  {activeThread
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
                </div>
              </aside>

              <aside className="hidden border-r border-black/10 md:block dark:border-white/10">
                <div className="border-b border-black/10 px-4 py-3 text-sm font-bold text-zinc-900 dark:border-white/10 dark:text-zinc-100">
                  {leftMode === "students" ? "学生列表（按班级）" : actor.role === "ADMIN" ? "会话列表" : "联系老师"}
                </div>
                <div className="h-[calc(78vh-110px)] overflow-y-auto">
                  {leftMode === "students" && actor.role === "ADMIN" ? (
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
                            {thread.studentNickname}
                            {thread.unreadCount > 0 ? ` · 未读${thread.unreadCount}` : ""}
                          </div>
                          <div className="mt-1 line-clamp-1 opacity-80">{thread.lastMessagePreview ?? "暂无消息"}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </aside>

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
                  <div className="flex items-center gap-2">
                    <input
                      value={text}
                      onChange={e => setText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                      placeholder="输入消息，回车发送"
                      className="h-10 w-full min-w-0 rounded-xl border border-black/10 px-3 text-sm outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/60"
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
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
