import { readFile, stat } from "node:fs/promises"
import path from "node:path"
import { NextRequest } from "next/server"
import { downloadRoot } from "../../downloadConfig"

const mimeTypes: Record<string, string> = {
  ".bmp": "image/bmp",
  ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".sb3": "application/octet-stream",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wav": "audio/wav",
  ".webp": "image/webp",
  ".zip": "application/zip"
}

function getSafeFilePath(parts: string[]) {
  const requestedPath = path.resolve(downloadRoot, ...parts)
  const relativePath = path.relative(downloadRoot, requestedPath)

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null
  }

  return requestedPath
}

function getContentDisposition(fileName: string) {
  return `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: pathParts } = await context.params
  const filePath = getSafeFilePath(pathParts)

  if (!filePath) {
    return new Response("Invalid file path", { status: 400 })
  }

  try {
    const fileStat = await stat(filePath)

    if (!fileStat.isFile()) {
      return new Response("Not found", { status: 404 })
    }

    const file = await readFile(filePath)
    const fileName = path.basename(filePath)
    const contentType =
      mimeTypes[path.extname(fileName).toLowerCase()] ??
      "application/octet-stream"

    return new Response(file, {
      headers: {
        "Content-Disposition": getContentDisposition(fileName),
        "Content-Length": String(fileStat.size),
        "Content-Type": contentType
      }
    })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}
