'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  BarChart2,
  FileText,
  MessageSquare,
  RefreshCw,
  Settings,
  UserCircle,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/properties', label: 'Properties', icon: Building2 },
  { href: '/property-data', label: 'Property Data', icon: FileText },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/access', label: 'Access Control', icon: ShieldCheck },
  { href: '/reports', label: 'Reports', icon: BarChart2 },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/sync', label: 'Sync', icon: RefreshCw },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed top-0 left-0 z-50 w-16 hover:w-56 min-h-screen bg-orange-500 flex flex-col py-3 px-2 transition-all duration-300 group overflow-hidden hover:shadow-2xl">

      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-4">
        <div className="w-10 h-10 rounded-lg bg-white/25 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-extrabold text-xs tracking-tight">
            FX<sup className="text-[7px]">1</sup>
          </span>
        </div>

        <span className="text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          FX Admin
        </span>
      </div>

      {/* Navigation */}
      <div className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 h-11 px-3 rounded-lg transition-all ${
                active
                  ? 'bg-white/25 text-white'
                  : 'text-white/80 hover:bg-white/20 hover:text-white'
              }`}
            >
              <Icon size={18} className="flex-shrink-0" />

              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap text-sm font-medium">
                {label}
              </span>
            </Link>
          )
        })}
      </div>

      <div className="flex-1" />

      {/* Bottom Links */}
      <div className="flex flex-col gap-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 h-11 px-3 rounded-lg text-white/80 hover:bg-white/20 hover:text-white transition-all"
        >
          <Settings size={18} className="flex-shrink-0" />

          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap text-sm font-medium">
            Settings
          </span>
        </Link>

        <Link
          href="/profile"
          className="flex items-center gap-3 h-11 px-3 rounded-lg text-white/80 hover:bg-white/20 hover:text-white transition-all"
        >
          <UserCircle size={18} className="flex-shrink-0" />

          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap text-sm font-medium">
            Profile
          </span>
        </Link>
      </div>
    </aside>
  )
}