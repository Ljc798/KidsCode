import TopNav from "@/app/components/TopNav"
import CppKnowledgeList from "@/app/knowledge/cpp/CppKnowledgeList"
import Link from "next/link"

export default function CppKnowledgeIndexPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.100),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.950),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.950),transparent)]">
      <TopNav active="knowledge" />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50">
          <h1 className="text-2xl font-extrabold tracking-tight">知识大全</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            这里收录 C++ 学习要点，按课时阅读。
          </p>
        </div>

        <Link
          href="/knowledge/cpp/foundation"
          className="mt-4 block rounded-3xl border border-black/10 bg-white/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-zinc-950/60"
        >
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
            新板块
          </div>
          <div className="mt-2 text-lg font-extrabold tracking-tight text-zinc-950 dark:text-white">
            C++ 语法训练营
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            自动判题，空格宽松，关键语法严格。适合先练基础再进课堂题目。
          </p>
        </Link>

        <CppKnowledgeList />
      </main>
    </div>
  )
}
