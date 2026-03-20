import TopNav from "@/app/components/TopNav"
import Link from "next/link"
import FeaturedMiniGames from "@/app/components/FeaturedMiniGames"
import HomeDashboardCards from "@/app/components/HomeDashboardCards"
import HomeLeaderboards from "@/app/components/HomeLeaderboards"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.100),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.950),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.950),transparent)]">
      <TopNav active="home" />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <section className="relative overflow-hidden rounded-[2rem] border border-black/5 bg-white/70 p-7 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50 sm:p-10">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-fuchsia-400/20 to-sky-400/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-gradient-to-br from-amber-400/20 to-lime-400/20 blur-3xl" />

          <div className="relative max-w-2xl">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              选一个小游戏，马上开玩
            </h1>
            <p className="mt-3 text-base leading-7 text-zinc-700 dark:text-zinc-200">
              每天进步一点点。完成关卡可以获得积分，还会推动你的电子宠物一起成长。积分可由老师统一兑换星空币（100 分=1 星空币）。
            </p>
          </div>

          <HomeDashboardCards />
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">
                热门小游戏
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                卡片式网格展示，每个游戏一个入口。
              </p>
            </div>
            <Link
              href="/games"
              className="hidden rounded-2xl border border-black/10 bg-white/60 px-4 py-2 text-sm font-extrabold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 sm:inline-flex"
            >
              查看全部
            </Link>
          </div>

          <FeaturedMiniGames limit={6} />
          <HomeLeaderboards />
        </section>

        <footer className="mt-12 grid gap-4 rounded-[2rem] border border-black/5 bg-white/60 p-6 text-sm text-zinc-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/40 dark:text-zinc-300 sm:grid-cols-3">
          <div>
            <div className="font-extrabold text-zinc-900 dark:text-white">
              联系方式
            </div>
            <div className="mt-2 text-xs">
              loujiachen6@gmail.com
            </div>
          </div>
          <div>
            <div className="font-extrabold text-zinc-900 dark:text-white">
              家长说明
            </div>
            <div className="mt-2 text-xs">
              内容适配小学同学。建议家长协助登录与设备设置。
            </div>
          </div>
          <div>
            <div className="font-extrabold text-zinc-900 dark:text-white">
              安全与隐私
            </div>
            <div className="mt-3 text-xs">
              <Link
                href="/admin"
                className="font-semibold text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-200"
              >
                管理员入口
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
