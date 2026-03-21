import Link from "next/link"
import AdminLogoutButton from "@/app/admin/(dashboard)/logout/AdminLogoutButton"

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
              href="/admin/exercises"
              className="rounded-xl border border-black/10 bg-white/60 px-3 py-1.5 font-semibold text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              Exercises
            </Link>
            <Link
              href="/admin/projects"
              className="rounded-xl border border-black/10 bg-white/60 px-3 py-1.5 font-semibold text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              Projects
            </Link>
            <Link
              href="/admin/games"
              className="rounded-xl border border-black/10 bg-white/60 px-3 py-1.5 font-semibold text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              Games
            </Link>
            <Link
              href="/admin/reviews"
              className="rounded-xl border border-black/10 bg-white/60 px-3 py-1.5 font-semibold text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              Reviews
            </Link>
            <AdminLogoutButton compact />
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-screen max-w-6xl gap-6 px-4 py-6">
        <aside className="hidden w-60 shrink-0 rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60 md:block">
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
              href="/admin/exercises"
              className="block rounded-lg px-3 py-2 text-zinc-800 hover:bg-zinc-950/5 dark:text-zinc-100 dark:hover:bg-white/10"
            >
              Exercises
            </Link>
            <Link
              href="/admin/projects"
              className="block rounded-lg px-3 py-2 text-zinc-800 hover:bg-zinc-950/5 dark:text-zinc-100 dark:hover:bg-white/10"
            >
              Projects
            </Link>
            <Link
              href="/admin/games"
              className="block rounded-lg px-3 py-2 text-zinc-800 hover:bg-zinc-950/5 dark:text-zinc-100 dark:hover:bg-white/10"
            >
              Games
            </Link>
            <Link
              href="/admin/reviews"
              className="block rounded-lg px-3 py-2 text-zinc-800 hover:bg-zinc-950/5 dark:text-zinc-100 dark:hover:bg-white/10"
            >
              Reviews
            </Link>
            <Link
              href="/"
              className="block rounded-lg px-3 py-2 text-zinc-700 hover:bg-zinc-950/5 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              Back to site
            </Link>
          </nav>
          <div className="mt-6 flex items-start justify-between gap-3 rounded-xl border border-black/10 bg-white/70 p-3 text-xs text-zinc-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
            <div className="min-w-0">
              <div>API:</div>
              <div className="font-mono break-all">
                {process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001"}
              </div>
            </div>
            <div className="shrink-0 pt-1">
              <AdminLogoutButton />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
