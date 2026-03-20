import { Router } from "express"
import { prisma } from "@kidscode/database"
import { requireAdmin } from "../middleware/requireAdmin"
import { getSignedDownloadUrl } from "../lib/objectStorage"

const router = Router()

router.use(requireAdmin)

const asString = (value: unknown) =>
  typeof value === "string" ? value.trim() : ""

const asInt = (value: unknown) => {
  if (typeof value === "number" && Number.isInteger(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    if (Number.isInteger(parsed)) return parsed
  }
  return NaN
}

function formatMonthDay(value: Date) {
  return `${value.getMonth() + 1}-${value.getDate()}`
}

router.get("/", async (req, res) => {
  const weekNumber = req.query?.weekNumber === undefined ? NaN : asInt(req.query.weekNumber)
  const reviewStatus = asString(req.query?.reviewStatus)
  const kind = asString(req.query?.kind)

  const items = await prisma.studentProject.findMany({
    where: {
      category: "CLASSROOM",
      ...(Number.isInteger(weekNumber) ? { weekNumber } : {}),
      ...(reviewStatus === "PENDING" || reviewStatus === "REVIEWED" ? { reviewStatus } : {}),
      ...(kind === "SCRATCH" || kind === "CPP" ? { kind } : {})
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      kind: true,
      weekNumber: true,
      reviewStatus: true,
      teacherComment: true,
      fileName: true,
      size: true,
      createdAt: true,
      reviewedAt: true,
      student: {
        select: {
          id: true,
          nickname: true,
          className: true,
          user: { select: { account: true, phone: true } }
        }
      }
    }
  })

  res.json({
    items: items.map(item => ({
      id: item.id,
      title: item.title,
      kind: item.kind,
      weekNumber: item.weekNumber,
      reviewStatus: item.reviewStatus,
      teacherComment: item.teacherComment,
      fileName: item.fileName,
      size: item.size ?? 0,
      createdAt: item.createdAt.toISOString(),
      reviewedAt: item.reviewedAt?.toISOString() ?? null,
      displayName: `${formatMonthDay(item.createdAt)} 第${item.weekNumber ?? 0}周`,
      student: {
        id: item.student.id,
        nickname: item.student.nickname,
        className: item.student.className,
        account: item.student.user.account ?? item.student.user.phone ?? ""
      }
    }))
  })
})

router.get("/:id", async (req, res) => {
  const id = asString(req.params.id)
  if (!id) return res.status(400).json({ error: "invalid id" })

  const item = await prisma.studentProject.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      kind: true,
      category: true,
      uploaderName: true,
      weekNumber: true,
      ideaNote: true,
      commonMistakes: true,
      content: true,
      fileName: true,
      mimeType: true,
      size: true,
      objectKey: true,
      reviewStatus: true,
      teacherComment: true,
      createdAt: true,
      reviewedAt: true,
      student: {
        select: {
          id: true,
          nickname: true,
          className: true,
          user: { select: { account: true, phone: true } }
        }
      }
    }
  })

  if (!item || item.category !== "CLASSROOM") {
    return res.status(404).json({ error: "not found" })
  }

  res.json({
    id: item.id,
    title: item.title,
    kind: item.kind,
    category: item.category,
    uploaderName: item.uploaderName,
    weekNumber: item.weekNumber,
    ideaNote: item.ideaNote,
    commonMistakes: item.commonMistakes,
    content:
      item.kind === "CPP"
        ? item.content ?? ""
        : "Scratch 项目已上传到对象存储，请使用下载按钮查看原文件。",
    fileName: item.fileName,
    mimeType: item.mimeType,
    size: item.size ?? (item.kind === "CPP" ? (item.content ?? "").length : 0),
    reviewStatus: item.reviewStatus,
    teacherComment: item.teacherComment,
    createdAt: item.createdAt.toISOString(),
    reviewedAt: item.reviewedAt?.toISOString() ?? null,
    displayName: `${formatMonthDay(item.createdAt)} 第${item.weekNumber ?? 0}周`,
    canDownload: item.kind === "SCRATCH" && !!item.objectKey,
    student: {
      id: item.student.id,
      nickname: item.student.nickname,
      className: item.student.className,
      account: item.student.user.account ?? item.student.user.phone ?? ""
    }
  })
})

router.get("/:id/download-url", async (req, res) => {
  const id = asString(req.params.id)
  if (!id) return res.status(400).json({ error: "invalid id" })

  const project = await prisma.studentProject.findUnique({
    where: { id },
    select: {
      id: true,
      category: true,
      kind: true,
      objectKey: true
    }
  })

  if (!project || project.category !== "CLASSROOM") {
    return res.status(404).json({ error: "not found" })
  }
  if (project.kind !== "SCRATCH" || !project.objectKey) {
    return res.status(400).json({ error: "download is only available for scratch files" })
  }

  const url = getSignedDownloadUrl(project.objectKey)
  return res.json({ ok: true, url })
})

router.patch("/:id", async (req, res) => {
  const id = asString(req.params.id)
  const teacherComment = asString(req.body?.teacherComment)

  if (!id) return res.status(400).json({ error: "invalid id" })
  if (!teacherComment) return res.status(400).json({ error: "teacherComment is required" })

  const existing = await prisma.studentProject.findUnique({
    where: { id },
    select: { id: true, category: true }
  })
  if (!existing || existing.category !== "CLASSROOM") {
    return res.status(404).json({ error: "not found" })
  }

  const updated = await prisma.studentProject.update({
    where: { id },
    data: {
      teacherComment,
      reviewStatus: "REVIEWED",
      reviewedAt: new Date()
    },
    select: {
      id: true,
      reviewStatus: true,
      teacherComment: true,
      reviewedAt: true
    }
  })

  res.json({
    ok: true,
    project: {
      id: updated.id,
      reviewStatus: updated.reviewStatus,
      teacherComment: updated.teacherComment,
      reviewedAt: updated.reviewedAt?.toISOString() ?? null
    }
  })
})

export default router
