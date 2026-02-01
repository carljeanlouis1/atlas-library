import { Outlet, Link, useLocation } from 'react-router-dom'
import { BookOpen, Headphones, Clock, Home, Search, MessageCircle, Settings } from 'lucide-react'

const navItems = [
  { path: '/', icon: Home, label: 'Library' },
  { path: '/audio', icon: Headphones, label: 'Audio' },
  { path: '/timeline', icon: Clock, label: 'Timeline' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-atlas-400 to-atlas-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg">Atlas Library</span>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search content..."
                className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-atlas-500 transition-colors"
              />
            </div>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-atlas-500/20 text-atlas-400'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-16 min-h-screen">
        <Outlet />
      </main>

      {/* Chat button */}
      <button className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-atlas-500 hover:bg-atlas-600 text-white shadow-lg shadow-atlas-500/20 flex items-center justify-center transition-colors">
        <MessageCircle className="w-6 h-6" />
      </button>
    </div>
  )
}
