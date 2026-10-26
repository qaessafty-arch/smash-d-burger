'use client'

import { useCallback, useEffect, useState } from 'react'
import { KeyRound, Plus } from 'lucide-react'
import { api, ApiErr } from '@/components/staff/api'

type S = { id: number; username: string; name: string; role: string; active: boolean; lastLoginAt: string | null; actions: number }
const ROLES = [['admin', 'Administrator'], ['manager', 'Manager'], ['waiter', 'Waiter'], ['kitchen', 'Kitchen staff']]

export default function StaffAdmin() {
  const [list, setList] = useState<S[]>([])
  const [form, setForm] = useState({ username: '', name: '', role: 'waiter', password: '' })
  const [err, setErr] = useState('')
  const load = useCallback(async () => { try { setList((await api<{ staff: S[] }>('GET', '/api/admin/staff')).staff) } catch (e) { setErr((e as Error).message) } }, [])
  useEffect(() => { void load() }, [load])
  const run = async (fn: () => Promise<unknown>) => { try { await fn(); setErr(''); await load() } catch (e) { setErr(e instanceof ApiErr ? e.message : 'Failed') } }

  return (
    <>
      <div className="ad-head"><h1>Staff</h1></div>
      {err && <p className="st-error" role="alert">{err}</p>}
      <form className="ad-panel ad-inline" onSubmit={(e) => { e.preventDefault(); void run(async () => { await api('POST', '/api/admin/staff', form); setForm({ username: '', name: '', role: 'waiter', password: '' }) }) }}>
        <h2>Add a staff account</h2>
        <label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Username<input required minLength={3} autoCapitalize="none" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
        <label>Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label>Password (8+ characters)<input required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <button className="st-btn primary"><Plus size={14} /> Create</button>
      </form>
      <div className="ad-table-wrap">
        <table className="ad-table static">
          <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Last sign-in</th><th>Actions logged</th><th>Active</th><th /></tr></thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <td><b>{s.name}</b></td><td>{s.username}</td>
                <td><select value={s.role} onChange={(e) => run(() => api('PATCH', '/api/admin/staff', { id: s.id, role: e.target.value }))}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td>
                <td>{s.lastLoginAt ? new Date(s.lastLoginAt.replace(' ', 'T') + 'Z').toLocaleString('en-GB') : 'Never'}</td>
                <td>{s.actions}</td>
                <td><label className="switch"><input type="checkbox" checked={s.active} onChange={(e) => run(() => api('PATCH', '/api/admin/staff', { id: s.id, active: e.target.checked }))} /><span>{s.active ? 'Active' : 'Disabled'}</span></label></td>
                <td><button className="st-btn sm" onClick={() => { const p = prompt(`New password for ${s.name} (8+ characters)`); if (p) void run(() => api('PATCH', '/api/admin/staff', { id: s.id, password: p })) }}><KeyRound size={13} /> Reset password</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
