import TopNav from "@/app/components/TopNav"
import CppKnowledgeDetail from "@/app/knowledge/cpp/CppKnowledgeDetail"

export default async function CppKnowledgeDetailPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  return (
    <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.100),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.fuchsia.950),transparent),radial-gradient(800px_400px_at_80%_20%,theme(colors.lime.950),transparent)]">
      <TopNav active="knowledge" />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <CppKnowledgeDetail slug={slug} />
      </main>
    </div>
  )
}

