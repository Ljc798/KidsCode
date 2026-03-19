import TopNav from "@/app/components/TopNav"
import StudentStatusCard from "@/app/me/StudentStatusCard"

export default function MePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.100),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.950),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.950),transparent)]">
      <TopNav active="me" />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50">
          <h1 className="text-2xl font-extrabold tracking-tight">我的</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            这里之后会放: 我的积分/星空币、已完成小游戏、最近游戏记录、班级排行榜等。
          </p>

          <div className="mt-6">
            <StudentStatusCard />
          </div>
        </div>
      </main>
    </div>
  )
}
