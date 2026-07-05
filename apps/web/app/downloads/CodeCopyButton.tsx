"use client"

import { useEffect, useState } from "react"

type CopyState = "idle" | "copied" | "failed"

export default function CodeCopyButton({ code }: { code: string }) {
  const [state, setState] = useState<CopyState>("idle")

  useEffect(() => {
    if (state === "idle") return

    const timer = window.setTimeout(() => setState("idle"), 2000)
    return () => window.clearTimeout(timer)
  }, [state])

  async function copyCode() {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(code)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = code
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        const copied = document.execCommand("copy")
        textarea.remove()
        if (!copied) throw new Error("Copy command failed")
      }
      setState("copied")
    } catch {
      setState("failed")
    }
  }

  return (
    <button
      type="button"
      onClick={copyCode}
      className="inline-flex h-9 min-w-20 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:text-emerald-200"
      aria-live="polite"
    >
      {state === "copied" ? "已复制" : state === "failed" ? "复制失败" : "复制代码"}
    </button>
  )
}
