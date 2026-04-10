import { Router } from "express"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { getSignedDownloadUrl } from "../lib/objectStorage"

const router = Router()

type MaterialKind = "SCRATCH" | "CPP" | "ZIP"

type TeachingMaterial = {
  id: string
  kind: MaterialKind
  title: string
  description: string | null
  weekTag: string | null
  cppCode: string | null
  fileName: string | null
  mimeType: string | null
  size: number | null
  objectKey: string | null
  createdAt: string
  updatedAt: string
}

const DATA_FILE = path.resolve(process.cwd(), "data", "teaching-materials.json")

const asString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

async function readStore() {
  try {
    const raw = await readFile(DATA_FILE, "utf8")
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [] as TeachingMaterial[]
    return parsed.filter(item => item && typeof item === "object") as TeachingMaterial[]
  } catch {
    return [] as TeachingMaterial[]
  }
}

router.get("/", async (_req, res) => {
  const items = await readStore()
  items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  return res.json({
    ok: true,
    items: items.map(item => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      description: item.description,
      weekTag: item.weekTag,
      cppCode: item.cppCode,
      fileName: item.fileName,
      mimeType: item.mimeType,
      size: item.size,
      hasDownload: !!item.objectKey,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }))
  })
})

router.get("/:id/download", async (req, res) => {
  const id = asString(req.params.id)
  if (!id) return res.status(400).json({ error: "invalid id" })

  const items = await readStore()
  const found = items.find(item => item.id === id)
  if (!found) return res.status(404).json({ error: "material not found" })
  if (!found.objectKey) return res.status(400).json({ error: "download is not available" })

  const signedUrl = getSignedDownloadUrl(found.objectKey)
  const upstream = await fetch(signedUrl)
  if (!upstream.ok) {
    return res.status(502).json({ error: "failed to fetch file from object storage" })
  }

  const body = Buffer.from(await upstream.arrayBuffer())
  const contentType = found.mimeType || upstream.headers.get("content-type") || "application/octet-stream"
  res.setHeader("content-type", contentType)
  res.setHeader("cache-control", "private, no-store")
  if (found.fileName) {
    res.setHeader(
      "content-disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(found.fileName)}`
    )
  }

  return res.status(200).send(body)
})

router.get("/:id/download-url", async (req, res) => {
  const id = asString(req.params.id)
  if (!id) return res.status(400).json({ error: "invalid id" })

  const items = await readStore()
  const found = items.find(item => item.id === id)
  if (!found) return res.status(404).json({ error: "material not found" })
  if (!found.objectKey) return res.status(400).json({ error: "download is not available" })

  const url = getSignedDownloadUrl(found.objectKey)
  return res.json({ ok: true, url })
})

router.get("/:id", async (req, res) => {
  const id = asString(req.params.id)
  if (!id) return res.status(400).json({ error: "invalid id" })

  const items = await readStore()
  const found = items.find(item => item.id === id)
  if (!found) return res.status(404).json({ error: "material not found" })

  return res.json({
    ok: true,
    item: {
      id: found.id,
      kind: found.kind,
      title: found.title,
      description: found.description,
      weekTag: found.weekTag,
      cppCode: found.cppCode,
      fileName: found.fileName,
      mimeType: found.mimeType,
      size: found.size,
      hasDownload: !!found.objectKey,
      createdAt: found.createdAt,
      updatedAt: found.updatedAt
    }
  })
})

export default router
