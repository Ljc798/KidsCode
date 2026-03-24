import Link from "next/link"
import Image from "next/image"

export default function TopNav({
  active
}: {
  active?: "home" | "games" | "exercises" | "pet" | "knowledge" | "scratch" | "me"
}) {
  const item = (
    href: string,
    label: string,
    key: "home" | "games" | "exercises" | "pet" | "knowledge" | "scratch" | "me"
  ) => {
    const isActive = active === key
    return (
      <Link
        href={href}
        prefetch={false}
        className={[
          "rounded-2xl px-3 py-2 text-sm font-semibold transition",
          isActive
            ? "bg-zinc-950 text-white shadow-sm dark:bg-white dark:text-zinc-950"
            : "text-zinc-800 hover:bg-zinc-950/5 dark:text-zinc-100 dark:hover:bg-white/10"
        ].join(" ")}
      >
        {label}
      </Link>
    )
  }

  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-white/60 backdrop-blur dark:border-white/10 dark:bg-zinc-950/50">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl border border-black/5 bg-white/70 shadow-sm dark:border-white/10 dark:bg-white/5">
            <Image src="/logo.png" alt="KidsCode" width={36} height={36} />
          </span>
          <span className="text-base font-extrabold tracking-tight">
            KidsCode
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {item("/", "首页", "home")}
          {item("/games", "游戏大全", "games")}
          {item("/exercises", "习题大全", "exercises")}
          {item("/scratch/studio", "Scratch", "scratch")}
          {item("/pet", "电子宠物", "pet")}
          {item("/knowledge/cpp", "知识大全", "knowledge")}
          {item("/me", "我的", "me")}
        </nav>
      </div>
    </header>
  )
}
