import { randomUUID } from "node:crypto"
import COS from "cos-nodejs-sdk-v5"

type ObjectStorageConfig = {
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  publicBaseUrl: string | null
}

type UploadParams = {
  key: string
  body: Buffer
  contentType: string
}

function mustGetEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required env: ${name}`)
  }
  return value
}

function getConfig(): ObjectStorageConfig {
  return {
    bucket: mustGetEnv("OBJECT_STORAGE_BUCKET"),
    region: mustGetEnv("OBJECT_STORAGE_REGION"),
    accessKeyId: mustGetEnv("OBJECT_STORAGE_ACCESS_KEY_ID"),
    secretAccessKey: mustGetEnv("OBJECT_STORAGE_SECRET_ACCESS_KEY"),
    publicBaseUrl: process.env.OBJECT_STORAGE_PUBLIC_BASE_URL?.trim() || null
  }
}

function encodeKeyForPath(key: string) {
  return key
    .split("/")
    .map(segment => encodeURIComponent(segment))
    .join("/")
}

function createClient(config: ObjectStorageConfig) {
  return new COS({
    SecretId: config.accessKeyId,
    SecretKey: config.secretAccessKey
  })
}

function cleanPathSegment(value: string, fallback: string) {
  const cleaned = value
    .trim()
    .replace(/[\\/]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}._ -]+/gu, "-")
  return cleaned || fallback
}

function getExtension(fileName: string) {
  const dot = fileName.lastIndexOf(".")
  if (dot <= 0 || dot === fileName.length - 1) return ""
  return fileName.slice(dot)
}

function ensureExtension(targetFileName: string, sourceFileName: string) {
  const targetExt = getExtension(targetFileName)
  if (targetExt) return targetFileName
  const sourceExt = getExtension(sourceFileName)
  return sourceExt ? `${targetFileName}${sourceExt}` : targetFileName
}

export function createScratchObjectKey(
  ownerName: string,
  category: "CLASSROOM" | "PERSONAL",
  fileName: string,
  sourceFileName?: string | null
) {
  const safeOwnerName = cleanPathSegment(ownerName, randomUUID())
  const normalizedFileName = ensureExtension(fileName, sourceFileName ?? fileName)
  const safeFileName = cleanPathSegment(normalizedFileName, "project.sb3")
  const categorySegment =
    category === "CLASSROOM" ? "scratch课堂创作" : "scratch自我创作"
  return `${safeOwnerName}/${categorySegment}/${safeFileName}`
}

export function createExerciseAssetObjectKey(input: {
  subject: "CPP" | "SCRATCH"
  difficultyType: "LEVEL" | "OTHER"
  difficultyLevel?: number | null
  slug: string
  questionId: string
  fileName: string
}) {
  const safeSubject = input.subject.toLowerCase()
  const difficultySegment =
    input.difficultyType === "LEVEL" && Number.isInteger(input.difficultyLevel)
      ? `level${input.difficultyLevel}`
      : "other"
  const safeSlug = cleanPathSegment(input.slug, randomUUID())
  const safeQuestionId = cleanPathSegment(input.questionId, "question")
  const safeFileName = cleanPathSegment(input.fileName, "asset")
  return `test/${safeSubject}/${difficultySegment}/${safeSlug}/${safeQuestionId}/${safeFileName}`
}

export function createExerciseScratchSubmissionObjectKey(input: {
  studentId: string
  slug: string
  taskId: string
  fileName: string
}) {
  const safeStudentId = cleanPathSegment(input.studentId, randomUUID())
  const safeSlug = cleanPathSegment(input.slug, "exercise")
  const safeTaskId = cleanPathSegment(input.taskId, "task")
  const safeFileName = cleanPathSegment(
    ensureExtension(input.fileName, input.fileName),
    "answer.sb3"
  )
  return `exercise-submissions/scratch/${safeStudentId}/${safeSlug}/${safeTaskId}/${Date.now()}-${safeFileName}`
}

export function createTeachingMaterialObjectKey(input: {
  kind: "SCRATCH" | "CPP" | "ZIP"
  title: string
  fileName: string
  weekTag?: string | null
}) {
  const kindSegment =
    input.kind === "SCRATCH" ? "scratch" : input.kind === "ZIP" ? "zip" : "cpp"
  const weekSegment = cleanPathSegment(input.weekTag ?? "", "general")
  const safeTitle = cleanPathSegment(input.title, "material")
  const safeFileName = cleanPathSegment(
    ensureExtension(input.fileName, input.fileName),
    input.kind === "SCRATCH"
      ? "sample.sb3"
      : input.kind === "ZIP"
        ? "bundle.zip"
        : "answer.cpp"
  )
  return `teaching-materials/${kindSegment}/${weekSegment}/${safeTitle}/${Date.now()}-${safeFileName}`
}

export async function uploadObject(params: UploadParams) {
  const config = getConfig()
  const client = createClient(config)

  await new Promise<void>((resolve, reject) => {
    client.putObject(
      {
        Bucket: config.bucket,
        Region: config.region,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType
      },
      (err) => {
        if (err) {
          reject(new Error(`COS upload failed: ${err.message || String(err)}`))
          return
        }
        resolve()
      }
    )
  })

  return {
    bucket: config.bucket,
    key: params.key,
    provider: "cos",
    size: params.body.byteLength,
    publicUrl: config.publicBaseUrl
      ? `${config.publicBaseUrl.replace(/\/+$/, "")}/${encodeKeyForPath(params.key)}`
      : `https://${config.bucket}.cos.${config.region}.myqcloud.com/${encodeKeyForPath(params.key)}`
  }
}

export function getSignedDownloadUrl(key: string, expiresSeconds = 60 * 15) {
  const config = getConfig()
  const client = createClient(config)

  return client.getObjectUrl({
    Bucket: config.bucket,
    Region: config.region,
    Key: key,
    Sign: true,
    Expires: expiresSeconds
  })
}
