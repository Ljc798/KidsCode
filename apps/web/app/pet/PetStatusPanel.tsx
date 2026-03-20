"use client"

import { useEffect, useState } from "react"
import { petEmoji } from "@/app/lib/pet"

type MeResponse =
  | {
      ok: true
      student: {
        nickname: string
        pointsBalance: number
        starCoinsBalance: number
        pet: {
          name: string
          species: string
          meat: number
          meatPerLevel: number
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
type AdminMeResponse = { ok: true } | { ok: false }

function Meter({ label, value, tone }: { label: string; value: number; tone: string }) {
  const safe = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className="rounded-[1.4rem] border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-zinc-900/40">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-zinc-700 dark:text-zinc-200">{label}</span>
        <span className="font-black text-zinc-950 dark:text-white">{safe}%</span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-950/10 dark:bg-white/10">
        <div className={["h-3 rounded-full", tone].join(" ")} style={{ width: `${safe}%` }} />
      </div>
    </div>
  )
}

export default function PetStatusPanel() {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const adminRes = await fetch("/api/auth/admin/me", { cache: "no-store" })
        const adminData = (await adminRes.json().catch(() => ({ ok: false }))) as AdminMeResponse
        if (adminRes.ok && adminData.ok) {
          setIsAdmin(true)
          setMe({ ok: false })
        } else {
          const res = await fetch("/api/auth/student/me", { cache: "no-store" })
          const data = (await res.json().catch(() => ({ ok: false }))) as MeResponse
          if (res.ok) {
            setMe(data)
            setIsAdmin(false)
          } else {
            setMe({ ok: false })
            setIsAdmin(false)
          }
        }
      } catch {
        setMe({ ok: false })
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  if (loading) {
    return <div className="text-sm text-zinc-600 dark:text-zinc-300">宠物加载中...</div>
  }

  if (isAdmin) {
    return (
      <div className="rounded-[2rem] border border-black/10 bg-white/80 p-6 text-sm text-zinc-600 shadow-sm dark:border-white/10 dark:bg-zinc-950/50 dark:text-zinc-300">
        当前是管理员模式。下方可以按班级查看宠物卡片，并直接进行快速奖励。
      </div>
    )
  }

  if (!me?.ok) {
    return <div className="text-sm text-zinc-600 dark:text-zinc-300">请先登录后查看你的电子宠物。</div>
  }

  const { student } = me
  const { pet } = student

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="rounded-[2rem] border border-black/10 bg-[linear-gradient(160deg,#fff7e8,white_55%,#e9f8ff)] p-6 shadow-sm dark:border-white/10 dark:bg-[linear-gradient(160deg,#221915,#111827_55%,#0f172a)]">
        <div className="text-xs font-black uppercase tracking-[0.28em] text-amber-700 dark:text-amber-200">
          Electronic Pet
        </div>
        <div className="mt-5 flex items-center justify-center">
          <div className="relative flex h-48 w-48 items-center justify-center rounded-full bg-white shadow-inner dark:bg-zinc-900">
            <div className="absolute inset-6 rounded-full bg-gradient-to-br from-amber-200 via-lime-100 to-sky-100 blur-md dark:from-amber-700/30 dark:via-lime-700/20 dark:to-sky-700/20" />
            <div className="relative text-[86px] leading-none">{petEmoji(pet.species)}</div>
          </div>
        </div>
        <div className="mt-5 text-center">
          <div className="text-2xl font-black text-zinc-950 dark:text-white">{pet.name}</div>
          <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {pet.species} · {pet.stage}
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950/50">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                {student.nickname} 的宠物成长
              </div>
              <div className="mt-2 text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
                Lv. {pet.level.level}
              </div>
            </div>
            <div className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-black text-white dark:bg-white dark:text-zinc-950">
              {pet.level.progressPct}% 升级进度
            </div>
          </div>
          <div className="mt-4 h-4 overflow-hidden rounded-full bg-zinc-950/10 dark:bg-white/10">
            <div
              className="h-4 rounded-full bg-gradient-to-r from-amber-400 via-lime-400 to-sky-400"
              style={{ width: `${pet.level.progressPct}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-300">
            <div>成长值：{pet.level.xp}</div>
            <div>下一等级：{pet.level.nextLevelXp}</div>
            <div>
              肉肉：{pet.meat}/{pet.meatPerLevel}
            </div>
            <div>积分：{student.pointsBalance}</div>
            <div>星空币：{student.starCoinsBalance}</div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Meter label="心情" value={pet.mood} tone="bg-gradient-to-r from-pink-400 to-rose-400" />
          <Meter label="体力" value={pet.energy} tone="bg-gradient-to-r from-sky-400 to-cyan-400" />
        </div>

        <div className="rounded-[2rem] border border-black/10 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950/50">
          <div className="text-lg font-black text-zinc-950 dark:text-white">成长说明</div>
          <div className="mt-3 space-y-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            <p>完成小游戏、提交代码和日常得分都会推动电子宠物成长。</p>
            <p>老师也可以直接奖励肉肉。每升到更高等级，下一次升级需要的肉肉也会更多。</p>
            <p>成长值越高，宠物等级越高，阶段也会从新手伙伴逐步进化成传说伙伴。</p>
            <p>老师仍然可以控制学习解锁进度，但首页展示的成长系统现在完全改成宠物成长。</p>
          </div>
        </div>
      </div>
    </div>
  )
}
