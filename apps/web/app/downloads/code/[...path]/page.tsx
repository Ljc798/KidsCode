import { readFile, stat } from "node:fs/promises"
import path from "node:path"
import Link from "next/link"
import { notFound } from "next/navigation"
import TopNav from "@/app/components/TopNav"
import CodeCopyButton from "../../CodeCopyButton"
import { downloadRoot } from "../../downloadConfig"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ path: string[] }>
}

export default async function CodeDetailPage({ params }: PageProps) {
  const segments = (await params).path
  const relativePath = segments.join(path.sep)
  const absolutePath = path.resolve(downloadRoot, relativePath)
  const relativeToRoot = path.relative(downloadRoot, absolutePath)

  if (
    !segments.length ||
    path.extname(absolutePath).toLowerCase() !== ".cpp" ||
    relativeToRoot.startsWith("..") ||
    path.isAbsolute(relativeToRoot)
  ) {
    notFound()
  }

  const file = await stat(absolutePath).catch(() => null)
  if (!file?.isFile()) notFound()

  const code = await readFile(absolutePath, "utf8")
  const fileName = path.basename(absolutePath)

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.sky.100),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.emerald.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.sky.950),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.emerald.950),transparent)]">
      <TopNav active="downloads" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="overflow-hidden rounded-2xl border border-black/10 bg-white/85 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/65">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 p-5 dark:border-white/10">
            <div className="min-w-0">
              <Link
                href="/downloads"
                className="text-sm font-semibold text-sky-700 hover:underline dark:text-sky-200"
              >
                ← 返回素材列表
              </Link>
              <h1 className="mt-2 truncate text-xl font-semibold">{fileName}</h1>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {relativePath}
              </p>
            </div>
            <CodeCopyButton code={code} />
          </header>
          <pre className="max-h-[calc(100vh-15rem)] overflow-auto bg-zinc-950 p-5 text-sm leading-6 text-zinc-100">
            <code>{code}</code>
          </pre>
        </section>
      </main>
    </div>
  )
}
