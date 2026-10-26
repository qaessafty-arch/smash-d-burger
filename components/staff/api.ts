'use client'

export class ApiErr extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message) }
}

export async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const text = await res.text()
  let data: unknown = null
  try { data = text ? JSON.parse(text) : null } catch { /* non-JSON */ }
  if (!res.ok) {
    const d = (data ?? {}) as { error?: string; code?: string }
    throw new ApiErr(res.status, d.error ?? `Request failed (${res.status})`, d.code)
  }
  return data as T
}

export const iqd = (n: number) => `${n.toLocaleString('en-US')} IQD`
export const clock = (iso?: string | null) => iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''
export function ago(iso: string, now = Date.now()) {
  const m = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000))
  return m < 1 ? 'now' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`
}

export type Role = 'admin' | 'manager' | 'waiter' | 'kitchen'
export type Me = { id: number; username: string; name: string; role: Role }

export type OrderLite = {
  id: string; number: number; label: string; tableNumber: string; status: string; verificationStatus: string
  total: number; itemCount: number; createdAt: string; confirmedAt: string | null; customerNote: string; cancelReason: string
}
export type OrderFull = Omit<OrderLite, 'itemCount'> & {
  subtotal: number; tax: number; serviceCharge: number; internalNote: string; estReadyMinutes: number | null
  verifiedBy: string | null; verifiedAt: string | null
  items: Array<{ name: string; quantity: number; lineTotal: number; instructions: string; options: Array<{ group: string; name: string; delta: number }> }>
  timeline: Array<{ from: string | null; to: string; by: string; note: string; at: string }>
  allowed?: Array<{ to: string; roles: string[] }>
}

export const STATUS_LABEL: Record<string, string> = {
  awaiting_verification: 'Awaiting verification', verified: 'Verified', confirmed: 'Sent to kitchen', preparing: 'Preparing',
  ready: 'Ready', served: 'Served', completed: 'Completed', rejected: 'Rejected', cancelled: 'Cancelled',
}
