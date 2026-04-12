const attempts = new Map<string, { count: number; resetAt: number }>()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export function checkRateLimit(key: string): { allowed: boolean; remaining: number; retryAfterMs: number } {
  return checkRateLimitCustom(key, MAX_ATTEMPTS, WINDOW_MS)
}

export function checkRateLimitCustom(
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now()
  const entry = attempts.get(key)

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxAttempts - 1, retryAfterMs: 0 }
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, remaining: 0, retryAfterMs: entry.resetAt - now }
  }

  entry.count++
  return { allowed: true, remaining: maxAttempts - entry.count, retryAfterMs: 0 }
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now()
  const keys = Array.from(attempts.keys())
  for (const key of keys) {
    const entry = attempts.get(key)
    if (entry && now > entry.resetAt) attempts.delete(key)
  }
}, 60 * 1000)
