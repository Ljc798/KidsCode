import type { Server as HttpServer } from "node:http"
import { WebSocketServer, WebSocket } from "ws"
import {
  createThreadMessage,
  canAccessThread,
  markThreadRead,
  resolveChatActorFromHeaders,
  type ChatActor
} from "./lib/chat"

type ChatWsState = {
  actor: ChatActor
  subscribedThreadId: string | null
}

type WsWithState = WebSocket & { __chatState?: ChatWsState }

const threadSockets = new Map<string, Set<WsWithState>>()

function safeSend(ws: WebSocket, payload: unknown) {
  if (ws.readyState !== WebSocket.OPEN) return
  ws.send(JSON.stringify(payload))
}

function joinThread(ws: WsWithState, threadId: string) {
  const prev = ws.__chatState?.subscribedThreadId
  if (prev) {
    const set = threadSockets.get(prev)
    if (set) {
      set.delete(ws)
      if (set.size === 0) threadSockets.delete(prev)
    }
  }

  let set = threadSockets.get(threadId)
  if (!set) {
    set = new Set()
    threadSockets.set(threadId, set)
  }
  set.add(ws)
  if (ws.__chatState) ws.__chatState.subscribedThreadId = threadId
}

function leaveCurrent(ws: WsWithState) {
  const current = ws.__chatState?.subscribedThreadId
  if (!current) return
  const set = threadSockets.get(current)
  if (set) {
    set.delete(ws)
    if (set.size === 0) threadSockets.delete(current)
  }
  if (ws.__chatState) ws.__chatState.subscribedThreadId = null
}

function broadcastThread(threadId: string, payload: unknown) {
  const set = threadSockets.get(threadId)
  if (!set) return
  for (const ws of set) {
    safeSend(ws, payload)
  }
}

export function attachChatWs(server: HttpServer) {
  const wss = new WebSocketServer({
    server,
    path: "/ws/chat"
  })

  wss.on("connection", (ws: WsWithState, req: any) => {
    const actor = resolveChatActorFromHeaders(req.headers)
    if (!actor) {
      safeSend(ws, { type: "error", error: "unauthorized" })
      ws.close(1008, "unauthorized")
      return
    }

    ws.__chatState = { actor, subscribedThreadId: null }
    safeSend(ws, {
      type: "ready",
      role: actor.role,
      ...(actor.role === "STUDENT" ? { studentId: actor.studentId } : { adminUserId: actor.adminUserId })
    })

    ws.on("message", async (raw: any) => {
      let data: any
      try {
        data = JSON.parse(String(raw))
      } catch {
        safeSend(ws, { type: "error", error: "invalid json" })
        return
      }

      if (!ws.__chatState) return
      const currentActor = ws.__chatState.actor

      if (data?.type === "ping") {
        safeSend(ws, { type: "pong" })
        return
      }

      if (data?.type === "subscribe") {
        const threadId = typeof data.threadId === "string" ? data.threadId.trim() : ""
        if (!threadId) {
          safeSend(ws, { type: "error", error: "invalid thread id" })
          return
        }
        const thread = await canAccessThread(currentActor, threadId)
        if (!thread) {
          safeSend(ws, { type: "error", error: "thread not found" })
          return
        }
        joinThread(ws, threadId)
        await markThreadRead(currentActor, threadId)
        safeSend(ws, { type: "subscribed", threadId })
        return
      }

      if (data?.type === "send") {
        const threadId = typeof data.threadId === "string" ? data.threadId.trim() : ""
        const content = typeof data.content === "string" ? data.content : ""
        if (!threadId || !content.trim()) {
          safeSend(ws, { type: "error", error: "invalid payload" })
          return
        }

        const message = await createThreadMessage(currentActor, threadId, content)
        if (!message) {
          safeSend(ws, { type: "error", error: "thread not found" })
          return
        }

        broadcastThread(threadId, { type: "message", threadId, message })
        return
      }
    })

    ws.on("close", () => {
      leaveCurrent(ws)
    })
  })

  return wss
}
