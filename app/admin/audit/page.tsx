'use client'

import { useCallback, useState } from 'react'
import { useLive } from '@/components/staff/shell'
import { api } from '@/components/staff/api'

type E = { id: number; actor: string; action: string; target: string; detail: string; created_at: string }

export default function AuditPage() {
  const [rows, setRows] = useState<E[]>([])
  const load = useCallback(async () => { try { setRows((await api<{ entries: E[] }>('GET', '/api/admin/audit?limit=200')).entries) } catch { /* shown empty */ } }, [])
  useLive(load, 15000)
  return (
    <>
      <div className="ad-head"><h1>Activity log</h1></div>
      <p className="st-muted small">Who did what: sign-ins, verifications, status changes, menu and settings edits.</p>
      <div className="ad-table-wrap">
        <table className="ad-table static">
          <thead><tr><th>Time</th><th>Who</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}><td>{new Date(r.created_at).toLocaleString('en-GB')}</td><td>{r.actor}</td><td><code>{r.action}</code></td><td>{r.target}</td><td>{r.detail}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  )
}
