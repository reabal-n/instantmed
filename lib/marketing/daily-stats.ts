/**
 * Deterministic daily stats for marketing pages.
 * Seeded by date so values are stable per day and look realistic.
 */

function hash(n: number): number {
  return ((n * 2654435761) >>> 0) / 4294967296
}

function dateSeed(): number {
  const today = new Date()
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
}

export function getDailyStats(offset = 0): {
  reviewedToday: number
  avgReviewTime: number
  rating: number
} {
  const seed = dateSeed() + offset
  return {
    reviewedToday: 8 + Math.floor(hash(seed) * 13), // 8–20
    avgReviewTime: 19 + Math.floor(hash(seed + 1) * 24), // 19–42 min
    rating: (4.8 + hash(seed + 2) * 0.1) as number, // 4.8–4.9
  }
}
