export const DAILY_POINTS_CAP = 1000

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

export function localDateKey(d = new Date()) {
  // Use local timezone day boundary (kid-facing).
  const y = d.getFullYear()
  const m = pad2(d.getMonth() + 1)
  const day = pad2(d.getDate())
  return `${y}-${m}-${day}`
}

function storageKey(dateKey: string) {
  return `kidscode_points_earned_${dateKey}`
}

export function getEarnedPointsToday(now = new Date()) {
  if (typeof window === "undefined") return 0
  const key = storageKey(localDateKey(now))
  const raw = window.localStorage.getItem(key)
  const n = raw == null ? 0 : Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

export function addEarnedPointsToday(delta: number, now = new Date()) {
  if (typeof window === "undefined") return { earnedToday: 0, added: 0 }
  const date = localDateKey(now)
  const key = storageKey(date)
  const current = getEarnedPointsToday(now)
  const remaining = Math.max(0, DAILY_POINTS_CAP - current)
  const toAdd = Math.max(0, Math.min(Math.floor(delta), remaining))
  const next = current + toAdd
  window.localStorage.setItem(key, String(next))
  return { earnedToday: next, added: toAdd }
}

