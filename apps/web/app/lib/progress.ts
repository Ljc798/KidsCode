import type { Concept } from "@/app/lib/games"

const KEY = "kidscode:concept"

export function getConcept(): Concept {
  if (typeof window === "undefined") return "BRANCH"
  const raw = window.localStorage.getItem(KEY)
  return raw === "LOOP" ? "LOOP" : "BRANCH"
}

export function setConcept(concept: Concept) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(KEY, concept)
}
