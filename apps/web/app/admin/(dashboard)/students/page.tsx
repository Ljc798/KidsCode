"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { apiFetch } from "@/app/lib/api"

type Student = {
  id: string
  account: string
  nickname: string
  age: number
  className: string | null
  concept: "BRANCH" | "LOOP"
  createdAt: string
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)

  const messageFromError = (e: unknown) =>
    e instanceof Error ? e.message : "Something went wrong"

  const fetchStudents = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const data = await apiFetch<Student[]>("/students")
      setStudents(data)
    } catch (e: unknown) {
      setError(messageFromError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const deleteStudent = async (id: string) => {
    const ok = confirm("Delete this student? This also removes the user account.")
    if (!ok) return
    setError(null)
    try {
      await apiFetch<{ success: true }>(`/students/${id}`, { method: "DELETE" })
      await fetchStudents()
    } catch (e: unknown) {
      setError(messageFromError(e))
    }
  }

  const filtered = students.filter(s => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      s.account.toLowerCase().includes(q) ||
      s.nickname.toLowerCase().includes(q) ||
      (s.className ?? "").toLowerCase().includes(q) ||
      String(s.age).includes(q)
    )
  })

  return (
    <div className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/60">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Manage student accounts used by the platform.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search account / nickname / age"
            className="h-10 w-full rounded-xl border border-black/10 bg-white/70 px-3 text-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-black/20 dark:border-white/10 dark:bg-zinc-900/40 dark:placeholder:text-zinc-500 sm:w-64"
          />
          <Link
            href="/admin/students/create"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            New student
          </Link>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
        <div className="grid grid-cols-12 gap-2 bg-zinc-950/10 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:bg-white/5 dark:text-zinc-200">
          <div className="col-span-3">Account</div>
          <div className="col-span-3">Nickname</div>
          <div className="col-span-1">Progress</div>
          <div className="col-span-1 text-right">Age</div>
          <div className="col-span-1">Class</div>
          <div className="col-span-2">Created</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-sm text-zinc-600 dark:text-zinc-300">
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-sm text-zinc-600 dark:text-zinc-300">
            No students found.
          </div>
        ) : (
          <div className="divide-y divide-black/10 bg-white/50 text-sm dark:divide-white/10 dark:bg-zinc-950/40">
            {filtered.map(student => (
              <div
                key={student.id}
                className="grid grid-cols-12 items-center gap-2 px-4 py-3"
              >
                <div className="col-span-3 truncate font-medium text-zinc-950 dark:text-white">
                  {student.account}
                </div>
                <div className="col-span-3 truncate text-zinc-700 dark:text-zinc-200">
                  {student.nickname}
                </div>
                <div className="col-span-1 truncate text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                  {student.concept === "LOOP" ? "循环" : "分支"}
                </div>
                <div className="col-span-1 text-right tabular-nums text-zinc-700 dark:text-zinc-200">
                  {student.age}
                </div>
                <div className="col-span-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {student.className ?? "-"}
                </div>
                <div className="col-span-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {new Date(student.createdAt).toLocaleDateString()}
                </div>
                <div className="col-span-1 flex justify-end gap-2">
                  <Link
                    href={`/admin/students/${student.id}`}
                    className="rounded-lg border border-black/10 bg-white/70 px-2 py-1 text-xs font-semibold text-zinc-900 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => deleteStudent(student.id)}
                    className="rounded-lg border border-red-500/25 bg-red-500/5 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-500/10 dark:text-red-200"
                  >
                    Delete
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
