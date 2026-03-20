import TopNav from "@/app/components/TopNav"
import StudentLoginClient from "@/app/login/StudentLoginClient"
import { Suspense } from "react"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.100),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.950),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.950),transparent)]">
      <TopNav />
      <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-6xl items-center justify-center px-4 py-10">
        <Suspense
          fallback={
            <div className="mx-auto h-[360px] w-full max-w-md animate-pulse rounded-[2rem] border border-black/5 bg-white/70 p-7 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50" />
          }
        >
          <StudentLoginClient />
        </Suspense>
      </main>
    </div>
  )
}
