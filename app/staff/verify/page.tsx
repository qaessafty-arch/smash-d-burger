'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { StaffShell } from '@/components/staff/shell'
import { VerifyPanel } from '@/components/staff/verify-panel'

function Inner() {
  const t = useSearchParams().get('t') ?? undefined
  const router = useRouter()
  return <main className="st-main"><VerifyPanel initialToken={t} onDone={() => { if (t) router.replace('/staff/verify') }} /></main>
}

/** Landing page for the order QR: opens straight to the order preview for a signed-in waiter. */
export default function VerifyPage() {
  return <StaffShell roles={['waiter', 'manager', 'admin']} title="Verify order"><Suspense><Inner /></Suspense></StaffShell>
}
