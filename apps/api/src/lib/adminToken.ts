import crypto from "node:crypto"

const secret = () => process.env.ADMIN_JWT_SECRET ?? "dev-insecure-secret"

const base64UrlEncode = (buf: Buffer) =>
  buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")

const base64UrlDecode = (input: string) => {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64 + "===".slice((base64.length + 3) % 4)
  return Buffer.from(padded, "base64")
}

export function signAdminToken(userId: string, ttlSeconds: number) {
  const now = Math.floor(Date.now() / 1000)
  const payloadBytes = Buffer.from(
    JSON.stringify({ sub: userId, role: "ADMIN", iat: now, exp: now + ttlSeconds }),
    "utf8"
  )
  const payloadPart = base64UrlEncode(payloadBytes)
  const sig = crypto.createHmac("sha256", secret()).update(payloadBytes).digest()
  const sigPart = base64UrlEncode(sig)
  return `${payloadPart}.${sigPart}`
}

export function verifyAdminToken(token: string) {
  const parts = token.split(".")
  if (parts.length !== 2) return null
  const [payloadPart, sigPart] = parts
  try {
    const payloadBytes = base64UrlDecode(payloadPart)
    const expected = crypto.createHmac("sha256", secret()).update(payloadBytes).digest()
    const actual = base64UrlDecode(sigPart)
    if (expected.length !== actual.length) return null
    if (!crypto.timingSafeEqual(expected, actual)) return null

    const payload = JSON.parse(payloadBytes.toString("utf8")) as any
    const now = Math.floor(Date.now() / 1000)
    if (payload?.role !== "ADMIN") return null
    if (typeof payload?.sub !== "string" || !payload.sub) return null
    if (typeof payload?.exp !== "number" || payload.exp <= now) return null
    return { userId: payload.sub as string }
  } catch {
    return null
  }
}

export function getTokenFromRequest(req: {
  headers: { cookie?: unknown; authorization?: unknown }
}) {
  const auth = typeof req.headers.authorization === "string" ? req.headers.authorization : ""
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim()

  const cookie = typeof req.headers.cookie === "string" ? req.headers.cookie : ""
  return cookie
    .split(";")
    .map(s => s.trim())
    .find(s => s.startsWith("kidscode_admin="))
    ?.slice("kidscode_admin=".length)
}

