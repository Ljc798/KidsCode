import TopNav from "@/app/components/TopNav"
import PetStatusPanel from "@/app/pet/PetStatusPanel"
import PetClassGallery from "@/app/pet/PetClassGallery"

export default function PetPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.amber.100),transparent),radial-gradient(900px_420px_at_85%_15%,theme(colors.sky.100),transparent)] dark:bg-[radial-gradient(900px_450px_at_10%_10%,theme(colors.amber.950),transparent),radial-gradient(900px_420px_at_85%_15%,theme(colors.sky.950),transparent)]">
      <TopNav active="pet" />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-[2.2rem] border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-950/50 sm:p-8">
          <h1 className="text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
            电子宠物
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            你的成长系统已经切换成电子宠物成长。玩游戏、做题、积累积分，都会让宠物慢慢升级。
          </p>

          <div className="mt-8">
            <PetStatusPanel />
          </div>

          <PetClassGallery />
        </div>
      </main>
    </div>
  )
}
