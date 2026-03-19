type AdminPayload = {
  sub: string
  role: "ADMIN"
  iat: number
  exp: number
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function base64UrlEncode(bytes: Uint8Array) {
  // Prefer btoa/atob (Edge), fallback to Buffer (Node).
  let base64: string
  if (typeof btoa === "function") {
    let s = ""
    for (const b of bytes) s += String.fromCharCode(b)
    base64 = btoa(s)
  } else {
    base64 = Buffer.from(bytes).toString("base64")
  }
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function base64UrlDecodeToBytes(input: string) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64 + "===".slice((base64.length + 3) % 4)
  if (typeof atob === "function") {
    const bin = atob(padded)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
  }
  return new Uint8Array(Buffer.from(padded, "base64"))
}

function getSecret() {
  return encoder.encode(process.env.ADMIN_JWT_SECRET ?? "dev-insecure-secret")
}

async function hmacSha256(data: Uint8Array) {
  const key = await crypto.subtle.importKey(
    "raw",
    getSecret(),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  )
  // `crypto.subtle.sign` expects an ArrayBuffer; make a plain ArrayBuffer copy to
  // satisfy TypeScript across different lib.dom definitions.
  const sig = await crypto.subtle.sign("HMAC", key, Uint8Array.from(data).buffer)
  return new Uint8Array(sig)
}

export async function signAdminToken(userId: string, ttlSeconds: number) {
  const now = Math.floor(Date.now() / 1000)
  const payload: AdminPayload = {
    sub: userId,
    role: "ADMIN",
    iat: now,
    exp: now + ttlSeconds
  }
  const payloadBytes = encoder.encode(JSON.stringify(payload))
  const payloadPart = base64UrlEncode(payloadBytes)
  const sig = await hmacSha256(payloadBytes)
  const sigPart = base64UrlEncode(sig)
  return `${payloadPart}.${sigPart}`
}

export async function verifyAdminToken(token: string) {
  const parts = token.split(".")
  if (parts.length !== 2) return null
  const [payloadPart, sigPart] = parts
  try {
    const payloadBytes = base64UrlDecodeToBytes(payloadPart)
    const expectedSig = await hmacSha256(payloadBytes)
    const actualSig = base64UrlDecodeToBytes(sigPart)

    if (expectedSig.length !== actualSig.length) return null
    // Constant-time compare
    let diff = 0
    for (let i = 0; i < expectedSig.length; i++) diff |= expectedSig[i] ^ actualSig[i]
    if (diff !== 0) return null

    const payload = JSON.parse(decoder.decode(payloadBytes)) as Partial<AdminPayload>
    if (payload.role !== "ADMIN") return null
    if (typeof payload.sub !== "string" || !payload.sub) return null
    if (typeof payload.exp !== "number") return null
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null

    return { userId: payload.sub }
  } catch {
    return null
  }
}
