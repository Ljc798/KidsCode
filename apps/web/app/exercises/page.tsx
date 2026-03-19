import TopNav from "@/app/components/TopNav"
import ExerciseCatalogClient from "@/app/exercises/ExerciseCatalogClient"

export default function ExercisesPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(1000px_500px_at_12%_8%,rgba(251,191,36,0.25),transparent),radial-gradient(900px_450px_at_86%_16%,rgba(20,184,166,0.24),transparent),linear-gradient(180deg,#fffaf0,#f8fafc)] dark:bg-[radial-gradient(1000px_500px_at_12%_8%,rgba(251,191,36,0.16),transparent),radial-gradient(900px_450px_at_86%_16%,rgba(20,184,166,0.14),transparent),linear-gradient(180deg,#09090b,#111827)]">
      <TopNav active="exercises" />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-black/5 bg-white/75 p-7 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/55 sm:p-10">
          <div className="absolute -right-16 -top-12 h-52 w-52 rounded-full bg-amber-300/30 blur-3xl" />
          <div className="absolute -bottom-20 left-0 h-56 w-56 rounded-full bg-teal-300/25 blur-3xl" />
          <div className="relative max-w-3xl">
            <div className="text-xs font-black uppercase tracking-[0.32em] text-teal-700 dark:text-teal-300">
              Exercise Center
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-zinc-950 dark:text-white sm:text-5xl">
              习题大全
            </h1>
            <p className="mt-4 text-base leading-8 text-zinc-700 dark:text-zinc-200">
              每套题都包含 3 道选择题和 1 道编程题。进入页面前会校验学生登录，选择题自动乱序，编程题提交后进入后台等待老师批改。
            </p>
          </div>
        </section>

        <ExerciseCatalogClient />
      </main>
    </div>
  )
}
