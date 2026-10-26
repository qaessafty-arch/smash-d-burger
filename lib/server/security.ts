import 'server-only'
import crypto from 'node:crypto'

/** Random URL-safe secret. 24 bytes = 192 bits, far beyond guessable. */
export function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url')
}

/** Only hashes of bearer tokens are stored, so a leaked DB cannot be replayed. */
export function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

export function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb)
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, 64)
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, saltB64, hashB64] = stored.split('$')
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false
  const expected = Buffer.from(hashB64, 'base64')
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length)
  return crypto.timingSafeEqual(expected, actual)
}

/** 6-digit numeric code using a CSPRNG (no modulo bias for this range in practice). */
export function randomCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

// ---- tiny in-memory sliding-window rate limiter (single-process deployment) ----
type G = typeof globalThis & { __sbRate?: Map<string, number[]> }
const buckets: Map<string, number[]> = ((globalThis as G).__sbRate ??= new Map<string, number[]>())

/** Returns true if the call is allowed. */
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const hits = (buckets.get(key) ?? []).filter((t: number) => now - t < windowMs)
  if (hits.length >= max) {
    buckets.set(key, hits)
    return false
  }
  hits.push(now)
  buckets.set(key, hits)
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t: number) => now - t < windowMs)) buckets.delete(k)
  }
  return true
}

export function resetRateLimits() {
  buckets.clear()
}
