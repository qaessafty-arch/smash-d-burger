'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, ClipboardList, Grid2x2, History, Settings, UtensilsCrossed, Users, ChefHat, ConciergeBell } from 'lucide-react'
import { StaffShell, useMe } from '@/components/staff/shell'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: BarChart3, admin: false },
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList, admin: false },
  { href: '/admin/menu', label: 'Menu', icon: UtensilsCrossed, admin: false },
  { href: '/admin/tables', label: 'Tables & QR', icon: Grid2x2, admin: false },
  { href: '/admin/staff', label: 'Staff', icon: Users, admin: true },
  { href: '/admin/settings', label: 'Settings', icon: Settings, admin: true },
  { href: '/admin/audit', label: 'Activity log', icon: History, admin: true },
]

function Nav() {
  const path = usePathname()
  const { me } = useMe()
  return (
    <nav className="ad-nav" aria-label="Admin">
      {NAV.filter((n) => !n.admin || me.role === 'admin').map((n) => (
        <Link key={n.href} href={n.href} aria-current={path === n.href ? 'page' : undefined}><n.icon size={18} /><span>{n.label}</span></Link>
      ))}
      <hr />
      <Link href="/staff/waiter"><ConciergeBell size={18} /><span>Waiter view</span></Link>
      <Link href="/staff/kitchen"><ChefHat size={18} /><span>Kitchen view</span></Link>
    </nav>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffShell roles={['admin', 'manager']} title="Restaurant admin" wide>
      <div className="ad-layout">
        <Nav />
        <main className="ad-main">{children}</main>
      </div>
    </StaffShell>
  )
}
