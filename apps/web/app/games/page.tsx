import TopNav from "@/app/components/TopNav"
import GamesGrid from "@/app/games/GamesGrid"

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.100),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.950),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.950),transparent)]">
      <TopNav active="games" />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50">
          <h1 className="text-2xl font-extrabold tracking-tight">游戏大全</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            选一个小游戏，马上开玩。
          </p>
        </div>

        <div className="mt-4 rounded-3xl border border-black/5 bg-white/60 p-4 text-sm shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/40">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-zinc-700 dark:text-zinc-200">
              游戏会根据老师设置的学习进度解锁：先学{" "}
              <span className="font-extrabold">分支</span>，再学{" "}
              <span className="font-extrabold">循环</span>。
            </div>
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              需要解锁请联系老师
            </div>
          </div>
        </div>

        <GamesGrid />

        <footer className="mt-12 rounded-3xl border border-black/5 bg-white/60 p-6 text-sm text-zinc-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/40 dark:text-zinc-300">
          <div className="font-extrabold text-zinc-900 dark:text-white">
            家长说明
          </div>
          <div className="mt-2">
            本站面向小学同学，游戏以学习与动手为主。遇到账号问题请联系老师或家长协助。
          </div>
          <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            联系方式: support@kidscode.example (占位) | 微信群: 由老师统一通知
          </div>
        </footer>
      </main>
    </div>
  )
}
