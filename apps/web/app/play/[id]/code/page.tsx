import TopNav from "@/app/components/TopNav"
import CodeUnlockClient from "@/app/play/[id]/code/CodeUnlockClient"

export default async function PlayCodePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.100),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.950),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.950),transparent)]">
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <CodeUnlockClient id={id} />
      </main>
    </div>
  )
}

