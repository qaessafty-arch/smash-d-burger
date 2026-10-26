'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Flame } from 'lucide-react'
import { api, ApiErr } from '@/components/staff/api'

function Form() {
  const router = useRouter()
  const next = useSearchParams().get('next')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setBusy(true); setErr('')
    try {
      await api('POST', '/api/staff/login', { username: f.get('username'), password: f.get('password') })
      router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : '/staff')
    } catch (x) { setErr(x instanceof ApiErr ? x.message : 'Could not sign in') } finally { setBusy(false) }
  }
  return (
    <main className="st-login">
      <form onSubmit={submit} className="st-login-card">
        <span className="brand-mark big"><Flame size={26} fill="currentColor" /></span>
        <h1>Staff sign in</h1>
        <label>Username<input name="username" autoComplete="username" autoCapitalize="none" required autoFocus /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
        {err && <p className="st-error" role="alert">{err}</p>}
        <button className="st-btn primary lg" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  )
}
export default function Login() { return <Suspense><Form /></Suspense> }
