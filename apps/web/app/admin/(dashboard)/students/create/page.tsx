"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { apiFetch } from "@/app/lib/api"

export default function CreateStudentPage() {
  const [account, setAccount] = useState("")
  const [password, setPassword] = useState("123456")
  const [nickname, setNickname] = useState("")
  const [age, setAge] = useState("")
  const [className, setClassName] = useState("")
  const [concept, setConcept] = useState<"BRANCH" | "LOOP">("BRANCH")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  const messageFromError = (e: unknown) =>
    e instanceof Error ? e.message : "Something went wrong"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await apiFetch("/students", {
        method: "POST",
        body: JSON.stringify({
          account,
          password,
          nickname,
          age: Number(age),
          className: className.trim() ? className : null,
          concept
        })
      })
      router.push("/admin/students")
      router.refresh()
    } catch (e: unknown) {
      setError(messageFromError(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New student</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Creates a user with role STUDENT and a linked student profile.
          </p>
        </div>
        <Link
          href="/admin/students"
          className="text-sm font-semibold text-zinc-800 hover:underline dark:text-zinc-200"
        >
          Back
        </Link>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:max-w-xl">
        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            账号（字母/数字/_/-）
          </span>
          <input
            value={account}
            onChange={e => setAccount(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="例如：yang_jingchen-01"
            className="h-10 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
            required
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            密码
          </span>
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            className="h-10 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              昵称
            </span>
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              className="h-10 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
              required
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              年龄
            </span>
            <input
              type="number"
              min={1}
              value={age}
              onChange={e => setAge(e.target.value)}
              className="h-10 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
              required
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            班级
          </span>
          <input
            value={className}
            onChange={e => setClassName(e.target.value)}
            placeholder="例如：M1 / M2 / A1 / E1"
            className="h-10 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            学习进度（解锁）
          </span>
          <select
            value={concept}
            onChange={e => setConcept(e.target.value === "LOOP" ? "LOOP" : "BRANCH")}
            className="h-10 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
          >
            <option value="BRANCH">分支（if / else）</option>
            <option value="LOOP">循环（for / while）</option>
          </select>
        </label>

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {submitting ? "创建中..." : "创建学生"}
          </button>
        </div>
      </form>
    </div>
  )
}
