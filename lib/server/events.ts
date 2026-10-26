import 'server-only'
import { EventEmitter } from 'node:events'

/**
 * In-process pub/sub that feeds Server-Sent Events. Clients also poll, so a dropped
 * stream (or a multi-process deployment) degrades to slower updates, never to a broken UI.
 */
type G = typeof globalThis & { __sbBus?: EventEmitter }
const bus = ((globalThis as G).__sbBus ??= Object.assign(new EventEmitter(), {}))
bus.setMaxListeners(0)

export type Topic = 'staff' | 'kitchen' | `order:${string}`

export function publish(topic: Topic, event: string, data: Record<string, unknown> = {}) {
  bus.emit(topic, { event, data, at: Date.now() })
}

export function sseStream(topics: Topic[], signal: AbortSignal) {
  const enc = new TextEncoder()
  let cleanup = () => {}
  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try { controller.enqueue(enc.encode(chunk)) } catch { cleanup() }
      }
      const handlers = topics.map((t) => {
        const h = (msg: { event: string; data: unknown; at: number }) =>
          send(`event: ${msg.event}\ndata: ${JSON.stringify({ ...(msg.data as object), topic: t })}\n\n`)
        bus.on(t, h)
        return [t, h] as const
      })
      const beat = setInterval(() => send(': keep-alive\n\n'), 25_000)
      cleanup = () => {
        clearInterval(beat)
        handlers.forEach(([t, h]) => bus.off(t, h))
        try { controller.close() } catch {}
      }
      signal.addEventListener('abort', cleanup)
      send('retry: 3000\n\nevent: ready\ndata: {}\n\n')
    },
    cancel() { cleanup() },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
