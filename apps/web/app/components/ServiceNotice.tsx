"use client"

import { useEffect, useState } from "react"

export default function ServiceNotice() {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // 禁止页面滚动
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  if (dismissed) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-md rounded-3xl border border-white/30 bg-gradient-to-br from-amber-50 via-white to-sky-50 p-8 shadow-2xl backdrop-blur-md dark:border-white/10 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900">
        {/* 关闭按钮 */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-400 shadow-md hover:text-zinc-600 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-300"
          aria-label="关闭通知"
        >
          ✕
        </button>

        {/* 小装饰 */}
        <div className="absolute -left-4 bottom-4 text-3xl select-none pointer-events-none">💌</div>

        <div className="text-center">
          <h2 className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
            📢 小通知
          </h2>

          <p className="mt-4 text-base leading-7 text-zinc-700 dark:text-zinc-200">
            亲爱的小同学，我们的网站要给自己放个小假啦～
          </p>
          <p className="mt-2 text-base leading-7 text-zinc-700 dark:text-zinc-200">
            <span className="font-bold text-fuchsia-600 dark:text-fuchsia-400">8 月 2 日</span>
            起网站会暂停服务哦。
          </p>

          <div className="mt-5 rounded-2xl border border-dashed border-sky-300 bg-sky-50/80 px-4 py-3 dark:border-sky-700 dark:bg-sky-950/40">
            <p className="text-sm text-zinc-700 dark:text-zinc-200">
              如果需要获取数据，或者想跟老师聊天，
            </p>
            <p className="mt-1 text-sm font-bold text-sky-600 dark:text-sky-400">
              请加老师的微信：
            </p>
            <p className="mt-1 text-lg font-extrabold tracking-wide text-sky-700 dark:text-sky-300">
              ljc16607923402
            </p>
          </div>

          <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
            谢谢你的理解，我们很快会再见面的！🌈
          </p>
        </div>
      </div>
    </div>
  )
}
