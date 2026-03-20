import { Router } from "express"
import { prisma } from "@kidscode/database"
import { requireStudent } from "../middleware/requireStudent"
import {
  createScratchObjectKey,
  getSignedDownloadUrl,
  uploadObject
} from "../lib/objectStorage"

const router = Router()

router.use(requireStudent)

const asString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

const CONTENT_LIMITS = {
  CPP: 100_000,
  SCRATCH: 25_000_000,
  OTHER: 25_000_000
} as const

type ProjectKind = keyof typeof CONTENT_LIMITS

function decodeDataUrl(input: string) {
  const match = input.match(/^data:([^;,]+)?;base64,(.+)$/)
  if (!match) {
    throw new Error("Scratch content must be a base64 data URL")
  }
  return {
    mimeType: match[1] || "application/octet-stream",
    buffer: Buffer.from(match[2], "base64")
  }
}

router.get("/mine", async (req: any, res) => {
  const studentId = req.studentId as string

  const projects = await prisma.studentProject.findMany({
    where: { studentId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      kind: true,
      title: true,
      uploaderName: true,
      size: true,
      fileName: true,
      mimeType: true,
      content: true,
      bucket: true,
      objectKey: true,
      storageProvider: true,
      createdAt: true,
      updatedAt: true
    }
  })

  res.json({
    ok: true,
    projects: projects.map(project => ({
      id: project.id,
      kind: project.kind,
      title: project.title,
      uploaderName: project.uploaderName,
      fileName: project.fileName,
      mimeType: project.mimeType,
      preview:
        project.kind === "CPP"
          ? (project.content ?? "").slice(0, 180)
          : project.kind === "SCRATCH"
            ? "Scratch 项目已上传到对象存储，可继续管理或后续接入编辑器。"
            : "文件已上传到对象存储，后续可继续补充预览或解析逻辑。",
      size: project.size ?? (project.kind === "CPP" ? (project.content ?? "").length : 0),
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      canDownload: project.kind === "SCRATCH" && !!project.objectKey,
      hasObjectStorage:
        project.kind === "SCRATCH" && !!project.bucket && !!project.objectKey
    }))
  })
})

router.get("/:id/download-url", async (req: any, res) => {
  const studentId = req.studentId as string
  const id = asString(req.params.id)

  if (!id) return res.status(400).json({ error: "invalid id" })

  const project = await prisma.studentProject.findFirst({
    where: {
      id,
      studentId
    },
    select: {
      id: true,
      kind: true,
      objectKey: true
    }
  })

  if (!project) return res.status(404).json({ error: "project not found" })
  if (project.kind !== "SCRATCH" || !project.objectKey) {
    return res.status(400).json({ error: "download is only available for scratch files" })
  }

  const url = getSignedDownloadUrl(project.objectKey)
  return res.json({ ok: true, url })
})

router.post("/", async (req: any, res) => {
  const studentId = req.studentId as string
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { nickname: true }
  })
  const title = asString(req.body?.title)
  const uploaderName = student?.nickname?.trim() ?? ""
  const kind: ProjectKind | null =
    req.body?.kind === "CPP" || req.body?.kind === "SCRATCH" || req.body?.kind === "OTHER"
      ? req.body.kind
      : null
  const content = typeof req.body?.content === "string" ? req.body.content : ""
  const fileNameRaw = req.body?.fileName
  const mimeTypeRaw = req.body?.mimeType
  const fileName = fileNameRaw === undefined ? null : asString(fileNameRaw)
  const mimeType = mimeTypeRaw === undefined ? null : asString(mimeTypeRaw)

  if (!title) return res.status(400).json({ error: "title is required" })
  if (!uploaderName) return res.status(400).json({ error: "uploaderName is required" })
  if (!kind) {
    return res.status(400).json({ error: "kind must be CPP, SCRATCH or OTHER" })
  }
  if (!content) return res.status(400).json({ error: "content is required" })
  if (content.length > CONTENT_LIMITS[kind]) {
    return res.status(400).json({ error: "content is too large" })
  }
  if (kind === "SCRATCH" && !fileName) {
    return res.status(400).json({ error: "fileName is required for scratch" })
  }

  const created =
    kind === "CPP"
      ? await prisma.studentProject.create({
          data: {
            studentId,
            kind,
            title,
            uploaderName,
            content,
            fileName,
            mimeType,
            size: content.length
          },
          select: {
            id: true,
            kind: true,
            title: true,
            uploaderName: true,
            fileName: true,
            mimeType: true,
            size: true,
            bucket: true,
            objectKey: true,
            storageProvider: true,
            createdAt: true,
            updatedAt: true
          }
        })
      : await (async () => {
          const decoded = decodeDataUrl(content)
          const objectKey = createScratchObjectKey(uploaderName, title, fileName)
          const uploaded = await uploadObject({
            key: objectKey,
            body: decoded.buffer,
            contentType: mimeType || decoded.mimeType
          })

          return prisma.studentProject.create({
            data: {
              studentId,
              kind,
              title,
              uploaderName,
              content: null,
              fileName,
              mimeType: mimeType || decoded.mimeType,
              size: uploaded.size,
              bucket: uploaded.bucket,
              objectKey: uploaded.key,
              storageProvider: uploaded.provider
            },
            select: {
              id: true,
              kind: true,
              title: true,
              uploaderName: true,
              fileName: true,
              mimeType: true,
              size: true,
              bucket: true,
              objectKey: true,
              storageProvider: true,
              createdAt: true,
              updatedAt: true
            }
          })
        })()

  res.json({
    ok: true,
    project: {
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString()
    }
  })
})

export default router
