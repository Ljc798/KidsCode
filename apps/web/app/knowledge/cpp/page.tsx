import TopNav from "@/app/components/TopNav"
import CppKnowledgeList from "@/app/knowledge/cpp/CppKnowledgeList"

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

        <CppKnowledgeList />
      </main>
    </div>
  )
}

