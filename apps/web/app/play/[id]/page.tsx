import Link from "next/link"
import TopNav from "@/app/components/TopNav"
import TreasureChoicesClient from "@/app/play/treasure-choices/TreasureChoicesClient"
import WeatherOutfitClient from "@/app/play/weather-outfit/WeatherOutfitClient"
import MonsterAvoidClient from "@/app/play/monster-avoid/MonsterAvoidClient"
import StarCollectorClient from "@/app/play/star-collector/StarCollectorClient"
import RobotGardenerClient from "@/app/play/robot-gardener/RobotGardenerClient"
import DrumBeatClient from "@/app/play/drum-beat/DrumBeatClient"

function gameApiBase() {
  return (
    process.env.API_PROXY_TARGET ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:3001"
  )
}

async function isGameOpen(slug: string) {
  try {
    const res = await fetch(`${gameApiBase()}/minigames/${encodeURIComponent(slug)}`, {
      cache: "no-store"
    })
    return res.ok
  } catch {
    return false
  }
}

export default async function PlayPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mode?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const mode = sp.mode === "code" ? "code" : "direct"
  const open = await isGameOpen(id)

  if (!open) {
    return (
      <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.100),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.950),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.950),transparent)]">
        <TopNav active="games" />
        <main className="mx-auto max-w-4xl px-4 py-10">
          <div className="rounded-[2rem] border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              暂停开放
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight">该游戏当前不可用</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              老师已临时关闭游戏入口，请在允许的时间再来玩。
            </p>
            <div className="mt-6">
              <Link
                href="/games"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-5 text-sm font-extrabold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                返回游戏大全
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (id === "treasure-choices") {
    return (
      <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.100),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.950),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.950),transparent)]">
        <TopNav />
        <main className="mx-auto max-w-4xl px-4 py-10">
          <TreasureChoicesClient />
        </main>
      </div>
    )
  }

  if (id === "weather-outfit") {
    return (
      <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.100),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.950),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.950),transparent)]">
        <TopNav />
        <main className="mx-auto max-w-4xl px-4 py-10">
          <WeatherOutfitClient />
        </main>
      </div>
    )
  }

  if (id === "monster-avoid") {
    return (
      <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.100),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.950),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.950),transparent)]">
        <TopNav />
        <main className="mx-auto max-w-4xl px-4 py-10">
          <MonsterAvoidClient />
        </main>
      </div>
    )
  }

  if (id === "star-collector") {
    return (
      <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.100),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.950),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.950),transparent)]">
        <TopNav />
        <main className="mx-auto max-w-4xl px-4 py-10">
          <StarCollectorClient />
        </main>
      </div>
    )
  }

  if (id === "robot-gardener") {
    return (
      <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.100),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.950),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.950),transparent)]">
        <TopNav />
        <main className="mx-auto max-w-4xl px-4 py-10">
          <RobotGardenerClient />
        </main>
      </div>
    )
  }

  if (id === "drum-beat") {
    return (
      <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.100),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.950),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.950),transparent)]">
        <TopNav />
        <main className="mx-auto max-w-4xl px-4 py-10">
          <DrumBeatClient />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.100),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.950),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.950),transparent)]">
      <TopNav />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-[2rem] border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            游戏中 (占位)
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
            {id} {mode === "direct" ? "直接玩" : "代码解锁后继续"}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            下一步会把真实的小游戏接进来: 关卡、奖励、失败重试、音效等。
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/games/${id}`}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-5 text-sm font-extrabold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              返回
            </Link>
            <button className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200">
              开始
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
