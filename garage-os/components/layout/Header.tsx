'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Search, Menu } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Reminder } from '@/types';
import { daysUntil, formatDate } from '@/lib/utils';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/vehicles': 'Fleet',
  '/reminders': 'Reminders',
  '/valuation': 'Valuation',
  '/search': 'Search',
  '/settings': 'Settings',
};

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const [pendingReminders, setPendingReminders] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [urgentReminders, setUrgentReminders] = useState<Reminder[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const title = Object.entries(PAGE_TITLES).find(([path]) =>
    pathname === path || pathname.startsWith(path + '/')
  )?.[1] || 'Bluechip Collection';

  useEffect(() => {
    const supabase = createClient();
    async function loadReminders() {
      const { data } = await supabase
        .from('reminders')
        .select('*, vehicle:vehicles(id, make, model, year)')
        .eq('status', 'pending')
        .order('due_date', { ascending: true })
        .limit(5);

      if (data) {
        setUrgentReminders(data as any);
        const { count } = await supabase
          .from('reminders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        setPendingReminders(count || 0);
      }
    }
    loadReminders();
  }, []);

  return (
    <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-8 relative z-30"
      style={{ background: 'rgba(10, 10, 15, 0.95)', backdropFilter: 'blur(12px)' }}>

      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button onClick={onMenuClick}
          className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center btn-ghost shrink-0">
          <Menu className="w-5 h-5" />
        </button>
        <div>
        <h1 className="font-display text-lg md:text-xl text-chrome-bright">{title}</h1>
          <div className="text-xs text-chrome-muted mt-0.5 hidden sm:block">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/search"
          className="w-9 h-9 rounded-lg flex items-center justify-center btn-ghost">
          <Search className="w-4 h-4" />
        </Link>

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 rounded-lg flex items-center justify-center btn-ghost relative">
            <Bell className="w-4 h-4" />
            {pendingReminders > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-DEFAULT flex items-center justify-center text-[9px] font-bold text-obsidian-900">
                {pendingReminders > 9 ? '9+' : pendingReminders}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 glass-card rounded-xl shadow-card-hover z-[200] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <span className="text-sm font-semibold text-chrome-bright">Upcoming</span>
                <Link href="/reminders" className="text-xs text-amber-DEFAULT hover:text-amber-light" onClick={() => setShowNotifications(false)}>
                  View all
                </Link>
              </div>
              <div className="divide-y divide-white/5">
                {urgentReminders.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-chrome-dim">All clear</div>
                ) : urgentReminders.map(r => {
                  const days = daysUntil(r.due_date);
                  return (
                    <Link key={r.id} href="/reminders"
                      className="flex items-start gap-3 px-4 py-3 hover:bg-white/3 transition-colors"
                      onClick={() => setShowNotifications(false)}>
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${days !== null && days < 0 ? 'bg-red-400' : days !== null && days <= 7 ? 'bg-red-400' : days !== null && days <= 30 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-chrome-bright truncate">{r.title}</div>
                        <div className="text-xs text-chrome-dim mt-0.5">
                          {(r as any).vehicle ? `${(r as any).vehicle.make} ${(r as any).vehicle.model}` : 'Fleet'} · {formatDate(r.due_date)}
                        </div>
                      </div>
                      {days !== null && (
                        <div className={`text-xs font-mono shrink-0 ${days < 0 ? 'text-red-400' : days <= 7 ? 'text-red-400' : days <= 30 ? 'text-amber-400' : 'text-chrome-dim'}`}>
                          {days < 0 ? `${Math.abs(days)}d late` : days === 0 ? 'Today' : `${days}d`}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
