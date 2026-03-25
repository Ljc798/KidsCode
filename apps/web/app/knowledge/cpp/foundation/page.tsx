import Link from "next/link"
import TopNav from "@/app/components/TopNav"
import FoundationTrainerClient from "@/app/knowledge/cpp/foundation/FoundationTrainerClient"

export default function CppFoundationPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.100),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.950),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.950),transparent)]">
      <TopNav active="knowledge" />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-3xl border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">C++ 语法训练营</h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                先练头文件、命名空间、主函数，再去做题和创作会更顺。
              </p>
            </div>
            <Link
              href="/knowledge/cpp"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-black/10 px-4 text-sm font-bold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/5"
            >
              返回知识大全
            </Link>
          </div>
        </div>

        <FoundationTrainerClient />
      </main>
    </div>
  )
}
