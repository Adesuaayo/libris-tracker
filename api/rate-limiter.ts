/**
 * In-memory rate limiter for Vercel Functions
 * Tracks API calls per user with a sliding window
 * Note: This resets when the function instance restarts (normal for serverless)
 * For persistent rate limiting, use Redis or a database
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_CALLS = 3; // 3 calls per minute per user

export const checkRateLimit = (userId: string): { allowed: boolean; remaining: number; resetIn: number } => {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitStore.set(userId, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_CALLS - 1, resetIn: WINDOW_MS };
  }

  if (entry.count < MAX_CALLS) {
    entry.count++;
    const remaining = MAX_CALLS - entry.count;
    const resetIn = entry.resetTime - now;
    return { allowed: true, remaining, resetIn };
  }

  // Limit exceeded
  const resetIn = entry.resetTime - now;
  return { allowed: false, remaining: 0, resetIn };
};
