'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { StatusBadge, formatElapsed, formatWhen } from '@/components/StatusBadge';

export default function RunDetailPage() {
  const params = useParams<{ runId: string }>();
  const [run, setRun] = useState<any>(null);

  async function load() {
    const data = await fetch(`/api/runs/${params.runId}`, { cache: 'no-store' }).then((r) => r.json());
    setRun(data);
  }

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 2000);
    return () => clearInterval(id);
  }, [params.runId]);

  if (!run) return <div>Loading…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Job {run.id?.slice(0, 8)}</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-3">
          <div className="text-xs text-slate-400">Event</div>
          <div>{run.event_name}</div>
        </div>
        <div className="card p-3">
          <div className="text-xs text-slate-400">Status</div>
          <StatusBadge status={run.status} />
        </div>
        <div className="card p-3">
          <div className="text-xs text-slate-400">Started</div>
          <div>{formatWhen(run.started_at)}</div>
        </div>
        <div className="card p-3">
          <div className="text-xs text-slate-400">Elapsed</div>
          <div>{formatElapsed(run.started_at, run.finished_at)}</div>
        </div>
      </div>
      {run.status === 'running' && (
        <button className="btn-danger" onClick={() => fetch(`/api/runs/${run.id}/abort`, { method: 'POST' })}>
          Abort
        </button>
      )}
      {run.error && <div className="card p-3 text-red-300">{run.error}</div>}
      <pre className="card p-4 text-xs overflow-auto max-h-[480px] whitespace-pre-wrap">{run.log_text || 'No log yet.'}</pre>
    </div>
  );
}
