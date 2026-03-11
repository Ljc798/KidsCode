import Link from "next/link"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_20%_-10%,theme(colors.amber.100),transparent),radial-gradient(800px_400px_at_90%_10%,theme(colors.sky.100),transparent)] dark:bg-[radial-gradient(1200px_600px_at_20%_-10%,theme(colors.amber.950),transparent),radial-gradient(800px_400px_at_90%_10%,theme(colors.sky.950),transparent)]">
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-zinc-950/60 md:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="text-sm font-semibold tracking-tight">
            KidsCode Admin
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/admin/students"
              className="rounded-xl border border-black/10 bg-white/60 px-3 py-1.5 font-semibold text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              Students
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-black/10 bg-white/60 px-3 py-1.5 font-semibold text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              Site
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto flex min-h-screen max-w-6xl gap-6 px-4 py-6">
        <aside className="hidden w-60 shrink-0 rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60 md:block">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="text-sm font-semibold tracking-tight">
              KidsCode Admin
            </Link>
          </div>
          <nav className="mt-4 space-y-1 text-sm">
            <Link
              href="/admin/students"
              className="block rounded-lg px-3 py-2 text-zinc-800 hover:bg-zinc-950/5 dark:text-zinc-100 dark:hover:bg-white/10"
            >
              Students
            </Link>
            <Link
              href="/"
              className="block rounded-lg px-3 py-2 text-zinc-700 hover:bg-zinc-950/5 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              Back to site
            </Link>
          </nav>
          <div className="mt-6 rounded-xl border border-black/5 bg-white/60 p-3 text-xs text-zinc-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
            API: <span className="font-mono">{process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001"}</span>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
