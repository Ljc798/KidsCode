import Link from "next/link"

export default function AdminHomePage() {
  return (
    <div className="rounded-2xl border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Manage core data for KidsCode.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link
          href="/admin/students"
          className="group rounded-2xl border border-black/5 bg-gradient-to-b from-white to-zinc-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:from-zinc-950 dark:to-zinc-900"
        >
          <div className="text-sm font-semibold">Students</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Create, edit, and remove student accounts.
          </div>
          <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Open list
          </div>
        </Link>

        <Link
          href="/admin/exercises"
          className="group rounded-2xl border border-black/5 bg-gradient-to-b from-white to-zinc-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:from-zinc-950 dark:to-zinc-900"
        >
          <div className="text-sm font-semibold">Exercises</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Manage exercise banks, edit questions, and review code submissions.
          </div>
          <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Open list
          </div>
        </Link>

        <Link
          href="/admin/projects"
          className="group rounded-2xl border border-black/5 bg-gradient-to-b from-white to-zinc-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:from-zinc-950 dark:to-zinc-900"
        >
          <div className="text-sm font-semibold">Projects</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Review classroom creations and write teacher comments for students.
          </div>
          <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Open list
          </div>
        </Link>

        <Link
          href="/admin/reviews"
          className="group rounded-2xl border border-black/5 bg-gradient-to-b from-white to-zinc-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:from-zinc-950 dark:to-zinc-900"
        >
          <div className="text-sm font-semibold">Reviews</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Review submissions, filter by level/student, and grade coding tasks.
          </div>
          <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Open center
          </div>
        </Link>

        <Link
          href="/admin/games"
          className="group rounded-2xl border border-black/5 bg-gradient-to-b from-white to-zinc-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:from-zinc-950 dark:to-zinc-900"
        >
          <div className="text-sm font-semibold">Games</div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            One-click disable all games during class time.
          </div>
          <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Open controls
          </div>
        </Link>
      </div>
    </div>
  )
}
