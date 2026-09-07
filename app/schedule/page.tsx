'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { describeSchedule } from '@/lib/schedule';
import { formatWhen } from '@/components/StatusBadge';

export default function SchedulePage() {
  const [events, setEvents] = useState<any[]>([]);

  async function load() {
    const data = await fetch('/api/events', { cache: 'no-store' }).then((r) => r.json());
    setEvents(data.events || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggle(event: any) {
    await fetch(`/api/events/${event.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !event.enabled }),
    });
    void load();
  }

  async function run(id: string) {
    await fetch(`/api/events/${id}/run`, { method: 'POST' });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <Link href="/schedule/new" className="btn-primary">
          Add Event
        </Link>
      </div>
      <div className="card overflow-hidden">
        <table className="table-grid">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Endpoint</th>
              <th>Timing</th>
              <th>Next Run</th>
              <th>Enabled</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>
                  <Link href={`/schedule/${event.id}`}>{event.name}</Link>
                </td>
                <td>{event.category_id}</td>
                <td>{event.endpoint_id}</td>
                <td>{describeSchedule(event.schedule)}</td>
                <td>{formatWhen(event.next_run_at)}</td>
                <td>
                  <button className={event.enabled ? 'btn-primary' : 'btn-ghost'} onClick={() => void toggle(event)}>
                    {event.enabled ? 'On' : 'Off'}
                  </button>
                </td>
                <td className="space-x-2">
                  <button className="btn-ghost" onClick={() => void run(event.id)}>
                    Run
                  </button>
                  <Link href={`/history?eventId=${event.id}`} className="btn-ghost">
                    History
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
