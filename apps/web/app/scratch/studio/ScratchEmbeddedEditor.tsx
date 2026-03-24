"use client"

export default function ScratchEmbeddedEditor() {
  return (
    <div className="h-[72vh] overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-900/40">
      <iframe
        id="kidscode-scratch-editor-frame"
        title="Scratch Editor"
        src="/scratch-gui/index.html?locale=zh-cn&lang=zh-cn"
        className="h-full w-full"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  )
}
