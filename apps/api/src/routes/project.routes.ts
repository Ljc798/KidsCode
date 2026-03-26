import { Router } from "express"
import { prisma } from "@kidscode/database"
import { requireStudent } from "../middleware/requireStudent"
import {
  createScratchObjectKey,
  getSignedDownloadUrl,
  uploadObject
} from "../lib/objectStorage"
import { createAdminNotificationForAll } from "../lib/adminNotification"

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
type ProjectCategory = "CLASSROOM" | "PERSONAL"

function formatMonthDay(value: Date) {
  return `${value.getMonth() + 1}-${value.getDate()}`
}

function categoryLabel(category: ProjectCategory) {
  return category === "CLASSROOM" ? "课堂创作" : "自我创作"
}

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
      category: true,
      title: true,
      uploaderName: true,
      weekNumber: true,
      ideaNote: true,
      commonMistakes: true,
      size: true,
      fileName: true,
      mimeType: true,
      content: true,
      bucket: true,
      objectKey: true,
      storageProvider: true,
      reviewStatus: true,
      teacherComment: true,
      reviewedAt: true,
      createdAt: true,
      updatedAt: true
    }
  })

  res.json({
    ok: true,
    projects: projects.map(project => ({
      id: project.id,
      kind: project.kind,
      category: project.category,
      title: project.title,
      uploaderName: project.uploaderName,
      weekNumber: project.weekNumber,
      ideaNote: project.ideaNote,
      commonMistakes: project.commonMistakes,
      fileName: project.fileName,
      mimeType: project.mimeType,
      preview:
        project.kind === "CPP"
          ? (project.content ?? "").slice(0, 180)
          : project.kind === "SCRATCH"
            ? "Scratch 项目已上传到对象存储，可继续管理或后续接入编辑器。"
            : "文件已上传到对象存储，后续可继续补充预览或解析逻辑。",
      size: project.size ?? (project.kind === "CPP" ? (project.content ?? "").length : 0),
      reviewStatus: project.reviewStatus,
      teacherComment: project.teacherComment,
      reviewedAt: project.reviewedAt?.toISOString() ?? null,
      displayName:
        project.category === "CLASSROOM" && project.weekNumber
          ? `${formatMonthDay(project.createdAt)} 第${project.weekNumber}周`
          : `${formatMonthDay(project.createdAt)} ${categoryLabel(project.category as ProjectCategory)}`,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      canDownload: project.kind === "SCRATCH" && !!project.objectKey,
      hasObjectStorage:
        project.kind === "SCRATCH" && !!project.bucket && !!project.objectKey
    }))
  })
})

router.get("/:id", async (req: any, res) => {
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
      category: true,
      title: true,
      uploaderName: true,
      weekNumber: true,
      ideaNote: true,
      commonMistakes: true,
      fileName: true,
      mimeType: true,
      content: true,
      size: true,
      bucket: true,
      objectKey: true,
      reviewStatus: true,
      teacherComment: true,
      reviewedAt: true,
      createdAt: true,
      updatedAt: true
    }
  })

  if (!project) return res.status(404).json({ error: "project not found" })

  return res.json({
    ok: true,
    project: {
      id: project.id,
      kind: project.kind,
      category: project.category,
      title: project.title,
      uploaderName: project.uploaderName,
      weekNumber: project.weekNumber,
      ideaNote: project.ideaNote,
      commonMistakes: project.commonMistakes,
      fileName: project.fileName,
      mimeType: project.mimeType,
      content:
        project.kind === "CPP"
          ? project.content ?? ""
          : project.kind === "SCRATCH"
            ? "Scratch 项目已上传到对象存储，可通过下载按钮获取原文件。"
            : "文件已上传到对象存储，当前暂未提供在线预览。",
      size: project.size ?? (project.kind === "CPP" ? (project.content ?? "").length : 0),
      reviewStatus: project.reviewStatus,
      teacherComment: project.teacherComment,
      reviewedAt: project.reviewedAt?.toISOString() ?? null,
      displayName:
        project.category === "CLASSROOM" && project.weekNumber
          ? `${formatMonthDay(project.createdAt)} 第${project.weekNumber}周`
          : `${formatMonthDay(project.createdAt)} ${categoryLabel(project.category as ProjectCategory)}`,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      canDownload: project.kind === "SCRATCH" && !!project.objectKey
    }
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

router.get("/:id/download", async (req: any, res) => {
  const studentId = req.studentId as string
  const id = asString(req.params.id)

  if (!id) return res.status(400).json({ error: "invalid id" })

  const project = await prisma.studentProject.findFirst({
    where: {
      id,
      studentId
    },
    select: {
      kind: true,
      objectKey: true,
      fileName: true,
      mimeType: true
    }
  })

  if (!project) return res.status(404).json({ error: "project not found" })
  if (project.kind !== "SCRATCH" || !project.objectKey) {
    return res.status(400).json({ error: "download is only available for scratch files" })
  }

  const signedUrl = getSignedDownloadUrl(project.objectKey)
  const upstream = await fetch(signedUrl)
  if (!upstream.ok) {
    return res.status(502).json({ error: "failed to fetch scratch file from object storage" })
  }

  const body = Buffer.from(await upstream.arrayBuffer())
  const contentType = project.mimeType || upstream.headers.get("content-type") || "application/octet-stream"
  res.setHeader("content-type", contentType)
  res.setHeader("cache-control", "private, no-store")
  if (project.fileName) {
    res.setHeader(
      "content-disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(project.fileName)}`
    )
  }

  return res.status(200).send(body)
})

router.post("/", async (req: any, res) => {
  const studentId = req.studentId as string
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { nickname: true }
  })
  const title = asString(req.body?.title)
  const category: ProjectCategory | null =
    req.body?.category === "CLASSROOM" || req.body?.category === "PERSONAL"
      ? req.body.category
      : null
  const weekNumberRaw = req.body?.weekNumber
  const weekNumber =
    typeof weekNumberRaw === "number" && Number.isInteger(weekNumberRaw)
      ? weekNumberRaw
      : typeof weekNumberRaw === "string" && weekNumberRaw.trim()
        ? Number(weekNumberRaw)
        : null
  const ideaNote = req.body?.ideaNote === undefined ? null : asString(req.body.ideaNote)
  const commonMistakes =
    req.body?.commonMistakes === undefined ? null : asString(req.body.commonMistakes)
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
  if (!category) return res.status(400).json({ error: "category is required" })
  if (!kind) {
    return res.status(400).json({ error: "kind must be CPP, SCRATCH or OTHER" })
  }
  if (category === "CLASSROOM" && (!Number.isInteger(weekNumber) || weekNumber! <= 0)) {
    return res.status(400).json({ error: "weekNumber is required for classroom projects" })
  }
  if (category === "PERSONAL" && weekNumber !== null) {
    return res.status(400).json({ error: "weekNumber is only allowed for classroom projects" })
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
            category,
            title,
            uploaderName,
            weekNumber: category === "CLASSROOM" ? weekNumber : null,
            ideaNote,
            commonMistakes: category === "CLASSROOM" ? commonMistakes : null,
            content,
            fileName,
            mimeType,
            size: content.length,
            reviewStatus: category === "CLASSROOM" ? "PENDING" : "NONE"
          },
          select: {
            id: true,
            kind: true,
            category: true,
            title: true,
            uploaderName: true,
            weekNumber: true,
            ideaNote: true,
            commonMistakes: true,
            fileName: true,
            mimeType: true,
            size: true,
            bucket: true,
            objectKey: true,
            storageProvider: true,
            reviewStatus: true,
            teacherComment: true,
            reviewedAt: true,
            createdAt: true,
            updatedAt: true
          }
        })
      : await (async () => {
          const decoded = decodeDataUrl(content)
          const objectKey = createScratchObjectKey(
            uploaderName,
            category,
            title,
            fileName
          )
          const uploaded = await uploadObject({
            key: objectKey,
            body: decoded.buffer,
            contentType: mimeType || decoded.mimeType
          })

          return prisma.studentProject.create({
            data: {
              studentId,
              kind,
              category,
              title,
              uploaderName,
              weekNumber: category === "CLASSROOM" ? weekNumber : null,
              ideaNote,
              commonMistakes: category === "CLASSROOM" ? commonMistakes : null,
              content: null,
              fileName,
              mimeType: mimeType || decoded.mimeType,
              size: uploaded.size,
              bucket: uploaded.bucket,
              objectKey: uploaded.key,
              storageProvider: uploaded.provider,
              reviewStatus: category === "CLASSROOM" ? "PENDING" : "NONE"
            },
            select: {
              id: true,
              kind: true,
              category: true,
              title: true,
              uploaderName: true,
              weekNumber: true,
              ideaNote: true,
              commonMistakes: true,
              fileName: true,
              mimeType: true,
              size: true,
              bucket: true,
              objectKey: true,
              storageProvider: true,
              reviewStatus: true,
              teacherComment: true,
              reviewedAt: true,
              createdAt: true,
              updatedAt: true
            }
          })
        })()

  if (created.category === "CLASSROOM") {
    try {
      await createAdminNotificationForAll({
        category: "CLASSROOM_PROJECT",
        title: "有学生提交了课堂创作",
        content: `${uploaderName}（课堂创作）提交了《${created.title}》。`,
        payload: {
          projectId: created.id,
          studentId,
          studentNickname: uploaderName,
          weekNumber: created.weekNumber ?? null,
          title: created.title
        }
      })
    } catch (e) {
      console.error("failed to create admin classroom project notification", e)
    }
  }

  res.json({
    ok: true,
    project: {
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString()
    }
  })
})

router.patch("/:id", async (req: any, res) => {
  const studentId = req.studentId as string
  const id = asString(req.params.id)
  if (!id) return res.status(400).json({ error: "invalid id" })

  const existing = await prisma.studentProject.findFirst({
    where: {
      id,
      studentId
    },
    select: {
      id: true,
      category: true,
      kind: true,
      objectKey: true
    }
  })
  if (!existing) return res.status(404).json({ error: "project not found" })

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { nickname: true }
  })
  const uploaderName = student?.nickname?.trim() ?? ""
  const title = asString(req.body?.title)
  const category: ProjectCategory | null =
    req.body?.category === "CLASSROOM" || req.body?.category === "PERSONAL"
      ? req.body.category
      : null
  const weekNumberRaw = req.body?.weekNumber
  const weekNumber =
    typeof weekNumberRaw === "number" && Number.isInteger(weekNumberRaw)
      ? weekNumberRaw
      : typeof weekNumberRaw === "string" && weekNumberRaw.trim()
        ? Number(weekNumberRaw)
        : null
  const ideaNote = req.body?.ideaNote === undefined ? null : asString(req.body.ideaNote)
  const commonMistakes =
    req.body?.commonMistakes === undefined ? null : asString(req.body.commonMistakes)
  const content = typeof req.body?.content === "string" ? req.body.content : ""
  const fileNameRaw = req.body?.fileName
  const mimeTypeRaw = req.body?.mimeType
  const fileName = fileNameRaw === undefined ? null : asString(fileNameRaw)
  const mimeType = mimeTypeRaw === undefined ? null : asString(mimeTypeRaw)

  if (!title) return res.status(400).json({ error: "title is required" })
  if (!uploaderName) return res.status(400).json({ error: "uploaderName is required" })
  if (!category) return res.status(400).json({ error: "category is required" })
  if (existing.kind === "SCRATCH" && !fileName) {
    return res.status(400).json({ error: "fileName is required for scratch" })
  }
  if (category === "CLASSROOM" && (!Number.isInteger(weekNumber) || weekNumber! <= 0)) {
    return res.status(400).json({ error: "weekNumber is required for classroom projects" })
  }
  if (category === "PERSONAL" && weekNumber !== null) {
    return res.status(400).json({ error: "weekNumber is only allowed for classroom projects" })
  }
  if (existing.kind === "CPP" && !content.trim()) {
    return res.status(400).json({ error: "content is required" })
  }

  const reviewReset =
    category === "CLASSROOM"
      ? {
          reviewStatus: "PENDING" as const,
          teacherComment: null,
          reviewedAt: null
        }
      : {
          reviewStatus: "NONE" as const,
          teacherComment: null,
          reviewedAt: null
        }

  const updated =
    existing.kind === "CPP"
      ? await prisma.studentProject.update({
          where: { id },
          data: {
            category,
            title,
            weekNumber: category === "CLASSROOM" ? weekNumber : null,
            ideaNote,
            commonMistakes: category === "CLASSROOM" ? commonMistakes : null,
            fileName,
            mimeType,
            content,
            size: content.length,
            ...reviewReset
          },
          select: {
            id: true,
            kind: true,
            category: true,
            title: true,
            uploaderName: true,
            weekNumber: true,
            ideaNote: true,
            commonMistakes: true,
            fileName: true,
            mimeType: true,
            content: true,
            size: true,
            objectKey: true,
            reviewStatus: true,
            teacherComment: true,
            reviewedAt: true,
            createdAt: true,
            updatedAt: true
          }
        })
      : await (async () => {
          let nextObjectKey = existing.objectKey
          let nextSize: number | null = null
          let nextMimeType = mimeType || null

          if (content) {
            const decoded = decodeDataUrl(content)
            nextObjectKey = createScratchObjectKey(uploaderName, category, title, fileName)
            const uploaded = await uploadObject({
              key: nextObjectKey,
              body: decoded.buffer,
              contentType: mimeType || decoded.mimeType
            })
            nextSize = uploaded.size
            nextMimeType = mimeType || decoded.mimeType
          }

          return prisma.studentProject.update({
            where: { id },
            data: {
              category,
              title,
              weekNumber: category === "CLASSROOM" ? weekNumber : null,
              ideaNote,
              commonMistakes: category === "CLASSROOM" ? commonMistakes : null,
              fileName,
              mimeType: nextMimeType,
              ...(nextObjectKey ? { objectKey: nextObjectKey } : {}),
              ...(nextSize === null ? {} : { size: nextSize }),
              ...reviewReset
            },
            select: {
              id: true,
              kind: true,
              category: true,
              title: true,
              uploaderName: true,
              weekNumber: true,
              ideaNote: true,
              commonMistakes: true,
              fileName: true,
              mimeType: true,
              content: true,
              size: true,
              objectKey: true,
              reviewStatus: true,
              teacherComment: true,
              reviewedAt: true,
              createdAt: true,
              updatedAt: true
            }
          })
        })()

  res.json({
    ok: true,
    project: {
      ...updated,
      content:
        updated.kind === "CPP"
          ? updated.content ?? ""
          : "Scratch 项目已上传到对象存储，可通过下载按钮获取原文件。",
      displayName:
        updated.category === "CLASSROOM" && updated.weekNumber
          ? `${formatMonthDay(updated.createdAt)} 第${updated.weekNumber}周`
          : `${formatMonthDay(updated.createdAt)} ${categoryLabel(updated.category as ProjectCategory)}`,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      canDownload: updated.kind === "SCRATCH" && !!updated.objectKey
    }
  })
})

export default router
