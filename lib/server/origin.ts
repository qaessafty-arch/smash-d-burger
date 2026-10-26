import 'server-only'

/** Public origin of this request, honouring reverse-proxy headers (used for QR links and redirects). */
export function originOf(req: Request) {
  const h = req.headers
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? new URL(req.url).host
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : new URL(req.url).protocol.replace(':', ''))
  return `${proto}://${host}`
}
