import TopNav from "@/app/components/TopNav"
import ExerciseDetailClient from "@/app/exercises/[slug]/ExerciseDetailClient"

export default function ExerciseDetailPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(1000px_500px_at_10%_0%,rgba(245,158,11,0.24),transparent),radial-gradient(920px_480px_at_92%_18%,rgba(14,165,233,0.18),transparent),linear-gradient(180deg,#fffaf0,#f8fafc)] dark:bg-[radial-gradient(1000px_500px_at_10%_0%,rgba(245,158,11,0.12),transparent),radial-gradient(920px_480px_at_92%_18%,rgba(14,165,233,0.12),transparent),linear-gradient(180deg,#09090b,#111827)]">
      <TopNav active="exercises" />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <ExerciseDetailClient />
      </main>
    </div>
  )
}
