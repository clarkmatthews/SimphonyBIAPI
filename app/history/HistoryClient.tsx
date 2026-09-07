'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { StatusBadge, formatElapsed, formatWhen } from '@/components/StatusBadge';

export function HistoryClient() {
  const params = useSearchParams();
  const eventId = params.get('eventId') || '';
  const [runs, setRuns] = useState<any[]>([]);

  async function load() {
    const qs = eventId ? `?eventId=${eventId}` : '';
    const data = await fetch(`/api/runs${qs}`, { cache: 'no-store' }).then((r) => r.json());
    setRuns(data.runs || []);
  }

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 2000);
    return () => clearInterval(id);
  }, [eventId]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Completed Jobs</h1>
      <div className="card overflow-hidden">
        <table className="table-grid">
          <thead>
            <tr>
              <th>Job</th>
              <th>Event</th>
              <th>Trigger</th>
              <th>Status</th>
              <th>Started</th>
              <th>Elapsed</th>
              <th>Rows</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id}>
                <td>
                  <Link href={`/history/${run.id}`}>{run.id.slice(0, 8)}</Link>
                </td>
                <td>{run.event_name}</td>
                <td>{run.trigger}</td>
                <td>
                  <StatusBadge status={run.status} />
                </td>
                <td>{formatWhen(run.started_at || run.created_at)}</td>
                <td>{formatElapsed(run.started_at, run.finished_at)}</td>
                <td>{run.rows_upserted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
