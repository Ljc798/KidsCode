declare module "ws" {
  export class WebSocket {
    static OPEN: number
    readyState: number
    send(data: string): void
    close(code?: number, reason?: string): void
    on(event: "message", listener: (data: unknown) => void): void
    on(event: "close", listener: () => void): void
    on(event: "error", listener: () => void): void
  }

  export class WebSocketServer {
    constructor(input: { server: unknown; path?: string })
    on(event: "connection", listener: (socket: WebSocket, req: unknown) => void): void
  }
}
