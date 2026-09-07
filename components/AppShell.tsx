'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const nav = [
  { href: '/', label: 'Home' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/history', label: 'History' },
  { href: '/activity', label: 'Activity' },
  { href: '/settings', label: 'Settings' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [now, setNow] = useState('');
  const [enabled, setEnabled] = useState(true);

  async function loadScheduler() {
    const res = await fetch('/api/scheduler', { cache: 'no-store' });
    const data = await res.json();
    setEnabled(Boolean(data.enabled));
    setNow(new Date(data.now).toLocaleString());
  }

  useEffect(() => {
    void loadScheduler();
    const id = setInterval(() => {
      setNow(new Date().toLocaleString());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  async function toggle(next: boolean) {
    await fetch('/api/scheduler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: next }),
    });
    setEnabled(next);
  }

  return (
    <div className="min-h-screen grid grid-cols-[220px_1fr]">
      <aside className="bg-navy-900 border-r border-navy-700 px-4 py-5">
        <div className="text-teal-400 font-bold tracking-wide text-lg mb-1">Simphony BI</div>
        <div className="text-xs text-slate-400 mb-6">Integration Manager</div>
        <nav className="space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded px-3 py-2 text-sm ${
                  active ? 'bg-teal-600 text-white' : 'text-slate-200 hover:bg-navy-700'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="h-12 border-b border-navy-700 bg-navy-900 flex items-center justify-between px-5">
          <div className="text-sm text-slate-300">{now}</div>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Scheduler</span>
            <button
              type="button"
              onClick={() => void toggle(!enabled)}
              className={`w-12 h-6 rounded-full relative ${enabled ? 'bg-teal-600' : 'bg-navy-600'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${enabled ? 'left-6' : 'left-0.5'}`} />
            </button>
          </label>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
