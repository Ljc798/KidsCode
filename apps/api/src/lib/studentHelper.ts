
export function shanghaiDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ""
  return `${get("year")}-${get("month")}-${get("day")}`
}

export function computeLevelFromXp(xp: number) {
  // Simple, tunable curve:
  // nextLevelXp = 100 * level * (level + 1) / 2
  const x = Math.max(0, Math.floor(xp))
  let level = 1
  while (true) {
    const nextLevelXp = Math.floor((100 * level * (level + 1)) / 2)
    if (x < nextLevelXp) {
      const prevLevelXp = level === 1 ? 0 : Math.floor((100 * (level - 1) * level) / 2)
      const span = Math.max(1, nextLevelXp - prevLevelXp)
      const progressPct = Math.floor(((x - prevLevelXp) / span) * 100)
      return { level, xp: x, prevLevelXp, nextLevelXp, progressPct }
    }
    level++
    if (level > 50) {
      return { level: 50, xp: x, prevLevelXp: 0, nextLevelXp: x, progressPct: 100 }
    }
  }
}
