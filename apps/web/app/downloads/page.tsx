import { readFile, readdir, stat } from "node:fs/promises"
import path from "node:path"
import TopNav from "@/app/components/TopNav"
import CodeCopyButton from "./CodeCopyButton"
import { downloadRoot } from "./downloadConfig"

export const dynamic = "force-dynamic"

type DownloadFile = {
  name: string
  relativePath: string
  folder: string
  size: number
  updatedAt: Date
  content: string
}

async function readDownloadFiles(
  directory = downloadRoot,
  basePath = ""
): Promise<DownloadFile[]> {
  const entries = await readdir(directory, {
    encoding: "utf8",
    withFileTypes: true
  }).catch(() => null)

  if (!entries) {
    return []
  }

  const files = await Promise.all(
    entries
      .filter(entry => !entry.name.startsWith("."))
      .map(async entry => {
        const absolutePath = path.join(directory, entry.name)
        const relativePath = path.join(basePath, entry.name)

        if (entry.isDirectory()) {
          return readDownloadFiles(absolutePath, relativePath)
        }

        if (!entry.isFile()) {
          return []
        }

        const [fileStat, content] = await Promise.all([
          stat(absolutePath),
          readFile(absolutePath, "utf8")
        ])
        return [
          {
            name: entry.name,
            relativePath,
            folder: basePath || "全部素材",
            size: fileStat.size,
            updatedAt: fileStat.mtime,
            content
          }
        ]
      })
  )

  return files
    .flat()
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
}

function formatSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`
  }
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date)
}

export default async function DownloadsPage() {
  const files = await readDownloadFiles()
  const groupedFiles = files.reduce<Record<string, DownloadFile[]>>((groups, file) => {
    groups[file.folder] = groups[file.folder] ?? []
    groups[file.folder].push(file)
    return groups
  }, {})

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.sky.100),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.emerald.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.sky.950),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.emerald.950),transparent)]">
      <TopNav active="downloads" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="rounded-2xl border border-black/10 bg-white/85 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/65">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-sky-700 dark:text-sky-200">
                Download Center
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                代码素材
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                直接查看并复制代码，避免不同操作系统的字体和文件格式差异。
              </p>
            </div>
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-800 dark:text-sky-100">
              共 {files.length} 个文件
            </div>
          </div>

          {files.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-black/15 bg-white/60 px-5 py-10 text-center dark:border-white/15 dark:bg-white/5">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                暂无可下载素材
              </h2>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {Object.entries(groupedFiles).map(([folder, folderFiles]) => (
                <section key={folder}>
                  <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                    {folder}
                  </h2>
                  <div className="space-y-4">
                    {folderFiles.map(file => (
                      <article
                        key={file.relativePath}
                        className="overflow-hidden rounded-2xl border border-black/10 bg-white/65 dark:border-white/10 dark:bg-zinc-950/35"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-zinc-950 dark:text-white">
                              {file.name}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              {formatSize(file.size)} · {formatDate(file.updatedAt)}
                            </div>
                          </div>
                          <CodeCopyButton code={file.content} />
                        </div>
                        <pre className="max-h-[32rem] overflow-auto bg-zinc-950 p-4 text-sm leading-6 text-zinc-100">
                          <code>{file.content}</code>
                        </pre>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
