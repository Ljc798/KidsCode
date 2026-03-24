import { Router } from "express"
import { prisma } from "@kidscode/database"
import { requireAdmin } from "../middleware/requireAdmin"
import { getSignedDownloadUrl } from "../lib/objectStorage"
import { applyPetMeatReward, recoverPetEnergy } from "../lib/studentHelper"

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

type RewardType = "NONE" | "MEAT" | "XP"

function asRewardType(value: unknown): RewardType {
  const normalized = asString(value).toUpperCase()
  if (normalized === "MEAT") return "MEAT"
  if (normalized === "XP") return "XP"
  return "NONE"
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

router.get("/:id/download", async (req, res) => {
  const id = asString(req.params.id)
  if (!id) return res.status(400).json({ error: "invalid id" })

  const project = await prisma.studentProject.findUnique({
    where: { id },
    select: {
      category: true,
      kind: true,
      objectKey: true,
      fileName: true,
      mimeType: true
    }
  })

  if (!project || project.category !== "CLASSROOM") {
    return res.status(404).json({ error: "not found" })
  }
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

router.patch("/:id", async (req, res) => {
  const id = asString(req.params.id)
  const teacherComment = asString(req.body?.teacherComment)
  const rewardType = asRewardType(req.body?.rewardType)
  const rawRewardAmount = req.body?.rewardAmount
  const rewardAmount =
    rawRewardAmount === undefined || rawRewardAmount === null || rawRewardAmount === ""
      ? 0
      : asInt(rawRewardAmount)

  if (!id) return res.status(400).json({ error: "invalid id" })
  if (!teacherComment) return res.status(400).json({ error: "teacherComment is required" })
  if (!Number.isInteger(rewardAmount) || rewardAmount < 0) {
    return res.status(400).json({ error: "rewardAmount must be a non-negative integer" })
  }
  if (rewardType === "NONE" && rewardAmount > 0) {
    return res.status(400).json({ error: "rewardType is required when rewardAmount > 0" })
  }
  if ((rewardType === "MEAT" || rewardType === "XP") && rewardAmount === 0) {
    return res.status(400).json({ error: "rewardAmount must be greater than 0" })
  }

  const existing = await prisma.studentProject.findUnique({
    where: { id },
    select: { id: true, category: true, studentId: true, title: true }
  })
  if (!existing || existing.category !== "CLASSROOM") {
    return res.status(404).json({ error: "not found" })
  }

  const result = await prisma.$transaction(async tx => {
    const now = new Date()
    let rewardApplied: {
      type: RewardType
      amount: number
      levelsGained: number
      petXp: number
      petMeat: number
      petEnergy: number
      petMood: number
    } | null = null

    if (rewardType !== "NONE" && rewardAmount > 0) {
      const student = await tx.student.findUnique({
        where: { id: existing.studentId },
        select: {
          id: true,
          petXp: true,
          petMeat: true,
          petMood: true,
          petEnergy: true,
          petEnergyRefreshedAt: true
        }
      })
      if (!student) {
        throw new Error("student not found")
      }

      const recovered = recoverPetEnergy({
        petEnergy: student.petEnergy,
        petEnergyRefreshedAt: student.petEnergyRefreshedAt,
        now
      })

      if (rewardType === "MEAT") {
        const next = applyPetMeatReward({
          petXp: student.petXp,
          petMeat: student.petMeat ?? 0,
          addedMeat: rewardAmount
        })
        const updatedStudent = await tx.student.update({
          where: { id: student.id },
          data: {
            petXp: next.petXp,
            petMeat: next.petMeat,
            petMood: Math.min(100, student.petMood + Math.max(4, rewardAmount * 3)),
            petEnergy: Math.min(100, recovered.energy + Math.max(3, rewardAmount * 2)),
            petEnergyRefreshedAt: now
          },
          select: {
            petXp: true,
            petMeat: true,
            petMood: true,
            petEnergy: true
          }
        })
        rewardApplied = {
          type: "MEAT",
          amount: rewardAmount,
          levelsGained: next.levelsGained,
          petXp: updatedStudent.petXp,
          petMeat: updatedStudent.petMeat ?? 0,
          petEnergy: updatedStudent.petEnergy,
          petMood: updatedStudent.petMood
        }
      } else {
        const updatedStudent = await tx.student.update({
          where: { id: student.id },
          data: {
            petXp: student.petXp + rewardAmount,
            petMood: Math.min(100, student.petMood + Math.max(2, Math.floor(rewardAmount / 8))),
            petEnergy: Math.min(100, recovered.energy + Math.max(1, Math.floor(rewardAmount / 12))),
            petEnergyRefreshedAt: now
          },
          select: {
            petXp: true,
            petMeat: true,
            petMood: true,
            petEnergy: true
          }
        })
        rewardApplied = {
          type: "XP",
          amount: rewardAmount,
          levelsGained: 0,
          petXp: updatedStudent.petXp,
          petMeat: updatedStudent.petMeat ?? 0,
          petEnergy: updatedStudent.petEnergy,
          petMood: updatedStudent.petMood
        }
      }

      await tx.studentActivity.create({
        data: {
          studentId: existing.studentId,
          kind: "POINTS_AWARD",
          ok: true,
          meta: {
            source: "project_review_reward",
            projectId: existing.id,
            projectTitle: existing.title,
            rewardType,
            rewardAmount
          }
        }
      })
    }

    const updatedProject = await tx.studentProject.update({
      where: { id },
      data: {
        teacherComment,
        reviewStatus: "REVIEWED",
        reviewedAt: now
      },
      select: {
        id: true,
        reviewStatus: true,
        teacherComment: true,
        reviewedAt: true
      }
    })

    return { updatedProject, rewardApplied }
  })

  res.json({
    ok: true,
    project: {
      id: result.updatedProject.id,
      reviewStatus: result.updatedProject.reviewStatus,
      teacherComment: result.updatedProject.teacherComment,
      reviewedAt: result.updatedProject.reviewedAt?.toISOString() ?? null
    },
    reward: result.rewardApplied
  })
})

export default router
