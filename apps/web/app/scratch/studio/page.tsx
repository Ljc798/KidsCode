import TopNav from "@/app/components/TopNav"
import ScratchStudioClient from "@/app/scratch/studio/ScratchStudioClient"

export default function ScratchStudioPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.emerald.100),transparent),radial-gradient(900px_450px_at_90%_10%,theme(colors.sky.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.emerald.950),transparent),radial-gradient(900px_450px_at_90%_10%,theme(colors.sky.950),transparent)]">
      <TopNav active="scratch" />
      <ScratchStudioClient />
    </div>
  )
}
