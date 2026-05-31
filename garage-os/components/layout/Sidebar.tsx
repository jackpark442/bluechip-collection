'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard, Car, Bell, TrendingUp, Search,
  Settings, LogOut, Shield, ChevronRight, Gauge, Map
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/vehicles',   label: 'Fleet',        icon: Car },
  { href: '/map',        label: 'Map',          icon: Map },
  { href: '/reminders',  label: 'Reminders',    icon: Bell },
  { href: '/valuation',  label: 'Valuation',    icon: TrendingUp },
  { href: '/search',     label: 'Search',       icon: Search },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-40 border-r border-white/5"
      style={{ background: 'linear-gradient(180deg, #0a0a0f 0%, #050507 100%)' }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-7 border-b border-white/5">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #e8a800, #d4960a)' }}>
          <Shield className="w-5 h-5 text-obsidian-900" />
        </div>
        <div>
          <div className="font-display text-base font-bold text-chrome-bright tracking-wide">BLUECHIP</div>
          <div className="text-[10px] text-chrome-muted tracking-[0.12em] uppercase">Collection</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        <div className="px-3 mb-4">
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-chrome-muted">Navigation</span>
        </div>

        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href} className={cn('nav-item', active && 'active')}>
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
              {active && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
            </Link>
          );
        })}

        <div className="px-3 pt-6 mb-4">
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-chrome-muted">System</span>
        </div>

        <Link href="/settings" className={cn('nav-item', pathname === '/settings' && 'active')}>
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </Link>
      </nav>

      {/* Bottom user section */}
      <div className="px-3 py-4 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="nav-item w-full text-left hover:text-red-400 hover:bg-red-500/5"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Ambient glow */}
      <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(232, 168, 0, 0.04) 0%, transparent 70%)' }} />
    </aside>
  );
}
