'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { X } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function close() { setSidebarOpen(false); }
  function open()  { setSidebarOpen(true);  }

  return (
    <div className="flex min-h-screen">

      {/* Dark overlay — tap to close */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar drawer */}
      <div className={`
        fixed left-0 top-0 h-screen z-50
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:z-40
      `}>
        <Sidebar />

        {/* Close button — inside drawer, only on mobile */}
        <button
          onClick={close}
          className="absolute top-5 right-4 lg:hidden
            w-8 h-8 rounded-lg flex items-center justify-center
            text-chrome-dim hover:text-chrome-bright hover:bg-white/8 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <Header onMenuClick={open} />
        <main className="flex-1 p-4 md:p-8 page-enter">
          {children}
        </main>
      </div>

    </div>
  );
}
