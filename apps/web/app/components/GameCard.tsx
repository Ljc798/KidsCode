import Link from "next/link"

export type GameCardData = {
  id: string
  title: string
  emoji: string
  blurb?: string
  locked?: boolean
  requiresLabel?: string
}

export default function GameCard({ game }: { game: GameCardData }) {
  return (
    <div
      className={[
        "group relative overflow-hidden rounded-3xl border border-black/5 bg-white/70 p-5 shadow-sm backdrop-blur transition dark:border-white/10 dark:bg-zinc-950/50",
        game.locked ? "opacity-75" : "hover:-translate-y-0.5 hover:shadow-md"
      ].join(" ")}
    >
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-fuchsia-400/25 to-sky-400/25 blur-2xl transition group-hover:blur-3xl" />
      <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-gradient-to-br from-amber-400/25 to-lime-400/25 blur-2xl transition group-hover:blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950/5 text-2xl dark:bg-white/10">
            {game.emoji}
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-extrabold tracking-tight text-zinc-950 dark:text-white">
              {game.title}
            </div>
            <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {game.blurb ?? "点击开始，赢取积分"}
            </div>
          </div>
        </div>

        {game.locked ? (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-xs font-extrabold text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
              <span aria-hidden>🔒</span>
              <span>需要{game.requiresLabel ?? "更高进度"}</span>
            </div>
            <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              请联系老师解锁
            </div>
          </div>
        ) : (
          <Link
            href={`/games/${game.id}`}
            className="relative inline-flex h-10 min-w-20 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-zinc-800 whitespace-nowrap dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            开始玩
          </Link>
        )}
      </div>
    </div>
  )
}
