"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { petEmoji } from "@/app/lib/pet"

type PetSpecies = "云朵龙" | "奶油猫" | "闪电狗" | "月光兔" | "极光鸟"

type MeResponse =
  | {
      ok: true
      student: {
        id: string
        nickname: string
        age: number
        account: string
        className?: string | null
        pointsBalance?: number
        earnedToday?: number
        dailyCap?: number
        exerciseEarnedToday?: number
        exerciseDailyCap?: number
        pet: {
          name: string
          species: PetSpecies
          mood: number
          energy: number
          stage: string
          level: {
            level: number
            progressPct: number
            xp: number
            prevLevelXp: number
            nextLevelXp: number
          }
        }
      }
    }
  | { ok: false }

const PET_OPTIONS: PetSpecies[] = ["云朵龙", "奶油猫", "闪电狗", "月光兔", "极光鸟"]

export default function StudentStatusCard() {
  const router = useRouter()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [nickname, setNickname] = useState("")
  const [petName, setPetName] = useState("")
  const [petSpecies, setPetSpecies] = useState<PetSpecies>("云朵龙")
  const petGap =
    me?.ok
      ? Math.max(0, me.student.pet.level.nextLevelXp - me.student.pet.level.xp)
      : 0

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/auth/student/me", { cache: "no-store" })
        const data = (await res.json().catch(() => ({ ok: false }))) as MeResponse
        const next = res.ok ? data : { ok: false as const }
        setMe(next)
        if (next.ok) {
          setNickname(next.student.nickname)
          setPetName(next.student.pet.name)
          setPetSpecies(next.student.pet.species)
        }
      } catch {
        setMe({ ok: false })
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const logout = async () => {
    await fetch("/api/auth/student/logout", { method: "POST" })
    setMe({ ok: false })
    router.refresh()
  }

  const saveProfile = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/student/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          petName,
          petSpecies
        })
      })
      const data = (await res.json().catch(() => ({ ok: false }))) as MeResponse & {
        error?: string
      }
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "保存失败")
      }
      setMe(data)
      setEditorOpen(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-3xl border border-black/5 bg-white/60 p-5 dark:border-white/10 dark:bg-zinc-950/40">
      <div className="text-sm font-extrabold">账号</div>
      <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        {loading ? (
          "加载中..."
        ) : me?.ok ? (
          <>
            你好，<span className="font-extrabold">{me.student.nickname}</span>{" "}
            <span className="text-zinc-500 dark:text-zinc-400">({me.student.account})</span>
            {me.student.className ? (
              <span className="text-zinc-500 dark:text-zinc-400"> · {me.student.className}</span>
            ) : null}
          </>
        ) : (
          "还没有登录。"
        )}
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {me?.ok ? (
        <div className="mt-4 space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="grid gap-2 text-xs text-zinc-500 dark:text-zinc-400 sm:grid-cols-2">
              <div>
                积分：<span className="font-semibold">{me.student.pointsBalance ?? 0}</span>
              </div>
              <div>
                今日游戏积分：{" "}
                <span className="font-semibold">
                  {me.student.earnedToday ?? 0}/{me.student.dailyCap ?? 1000}
                </span>
              </div>
              <div>
                今日习题积分（独立）：{" "}
                <span className="font-semibold">
                  {me.student.exerciseEarnedToday ?? 0}/{me.student.exerciseDailyCap ?? 200}
                </span>
              </div>
              <div>
                宠物等级：<span className="font-semibold">Lv. {me.student.pet.level.level}</span>
              </div>
              <div>
                宠物名称：<span className="font-semibold">{me.student.pet.name}</span>
              </div>
              <div>
                宠物种类：<span className="font-semibold">{me.student.pet.species}</span>
              </div>
              <div>
                宠物阶段：<span className="font-semibold">{me.student.pet.stage}</span>
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-black/10 bg-[linear-gradient(145deg,#fff7e5,white_55%,#ebf7ff)] p-4 dark:border-white/10 dark:bg-[linear-gradient(145deg,#23180f,#111827_55%,#0f172a)]">
              <div className="text-xs font-black uppercase tracking-[0.24em] text-amber-700 dark:text-amber-200">
                Pet
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-5xl shadow-sm dark:bg-zinc-900">
                  {petEmoji(me.student.pet.species)}
                </div>
                <div>
                  <div className="text-lg font-black text-zinc-950 dark:text-white">
                    {me.student.pet.name}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {me.student.pet.species} · 进度 {me.student.pet.level.progressPct}%
                  </div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    成长值 {me.student.pet.level.xp}/{me.student.pet.level.nextLevelXp} · 还差 {petGap}
                  </div>
                </div>
              </div>
              <Link href="/pet" prefetch={false} className="mt-4 inline-flex text-sm font-semibold text-zinc-800 hover:underline dark:text-zinc-200">
                查看宠物详情
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setEditorOpen(true)}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              编辑个人信息
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-4 text-sm font-extrabold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              退出登录
            </button>
          </div>
        </div>
      ) : null}

      {me?.ok && editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-2xl rounded-[2rem] border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xl font-black text-zinc-950 dark:text-white">编辑个人信息</div>
                <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  修改昵称、宠物名称和宠物种类。
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-zinc-700 dark:border-white/10 dark:text-zinc-200"
              >
                关闭
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">昵称</span>
                <input
                  value={nickname}
                  onChange={event => setNickname(event.target.value)}
                  className="h-11 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">宠物名称</span>
                <input
                  value={petName}
                  onChange={event => setPetName(event.target.value)}
                  className="h-11 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">换一个宠物</span>
                <select
                  value={petSpecies}
                  onChange={event => setPetSpecies(event.target.value as PetSpecies)}
                  className="h-11 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-950/40"
                >
                  {PET_OPTIONS.map(item => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                {saving ? "保存中..." : "保存信息"}
              </button>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-4 text-sm font-extrabold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!me?.ok ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/login?next=%2Fme"
            className="inline-flex h-10 items-center justify-center rounded-2xl bg-zinc-950 px-4 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            去登录
          </Link>
        </div>
      ) : null}
    </div>
  )
}
