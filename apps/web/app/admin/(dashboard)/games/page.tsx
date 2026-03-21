"use client"

import { useCallback, useEffect, useState } from "react"
import { apiFetch } from "@/app/lib/api"

type MiniGame = {
  slug: string
  title: string
  emoji: string
  isActive: boolean
  updatedAt: string
}

type GameListResponse = {
  games: MiniGame[]
  total: number
  active: number
}

type DisableAllResponse = {
  ok: true
  disabledCount: number
  active: number
}

type EnableAllResponse = {
  ok: true
  enabledCount: number
  active: number
}

type ToggleGameResponse = {
  ok: true
  game: MiniGame
}

export default function AdminGamesPage() {
  const [games, setGames] = useState<MiniGame[]>([])
  const [total, setTotal] = useState(0)
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const messageFromError = (e: unknown) =>
    e instanceof Error ? e.message : "Something went wrong"

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const data = await apiFetch<GameListResponse>("/admin/minigames")
      setGames(data.games)
      setTotal(data.total)
      setActive(data.active)
    } catch (e: unknown) {
      setError(messageFromError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const disableAll = async () => {
    const ok = confirm("确定要禁用所有游戏吗？学生将无法进入游戏详情和代码模式。")
    if (!ok) return

    setNotice(null)
    setError(null)
    setSaving(true)
    try {
      const data = await apiFetch<DisableAllResponse>("/admin/minigames/disable-all", {
        method: "POST"
      })
      setNotice(`已禁用 ${data.disabledCount} 个游戏。`)
      await load()
    } catch (e: unknown) {
      setError(messageFromError(e))
    } finally {
      setSaving(false)
    }
  }

  const enableAll = async () => {
    const ok = confirm("确定要启用所有游戏吗？")
    if (!ok) return

    setNotice(null)
    setError(null)
    setSaving(true)
    try {
      const data = await apiFetch<EnableAllResponse>("/admin/minigames/enable-all", {
        method: "POST"
      })
      setNotice(`已启用 ${data.enabledCount} 个游戏。`)
      await load()
    } catch (e: unknown) {
      setError(messageFromError(e))
    } finally {
      setSaving(false)
    }
  }

  const toggleGame = async (slug: string, nextActive: boolean) => {
    setNotice(null)
    setError(null)
    setSaving(true)
    try {
      await apiFetch<ToggleGameResponse>(`/admin/minigames/${encodeURIComponent(slug)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: nextActive })
      })
      setNotice(nextActive ? `已启用 ${slug}。` : `已禁用 ${slug}。`)
      await load()
    } catch (e: unknown) {
      setError(messageFromError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Games</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            支持一键启用/禁用全部，也支持单个游戏切换状态。
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={enableAll}
            disabled={saving || loading || active === total}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-200"
          >
            {saving ? "处理中..." : "一键启用全部游戏"}
          </button>
          <button
            onClick={disableAll}
            disabled={saving || loading || active === 0}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 px-4 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-200"
          >
            {saving ? "处理中..." : "一键禁用全部游戏"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
          <div className="text-zinc-500 dark:text-zinc-400">总游戏数</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{total}</div>
        </div>
        <div className="rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
          <div className="text-zinc-500 dark:text-zinc-400">当前启用</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{active}</div>
        </div>
      </div>

      {notice ? (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
        <div className="grid grid-cols-12 gap-2 bg-zinc-950/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:bg-white/5 dark:text-zinc-200">
          <div className="col-span-5">Game</div>
          <div className="col-span-3">Slug</div>
          <div className="col-span-2 text-right">Status</div>
          <div className="col-span-2 text-right">Action</div>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-sm text-zinc-600 dark:text-zinc-300">
            Loading...
          </div>
        ) : games.length === 0 ? (
          <div className="px-4 py-8 text-sm text-zinc-600 dark:text-zinc-300">
            No games found.
          </div>
        ) : (
          <div className="divide-y divide-black/10 bg-white/50 text-sm dark:divide-white/10 dark:bg-zinc-950/40">
            {games.map(game => (
              <div key={game.slug} className="grid grid-cols-12 items-center gap-2 px-4 py-3">
                <div className="col-span-5 truncate font-medium text-zinc-950 dark:text-white">
                  {game.emoji} {game.title}
                </div>
                <div className="col-span-3 truncate font-mono text-xs text-zinc-600 dark:text-zinc-300">
                  {game.slug}
                </div>
                <div
                  className={`col-span-2 text-right text-xs font-semibold ${
                    game.isActive
                      ? "text-emerald-700 dark:text-emerald-200"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {game.isActive ? "启用中" : "已禁用"}
                </div>
                <div className="col-span-2 flex justify-end">
                  <button
                    onClick={() => toggleGame(game.slug, !game.isActive)}
                    disabled={saving}
                    className={`inline-flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                      game.isActive
                        ? "border border-red-500/25 bg-red-500/10 text-red-700 hover:bg-red-500/15 dark:text-red-200"
                        : "border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-200"
                    }`}
                  >
                    {game.isActive ? "禁用" : "启用"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
