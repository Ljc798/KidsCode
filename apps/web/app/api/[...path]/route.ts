import { NextResponse } from "next/server"

export const runtime = "nodejs"

function applySetCookie(res: NextResponse, cookie: string) {
  // Prefer Next's cookie API to ensure compatibility across runtimes.
  // Fallback to raw header append if parsing fails.
  try {
    const parts = cookie.split(";").map(p => p.trim()).filter(Boolean)
    const [nameValue, ...attrs] = parts
    const eq = nameValue.indexOf("=")
    if (eq <= 0) throw new Error("invalid cookie")
    const name = nameValue.slice(0, eq)
    const value = nameValue.slice(eq + 1)

    const options: Parameters<NextResponse["cookies"]["set"]>[2] = {}
    for (const a of attrs) {
      const [kRaw, vRaw] = a.split("=", 2)
      const k = kRaw.toLowerCase()
      const v = vRaw?.trim()
      if (k === "path" && v) options.path = v
      else if (k === "domain" && v) options.domain = v
      else if (k === "max-age" && v && Number.isFinite(Number(v))) {
        options.maxAge = Number(v)
      } else if (k === "expires" && v) {
        const d = new Date(v)
        if (!Number.isNaN(d.getTime())) options.expires = d
      } else if (k === "httponly") options.httpOnly = true
      else if (k === "secure") options.secure = true
      else if (k === "samesite" && v) {
        const vv = v.toLowerCase()
        if (vv === "lax" || vv === "strict" || vv === "none") {
          options.sameSite = vv
        }
      }
    }

    res.cookies.set(name, value, options)
  } catch {
    res.headers.append("set-cookie", cookie)
  }
}

function errorResponse(
  message: string,
  status = 502,
  extra?: Record<string, unknown>
) {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status })
}

function targetBase() {
  // Prefer `localhost` over `127.0.0.1` to avoid environment-specific loopback quirks.
  return process.env.API_PROXY_TARGET ?? "http://localhost:3001"
}

function buildTargetUrl(pathname: string, search: string) {
  // Incoming route is `/api/<rest>`.
  const rest = pathname.replace(/^\/api/, "")
  return `${targetBase()}${rest}${search}`
}

async function proxy(req: Request) {
  let upstream = ""
  try {
    const url = new URL(req.url)
    upstream = buildTargetUrl(url.pathname, url.search)

    const headers = new Headers(req.headers)
    // Avoid hop-by-hop headers that can confuse upstream.
    headers.delete("host")
    headers.delete("connection")
    headers.delete("content-length")

    const body =
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : await req.arrayBuffer()

    const upstreamRes = await fetch(upstream, {
      method: req.method,
      headers,
      body,
      redirect: "manual"
    })

    const resBody = await upstreamRes.arrayBuffer()
    const res = new NextResponse(resBody, { status: upstreamRes.status })

    // Copy important headers.
    const passHeaders = [
      "content-type",
      "content-disposition",
      "content-length",
      "content-encoding",
      "cache-control",
      "location",
      "vary",
      "content-language",
      "accept-ranges",
      "etag",
      "last-modified"
    ]
    for (const h of passHeaders) {
      const v = upstreamRes.headers.get(h)
      if (v) res.headers.set(h, v)
    }

    // Forward Set-Cookie (login/logout).
    type HeadersWithGetSetCookie = Headers & {
      getSetCookie?: (this: Headers) => string[]
    }
    const getSetCookie = (upstreamRes.headers as HeadersWithGetSetCookie).getSetCookie
    const cookies: string[] = getSetCookie
      ? // Some runtimes expose `getSetCookie()` which must be called with the
        // Headers instance as `this` (otherwise it throws "Illegal invocation").
        getSetCookie.call(upstreamRes.headers)
      : upstreamRes.headers.get("set-cookie")
        ? [upstreamRes.headers.get("set-cookie")!]
        : []
    for (const c of cookies) applySetCookie(res, c)

    return res
  } catch (e) {
    console.error("API proxy error:", e)
    const dev =
      process.env.NODE_ENV !== "production" &&
      process.env.API_PROXY_DEBUG !== "0"
    const message = e instanceof Error ? e.message : String(e)
    return errorResponse("API proxy failed", 502, dev ? { upstream, message } : undefined)
  }
}

export async function GET(req: Request) {
  return await proxy(req)
}
export async function POST(req: Request) {
  return await proxy(req)
}
export async function PATCH(req: Request) {
  return await proxy(req)
}
export async function PUT(req: Request) {
  return await proxy(req)
}
export async function DELETE(req: Request) {
  return await proxy(req)
}
