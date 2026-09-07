'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ENDPOINTS } from '@/lib/bi/catalog';

const empty = {
  name: '',
  category_id: 'daily',
  endpoint_id: 'getOperationsDailyTotals',
  enabled: false,
  timeout_sec: 3600,
  notes: '',
  scheduleType: 'daily',
  everyMinutes: 15,
  time: '02:15',
  daysOfWeek: [1, 2, 3, 4, 5],
  locMode: 'all',
  locRefs: '',
  busDtMode: 'latest',
  busDt: '',
};

export function EventForm({ eventId }: { eventId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!eventId || eventId === 'new') return;
    void fetch(`/api/events/${eventId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((event) => {
        setForm({
          name: event.name,
          category_id: event.category_id,
          endpoint_id: event.endpoint_id,
          enabled: event.enabled,
          timeout_sec: event.timeout_sec,
          notes: event.notes || '',
          scheduleType: event.schedule.type,
          everyMinutes: event.schedule.everyMinutes || 15,
          time: event.schedule.time || '02:15',
          daysOfWeek: event.schedule.daysOfWeek || [1, 2, 3, 4, 5],
          locMode: event.target.locRefs === 'all' ? 'all' : 'list',
          locRefs: Array.isArray(event.target.locRefs) ? event.target.locRefs.join(',') : '',
          busDtMode: event.target.busDtMode,
          busDt: event.target.busDt || '',
        });
      });
  }, [eventId]);

  function set<K extends keyof typeof empty>(key: K, value: (typeof empty)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function payload() {
    const schedule =
      form.scheduleType === 'interval'
        ? { type: 'interval', everyMinutes: Math.max(15, Number(form.everyMinutes) || 15) }
        : form.scheduleType === 'weekly'
          ? { type: 'weekly', daysOfWeek: form.daysOfWeek, time: form.time }
          : { type: 'daily', time: form.time };
    return {
      name: form.name,
      category_id: form.category_id,
      endpoint_id: form.endpoint_id,
      enabled: form.enabled,
      timeout_sec: Number(form.timeout_sec),
      notes: form.notes,
      schedule,
      target: {
        locRefs: form.locMode === 'all' ? 'all' : form.locRefs.split(',').map((s) => s.trim()).filter(Boolean),
        busDtMode: form.busDtMode,
        busDt: form.busDtMode === 'fixed' ? form.busDt : undefined,
      },
    };
  }

  async function save() {
    setSaving(true);
    const isNew = !eventId || eventId === 'new';
    const res = await fetch(isNew ? '/api/events' : `/api/events/${eventId}`, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload()),
    });
    const data = await res.json();
    setSaving(false);
    router.push(`/schedule/${data.id}`);
    router.refresh();
  }

  async function runNow() {
    if (!eventId || eventId === 'new') {
      await save();
      return;
    }
    await fetch(`/api/events/${eventId}/run`, { method: 'POST' });
    router.push('/history');
  }

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="card p-5 space-y-4 max-w-3xl">
      <div className="grid grid-cols-2 gap-4">
        <label className="space-y-1 text-sm">
          <div>Event name</div>
          <input className="w-full" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <div>Category</div>
          <select className="w-full" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
            <option value="daily">Daily Totals</option>
            <option value="quarterHour">Quarter Hour Totals</option>
            <option value="definition">Definitions</option>
          </select>
        </label>
        <label className="space-y-1 text-sm col-span-2">
          <div>Endpoint</div>
          <select className="w-full" value={form.endpoint_id} onChange={(e) => set('endpoint_id', e.target.value)}>
            {ENDPOINTS.filter((ep) => ep.category === form.category_id).map((ep) => (
              <option key={ep.id} value={ep.id}>
                {ep.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <div>Schedule type</div>
          <select className="w-full" value={form.scheduleType} onChange={(e) => set('scheduleType', e.target.value)}>
            <option value="interval">Every N minutes (min 15)</option>
            <option value="daily">Once a day</option>
            <option value="weekly">Days of week</option>
          </select>
        </label>
        {form.scheduleType === 'interval' ? (
          <label className="space-y-1 text-sm">
            <div>Every minutes</div>
            <input type="number" min={15} className="w-full" value={form.everyMinutes} onChange={(e) => set('everyMinutes', Number(e.target.value))} />
          </label>
        ) : (
          <label className="space-y-1 text-sm">
            <div>Time</div>
            <input type="time" className="w-full" value={form.time} onChange={(e) => set('time', e.target.value)} />
          </label>
        )}
        {form.scheduleType === 'weekly' && (
          <div className="col-span-2 flex flex-wrap gap-2 text-sm">
            {days.map((d, i) => (
              <label key={d} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={form.daysOfWeek.includes(i)}
                  onChange={(e) =>
                    set(
                      'daysOfWeek',
                      e.target.checked ? [...form.daysOfWeek, i] : form.daysOfWeek.filter((x) => x !== i)
                    )
                  }
                />
                {d}
              </label>
            ))}
          </div>
        )}
        <label className="space-y-1 text-sm">
          <div>Locations</div>
          <select className="w-full" value={form.locMode} onChange={(e) => set('locMode', e.target.value)}>
            <option value="all">All active locations</option>
            <option value="list">Specific locRefs</option>
          </select>
        </label>
        {form.locMode === 'list' && (
          <label className="space-y-1 text-sm">
            <div>locRefs (comma-separated)</div>
            <input className="w-full" value={form.locRefs} onChange={(e) => set('locRefs', e.target.value)} />
          </label>
        )}
        <label className="space-y-1 text-sm">
          <div>Business date</div>
          <select className="w-full" value={form.busDtMode} onChange={(e) => set('busDtMode', e.target.value)}>
            <option value="latest">Latest per location</option>
            <option value="fixed">Fixed date</option>
          </select>
        </label>
        {form.busDtMode === 'fixed' && (
          <label className="space-y-1 text-sm">
            <div>busDt</div>
            <input type="date" className="w-full" value={form.busDt} onChange={(e) => set('busDt', e.target.value)} />
          </label>
        )}
        <label className="space-y-1 text-sm">
          <div>Timeout (seconds)</div>
          <input type="number" className="w-full" value={form.timeout_sec} onChange={(e) => set('timeout_sec', Number(e.target.value))} />
        </label>
        <label className="flex items-center gap-2 text-sm mt-6">
          <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} />
          Enabled
        </label>
        <label className="space-y-1 text-sm col-span-2">
          <div>Notes</div>
          <textarea className="w-full" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>
      </div>
      <div className="flex gap-2">
        <button className="btn-primary" disabled={saving} onClick={() => void save()}>
          Save
        </button>
        <button className="btn-ghost" onClick={() => void runNow()}>
          Run Now
        </button>
      </div>
    </div>
  );
}
