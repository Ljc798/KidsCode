"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { apiFetch } from "@/app/lib/api"

type Student = {
  id: string
  phone: string
  nickname: string
  age: number
  createdAt: string
}

export default function EditStudentPage() {
  const router = useRouter()
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id

  const [phone, setPhone] = useState("")
  const [nickname, setNickname] = useState("")
  const [age, setAge] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const messageFromError = (e: unknown) =>
    e instanceof Error ? e.message : "Something went wrong"

  useEffect(() => {
    const run = async () => {
      setError(null)
      setLoading(true)
      try {
        const data = await apiFetch<Student>(`/students/${id}`)
        setPhone(data.phone)
        setNickname(data.nickname)
        setAge(String(data.age))
      } catch (e: unknown) {
        setError(messageFromError(e))
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await apiFetch(`/students/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          phone,
          nickname,
          age: Number(age),
          ...(password.trim() ? { password } : {})
        })
      })
      router.push("/admin/students")
      router.refresh()
    } catch (e: unknown) {
      setError(messageFromError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit student</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Update student profile and user credentials.
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

      {loading ? (
        <div className="mt-6 text-sm text-zinc-600 dark:text-zinc-300">
          Loading...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:max-w-xl">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              Phone
            </span>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              type="tel"
              inputMode="numeric"
              className="h-10 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                Nickname
              </span>
              <input
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="Required"
                className="h-10 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
                required
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                Age
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
              New password
            </span>
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type="password"
              placeholder="Leave blank to keep current password"
              className="h-10 rounded-xl border border-black/10 bg-white/70 px-3 outline-none focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40"
            />
          </label>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
