'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StatusBadge, formatElapsed, formatWhen } from '@/components/StatusBadge';

export default function HomePage() {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [active, setActive] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);

  async function refresh() {
    const [s, r] = await Promise.all([
      fetch('/api/status', { cache: 'no-store' }).then((x) => x.json()),
      fetch('/api/runs?active=1', { cache: 'no-store' }).then((x) => x.json()),
    ]);
    setStatus(s);
    setActive(r.runs || []);
    setUpcoming(r.upcoming || []);
  }

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 2000);
    return () => clearInterval(id);
  }, []);

  const stats = [
    ['Total Events', status?.totalEvents],
    ['Enabled Events', status?.enabledEvents],
    ['Categories', status?.categories],
    ['Jobs Completed Today', status?.jobsCompletedToday],
    ['Jobs Failed Today', status?.jobsFailedToday],
    ['Success Rate', status ? `${status.successRate}%` : '—'],
    ['Avg Duration', status ? `${status.avgDurationSec}s` : '—'],
    ['Scheduler', status?.schedulerEnabled ? 'On' : 'Off'],
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Home</h1>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(([label, value]) => (
          <div key={String(label)} className="card p-4">
            <div className="text-xs uppercase text-slate-400">{label}</div>
            <div className="text-xl font-semibold mt-1">{value ?? '—'}</div>
          </div>
        ))}
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-navy-700 font-semibold">Active Jobs</div>
        <table className="table-grid">
          <thead>
            <tr>
              <th>Job</th>
              <th>Event</th>
              <th>Status</th>
              <th>Elapsed</th>
              <th>Rows</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {active.length === 0 && (
              <tr>
                <td colSpan={6} className="text-slate-500">
                  No active jobs.
                </td>
              </tr>
            )}
            {active.map((run) => (
              <tr key={run.id}>
                <td>
                  <Link href={`/history/${run.id}`}>{run.id.slice(0, 8)}</Link>
                </td>
                <td>{run.event_name}</td>
                <td>
                  <StatusBadge status={run.status} />
                </td>
                <td>{formatElapsed(run.started_at)}</td>
                <td>{run.rows_upserted}</td>
                <td>
                  <button
                    className="btn-danger"
                    onClick={() => fetch(`/api/runs/${run.id}/abort`, { method: 'POST' })}
                  >
                    Abort
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-navy-700 font-semibold">Upcoming Events (24h)</div>
        <table className="table-grid">
          <thead>
            <tr>
              <th>Event</th>
              <th>Category</th>
              <th>Scheduled</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {upcoming.length === 0 && (
              <tr>
                <td colSpan={4} className="text-slate-500">
                  No upcoming events. Enable a schedule or use Run Now.
                </td>
              </tr>
            )}
            {upcoming.map((event) => (
              <tr key={event.id}>
                <td>
                  <Link href={`/schedule/${event.id}`}>{event.name}</Link>
                </td>
                <td>{event.category_id}</td>
                <td>{formatWhen(event.next_run_at)}</td>
                <td>
                  <Link className="btn-ghost" href={`/schedule/${event.id}`}>
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
