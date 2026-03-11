"use client"

import { useMemo, useState } from "react"
import { getConcept, setConcept } from "@/app/lib/progress"
import type { Concept } from "@/app/lib/games"

export default function ConceptPicker() {
  const initial = useMemo(() => getConcept(), [])
  const [concept, setLocal] = useState<Concept>(initial)

  const pick = (c: Concept) => {
    setLocal(c)
    setConcept(c)
  }

  const btn = (c: Concept, label: string, desc: string) => {
    const active = concept === c
    return (
      <button
        type="button"
        onClick={() => pick(c)}
        className={[
          "w-full rounded-3xl border p-5 text-left shadow-sm transition",
          active
            ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
            : "border-black/10 bg-white/60 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
        ].join(" ")}
      >
        <div className="text-sm font-extrabold">{label}</div>
        <div
          className={[
            "mt-1 text-sm",
            active ? "text-white/90 dark:text-zinc-700" : "text-zinc-600 dark:text-zinc-300"
          ].join(" ")}
        >
          {desc}
        </div>
      </button>
    )
  }

  return (
    <div className="rounded-3xl border border-black/5 bg-white/60 p-5 dark:border-white/10 dark:bg-zinc-950/40">
      <div className="text-sm font-extrabold">我的学习进度 (演示)</div>
      <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        用来控制哪些游戏可玩。后续会改成从账号进度读取。
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {btn("BRANCH", "我学到分支", "会 if / else，能做选择判断")}
        {btn("LOOP", "我学到循环", "会 for / while，能重复执行动作")}
      </div>
    </div>
  )
}
