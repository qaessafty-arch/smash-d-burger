import fs from 'node:fs'
import path from 'node:path'
import { uploadDir } from '@/lib/server/uploads'

const TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' }

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params
  const m = /^[A-Za-z0-9_-]{8,40}\.(png|jpg|webp|gif)$/.exec(name) // no path separators possible
  if (!m) return new Response('Not found', { status: 404 })
  const file = path.join(uploadDir(), name)
  if (!fs.existsSync(file)) return new Response('Not found', { status: 404 })
  return new Response(fs.readFileSync(file), {
    headers: { 'Content-Type': TYPES[m[1]], 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' },
  })
}
