"use client"

import { useRef } from "react"

const PAIRS: Record<string, string> = {
  "(": ")",
  "[": "]",
  "{": "}",
  "<": ">",
  '"': '"',
  "'": "'"
}

export default function CodeEditor({
  value,
  onChange,
  placeholder,
  readOnly = false,
  className = ""
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  readOnly?: boolean
  className?: string
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null)

  const setSelection = (start: number, end = start) => {
    requestAnimationFrame(() => {
      ref.current?.setSelectionRange(start, end)
    })
  }

  return (
    <textarea
      ref={ref}
      value={value}
      readOnly={readOnly}
      spellCheck={false}
      placeholder={placeholder}
      onChange={event => onChange(event.target.value)}
      onKeyDown={event => {
        if (readOnly) return
        const element = event.currentTarget
        const start = element.selectionStart
        const end = element.selectionEnd
        const selected = value.slice(start, end)

        if (event.key === "Tab") {
          event.preventDefault()
          const nextValue = `${value.slice(0, start)}  ${value.slice(end)}`
          onChange(nextValue)
          setSelection(start + 2)
          return
        }

        if (event.key === "Enter") {
          const lineStart = value.lastIndexOf("\n", start - 1) + 1
          const indent = value.slice(lineStart, start).match(/^\s*/)?.[0] ?? ""
          const prevChar = value[start - 1]
          const nextChar = value[start]

          if (prevChar === "{" && nextChar === "}") {
            event.preventDefault()
            const insert = `\n${indent}  \n${indent}`
            const nextValue = `${value.slice(0, start)}${insert}${value.slice(end)}`
            onChange(nextValue)
            setSelection(start + indent.length + 3)
            return
          }

          if (indent) {
            event.preventDefault()
            const insert = `\n${indent}`
            const nextValue = `${value.slice(0, start)}${insert}${value.slice(end)}`
            onChange(nextValue)
            setSelection(start + insert.length)
          }
          return
        }

        const close = PAIRS[event.key]
        if (!close) return

        event.preventDefault()
        const nextValue = `${value.slice(0, start)}${event.key}${selected}${close}${value.slice(end)}`
        onChange(nextValue)

        if (selected) {
          setSelection(start + 1, start + 1 + selected.length)
        } else {
          setSelection(start + 1)
        }
      }}
      className={className}
    />
  )
}
