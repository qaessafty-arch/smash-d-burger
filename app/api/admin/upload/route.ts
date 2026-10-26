import fs from 'node:fs'
import path from 'node:path'
import { ApiError, json, limit, route } from '@/lib/server/http'
import { audit, requireStaff } from '@/lib/server/auth'
import { randomToken } from '@/lib/server/security'
import { uploadDir } from '@/lib/server/uploads'

const MAX = 4 * 1024 * 1024

function sniff(b: Buffer): 'png' | 'jpg' | 'webp' | 'gif' | null {
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg'
  if (b.length > 12 && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return 'webp'
  if (b.length > 6 && ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString())) return 'gif'
  return null
}

export const POST = route(async (req) => {
  const staff = await requireStaff('manager', 'admin')
  limit(`upload:${staff.id}`, 30, 10 * 60_000)
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) throw new ApiError(400, 'Choose an image', 'invalid')
  if (file.size > MAX) throw new ApiError(413, 'Image must be 4 MB or smaller', 'too_large')
  const buf = Buffer.from(await file.arrayBuffer())
  const ext = sniff(buf) // trust file contents, never the client-supplied name or type
  if (!ext) throw new ApiError(415, 'Only PNG, JPG, WebP or GIF images are allowed', 'bad_type')
  const dir = uploadDir()
  fs.mkdirSync(dir, { recursive: true })
  const name = `${randomToken(12)}.${ext}`
  fs.writeFileSync(path.join(dir, name), buf)
  audit(staff, staff.name, 'upload', name)
  return json({ url: `/uploads/${name}` }, { status: 201 })
})
