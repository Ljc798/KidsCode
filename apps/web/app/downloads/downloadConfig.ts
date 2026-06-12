import path from "node:path"

export const downloadRoot = process.env.KIDSCODE_DOWNLOADS_DIR
  ? path.resolve(process.env.KIDSCODE_DOWNLOADS_DIR)
  : path.join(process.cwd(), "public", "downloads")
