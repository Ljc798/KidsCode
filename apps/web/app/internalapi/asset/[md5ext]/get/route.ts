import { NextResponse } from "next/server"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

export const runtime = "nodejs"

const ENV_UPSTREAMS = (process.env.SCRATCH_ASSET_UPSTREAMS || "")
  .split(",")
  .map(item => item.trim().replace(/\/+$/, ""))
  .filter(Boolean)
const INTERNAL_API_UPSTREAMS = ENV_UPSTREAMS.length > 0 ? ENV_UPSTREAMS : []
const DIRECT_FILE_UPSTREAMS = INTERNAL_API_UPSTREAMS
const CACHE_DIR = path.join(process.cwd(), ".next", "cache", "scratch-assets")
const LOCAL_STATIC_ASSET_DIR = path.join(process.cwd(), "public", "scratch-gui", "static", "assets")

function contentTypeByExt(name: string) {
  const ext = name.toLowerCase().split(".").pop() || ""
  if (ext === "svg") return "image/svg+xml"
  if (ext === "png") return "image/png"
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg"
  if (ext === "wav") return "audio/wav"
  if (ext === "mp3") return "audio/mpeg"
  if (ext === "webp") return "image/webp"
  if (ext === "json") return "application/json"
  return "application/octet-stream"
}

async function fetchAsset(md5ext: string) {
  // Prefer local static assets shipped with the project.
  try {
    const localBuffer = await readFile(path.join(LOCAL_STATIC_ASSET_DIR, md5ext))
    return {
      ok: true as const,
      data: localBuffer.buffer.slice(
        localBuffer.byteOffset,
        localBuffer.byteOffset + localBuffer.byteLength
      ),
      contentType: contentTypeByExt(md5ext),
      etag: null
    }
  } catch {
    // local miss
  }

  if (INTERNAL_API_UPSTREAMS.length === 0) {
    return { ok: false as const, error: "no upstream configured (set SCRATCH_ASSET_UPSTREAMS)" }
  }

  const internalApiPath = `/internalapi/asset/${encodeURIComponent(md5ext)}/get/`
  const directPath = `/${encodeURIComponent(md5ext)}`
  let lastError = "asset fetch failed"

  const targets = [
    ...INTERNAL_API_UPSTREAMS.map(host => `${host}${internalApiPath}`),
    ...DIRECT_FILE_UPSTREAMS.map(host => `${host}${directPath}`)
  ]

  for (const target of targets) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8_000)
    try {
      const res = await fetch(target, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "user-agent": "KidsCode-Scratch-Asset-Proxy/1.0"
        }
      })

      if (!res.ok) {
        lastError = `${target} -> ${res.status}`
        continue
      }

      const data = await res.arrayBuffer()
      return {
        ok: true as const,
        data,
        contentType: res.headers.get("content-type") || contentTypeByExt(md5ext),
        etag: res.headers.get("etag")
      }
    } catch (err: unknown) {
      lastError = `${target} -> ${err instanceof Error ? err.message : String(err)}`
    } finally {
      clearTimeout(timer)
    }
  }

  return { ok: false as const, error: lastError }
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ md5ext: string }> }
) {
  const { md5ext } = await ctx.params
  if (!md5ext || !/^[a-f0-9]+\.[a-z0-9]+$/i.test(md5ext)) {
    return NextResponse.json({ error: "invalid asset id" }, { status: 400 })
  }

  const cacheFile = path.join(CACHE_DIR, md5ext)
  try {
    const cached = await readFile(cacheFile)
    const res = new NextResponse(cached, { status: 200 })
    res.headers.set("content-type", contentTypeByExt(md5ext))
    res.headers.set("cache-control", "public, max-age=31536000, immutable")
    return res
  } catch {
    // cache miss
  }

  const result = await fetchAsset(md5ext)
  if (!result.ok) {
    return NextResponse.json(
      { error: "asset unavailable", detail: result.error },
      { status: 502 }
    )
  }

  const res = new NextResponse(result.data, { status: 200 })
  res.headers.set("content-type", result.contentType)
  res.headers.set("cache-control", "public, max-age=31536000, immutable")
  if (result.etag) res.headers.set("etag", result.etag)

  try {
    await mkdir(path.dirname(cacheFile), { recursive: true })
    await writeFile(cacheFile, new Uint8Array(result.data))
  } catch {
    // ignore cache write failures
  }

  return res
}
