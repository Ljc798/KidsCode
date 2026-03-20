
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

export function computePetMeatRequired(level: number) {
  const safeLevel = Math.max(1, Math.floor(level))
  return Math.min(12, 4 + Math.floor((safeLevel - 1) / 2))
}

export function applyPetMeatReward(input: {
  petXp: number
  petMeat: number
  addedMeat: number
}) {
  let nextXp = Math.max(0, Math.floor(input.petXp))
  let nextMeat = Math.max(0, Math.floor(input.petMeat)) + Math.max(0, Math.floor(input.addedMeat))
  let levelInfo = computeLevelFromXp(nextXp)
  let levelsGained = 0

  while (levelInfo.level < 50) {
    const neededMeat = computePetMeatRequired(levelInfo.level)
    if (nextMeat < neededMeat) break
    nextMeat -= neededMeat
    nextXp = Math.max(nextXp, levelInfo.nextLevelXp)
    levelsGained += 1
    levelInfo = computeLevelFromXp(nextXp)
  }

  return {
    petXp: nextXp,
    petMeat: nextMeat,
    levelsGained
  }
}

export function buildPetProfile(input: {
  petName: string
  petSpecies: string
  petXp: number
  petMeat: number
  petMood: number
  petEnergy: number
}) {
  const level = computeLevelFromXp(input.petXp)
  const safeMeat = Math.max(0, Math.floor(input.petMeat))
  const meatRequired = computePetMeatRequired(level.level)
  const safeMood = Math.max(0, Math.min(100, Math.floor(input.petMood)))
  const safeEnergy = Math.max(0, Math.min(100, Math.floor(input.petEnergy)))

  let stage = "宠物蛋"
  if (level.level >= 15) stage = "传说伙伴"
  else if (level.level >= 10) stage = "闪耀守护者"
  else if (level.level >= 5) stage = "进阶冒险家"
  else if (level.level >= 2) stage = "新手伙伴"

  return {
    name: input.petName,
    species: input.petSpecies,
    meat: safeMeat,
    meatPerLevel: meatRequired,
    mood: safeMood,
    energy: safeEnergy,
    stage,
    level
  }
}
