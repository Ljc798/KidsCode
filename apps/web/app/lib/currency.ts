export const POINTS_PER_COIN = 100

export function redeemableCoins(points: number) {
  return Math.floor(points / POINTS_PER_COIN)
}

export function redeemAll(points: number) {
  const coins = redeemableCoins(points)
  const remainingPoints = points - coins * POINTS_PER_COIN
  return { coins, remainingPoints }
}

