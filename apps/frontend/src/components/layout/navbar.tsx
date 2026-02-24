'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { Sparkles, LayoutDashboard, Wand2, Settings, LogOut, CreditCard } from 'lucide-react'
import api from '@/lib/api'

const NAV = [
  { href: '/generate', label: 'Studio', icon: Wand2 },
  { href: '/dashboard', label: 'Projects', icon: LayoutDashboard },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } catch {}
    clearAuth()
    router.push('/auth')
  }

  return (
    <nav className="bg-gray-900/80 backdrop-blur border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/generate" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <span className="font-bold text-white text-sm hidden sm:block">PhotoGen AI</span>
          </Link>
          <div className="flex gap-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${
                  pathname.startsWith(href) ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            ))}
            {user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${
                  pathname === '/admin' ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Settings size={14} />
                Admin
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
                <CreditCard size={12} />
                <span>{user.credits} credits</span>
              </div>
              <span className="text-xs text-gray-500 hidden sm:block">{user.email}</span>
            </>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-gray-500 hover:text-red-400 transition text-sm"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </nav>
  )
}
