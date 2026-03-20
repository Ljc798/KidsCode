export function petEmoji(species: string) {
  if (species.includes("龙")) return "🐉"
  if (species.includes("猫")) return "🐱"
  if (species.includes("狗")) return "🐶"
  if (species.includes("兔")) return "🐰"
  if (species.includes("鸟")) return "🦜"
  return "✨"
}
