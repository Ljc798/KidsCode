"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { apiFetch } from "@/app/lib/api"
import { getConcept } from "@/app/lib/progress"
import TopNav from "@/app/components/TopNav"

type ValidateResponse = { ok: boolean; message: string }

export default function CodeUnlockPage({
  params
}: {
  params: { id: string }
}) {
  const id = params.id
  const concept = useMemo(() => getConcept(), [])
  const [code, setCode] = useState(
    concept === "LOOP"
      ? "for (let i = 0; i < 3; i++) {\n  // TODO: 收集一颗星星\n}\n"
      : "if (true) {\n  // TODO: 做一个选择\n} else {\n  // TODO: 另一个选择\n}\n"
  )
  const [result, setResult] = useState<ValidateResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const prompt =
    concept === "LOOP"
      ? "目标: 用循环让角色重复动作 3 次。至少包含一个 for 或 while。"
      : "目标: 用分支做出选择。至少包含一个 if。"

  const submit = async () => {
    setSubmitting(true)
    setResult(null)
    try {
      const res = await apiFetch<ValidateResponse>(`/minigames/${id}/validate`, {
        method: "POST",
        body: JSON.stringify({ concept, code })
      })
      setResult(res)
    } catch (e: unknown) {
      setResult({ ok: false, message: e instanceof Error ? e.message : "验证失败" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.100),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.950),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.950),transparent)]">
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-[2rem] border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            我自己来 (写代码解锁)
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
            {id} 代码挑战
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            {prompt} 当前进度:{" "}
            <span className="font-mono">{concept}</span>
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-black/5 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="text-sm font-extrabold">写代码</div>
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                className="mt-3 h-72 w-full resize-none rounded-2xl border border-black/10 bg-white/70 p-3 font-mono text-sm outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
              />
              <div className="mt-3 flex gap-3">
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-zinc-950 px-5 text-sm font-extrabold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  {submitting ? "校验中..." : "提交校验"}
                </button>
                <Link
                  href={`/games/${id}`}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white/60 px-5 text-sm font-extrabold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  返回
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-black/5 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="text-sm font-extrabold">结果</div>
              <div className="mt-3 rounded-2xl border border-black/10 bg-white/70 p-4 text-sm dark:border-white/10 dark:bg-zinc-900/40">
                {result ? (
                  <div>
                    <div
                      className={[
                        "text-base font-extrabold",
                        result.ok ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-200"
                      ].join(" ")}
                    >
                      {result.ok ? "通过" : "未通过"}
                    </div>
                    <div className="mt-1 text-zinc-700 dark:text-zinc-200">
                      {result.message}
                    </div>
                  </div>
                ) : (
                  <div className="text-zinc-600 dark:text-zinc-300">
                    提交代码后会显示校验结果。通过后就可以继续玩游戏。
                  </div>
                )}
              </div>

              <div className="mt-3">
                <Link
                  href={result?.ok ? `/play/${id}?mode=code` : "#"}
                  aria-disabled={!result?.ok}
                  className={[
                    "inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-extrabold shadow-sm",
                    result?.ok
                      ? "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                      : "cursor-not-allowed border border-black/10 bg-white/60 text-zinc-400 dark:border-white/10 dark:bg-white/5 dark:text-zinc-500"
                  ].join(" ")}
                >
                  继续游戏
                </Link>
              </div>

              <div className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                说明: 现在是基础校验占位。后续可由教师端或更严格的运行沙盒来校验。
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
