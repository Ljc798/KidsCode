import { Router } from "express"
import { randomUUID } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { requireAdmin } from "../middleware/requireAdmin"
import {
  createTeachingMaterialObjectKey,
  getSignedDownloadUrl,
  uploadObject
} from "../lib/objectStorage"

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
  bucket: string | null
  storageProvider: string | null
  createdAt: string
  updatedAt: string
}

const DATA_DIR = path.resolve(process.cwd(), "data")
const DATA_FILE = path.join(DATA_DIR, "teaching-materials.json")

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

async function writeStore(items: TeachingMaterial[]) {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(DATA_FILE, JSON.stringify(items, null, 2), "utf8")
}

function decodeDataUrl(input: string) {
  const match = input.match(/^data:([^;,]+)?;base64,(.+)$/)
  if (!match) throw new Error("content must be a base64 data URL")
  return {
    mimeType: match[1] || "application/octet-stream",
    buffer: Buffer.from(match[2], "base64")
  }
}

router.use(requireAdmin)

router.get("/", async (_req, res) => {
  const items = await readStore()
  items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  return res.json({ ok: true, items })
})

router.post("/", async (req, res) => {
  const kind: MaterialKind | null =
    req.body?.kind === "SCRATCH" || req.body?.kind === "CPP" || req.body?.kind === "ZIP"
      ? req.body.kind
      : null
  const title = asString(req.body?.title)
  const descriptionRaw = asString(req.body?.description)
  const weekTagRaw = asString(req.body?.weekTag)
  const cppCodeRaw = typeof req.body?.cppCode === "string" ? req.body.cppCode : ""
  const content = typeof req.body?.content === "string" ? req.body.content : ""
  const fileNameRaw = asString(req.body?.fileName)
  const mimeType = asString(req.body?.mimeType)

  if (!kind) return res.status(400).json({ error: "kind must be SCRATCH, CPP or ZIP" })
  if (!title) return res.status(400).json({ error: "title is required" })

  let cppCode: string | null = null
  let uploadedMeta: {
    fileName: string
    mimeType: string
    size: number
    objectKey: string
    bucket: string
    storageProvider: string
  } | null = null

  if (kind === "CPP") {
    const normalized = cppCodeRaw.trim()
    if (!normalized) return res.status(400).json({ error: "cppCode is required for CPP material" })
    cppCode = cppCodeRaw
  } else {
    const fileTypeLabel = kind === "ZIP" ? "ZIP" : "SCRATCH"
    if (!content) return res.status(400).json({ error: `content is required for ${fileTypeLabel} material` })
    if (!fileNameRaw) return res.status(400).json({ error: `fileName is required for ${fileTypeLabel} material` })
    if (kind === "ZIP" && !fileNameRaw.toLowerCase().endsWith(".zip")) {
      return res.status(400).json({ error: "ZIP material fileName must end with .zip" })
    }
    const decoded = decodeDataUrl(content)
    const objectKey = createTeachingMaterialObjectKey({
      kind,
      title,
      fileName: fileNameRaw,
      weekTag: weekTagRaw || null
    })
    const uploaded = await uploadObject({
      key: objectKey,
      body: decoded.buffer,
      contentType: mimeType || decoded.mimeType
    })
    uploadedMeta = {
      fileName: fileNameRaw,
      mimeType: mimeType || decoded.mimeType,
      size: uploaded.size,
      objectKey: uploaded.key,
      bucket: uploaded.bucket,
      storageProvider: uploaded.provider
    }
  }

  const now = new Date().toISOString()
  const item: TeachingMaterial = {
    id: randomUUID(),
    kind,
    title,
    description: descriptionRaw || null,
    weekTag: weekTagRaw || null,
    cppCode,
    fileName: uploadedMeta?.fileName ?? null,
    mimeType: uploadedMeta?.mimeType ?? null,
    size: uploadedMeta?.size ?? null,
    objectKey: uploadedMeta?.objectKey ?? null,
    bucket: uploadedMeta?.bucket ?? null,
    storageProvider: uploadedMeta?.storageProvider ?? null,
    createdAt: now,
    updatedAt: now
  }

  const items = await readStore()
  items.unshift(item)
  await writeStore(items)
  return res.json({ ok: true, item })
})

router.get("/:id/download-url", async (req, res) => {
  const id = asString(req.params.id)
  if (!id) return res.status(400).json({ error: "invalid id" })

  const items = await readStore()
  const found = items.find(item => item.id === id)
  if (!found) return res.status(404).json({ error: "material not found" })
  if (!found.objectKey) {
    return res.status(400).json({ error: "download is not available for this item" })
  }

  const url = getSignedDownloadUrl(found.objectKey)
  return res.json({ ok: true, url })
})

router.delete("/:id", async (req, res) => {
  const id = asString(req.params.id)
  if (!id) return res.status(400).json({ error: "invalid id" })

  const items = await readStore()
  const next = items.filter(item => item.id !== id)
  if (next.length === items.length) return res.status(404).json({ error: "material not found" })
  await writeStore(next)
  return res.json({ ok: true })
})

export default router
