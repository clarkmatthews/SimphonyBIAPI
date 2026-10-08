'use client';

import Link from 'next/link';
import { Fragment, useState } from 'react';
import { IoExchangeList } from '@/components/IoExchangeList';
import { StatusBadge, formatElapsed, formatWhen } from '@/components/StatusBadge';
import type { IoExchange } from '@/lib/types';

export function JobRunTable({ runs, emptyMessage = 'No jobs.' }: { runs: any[]; emptyMessage?: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [exchanges, setExchanges] = useState<Record<string, IoExchange[]>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function toggle(runId: string) {
    if (openId === runId) {
      setOpenId(null);
      return;
    }
    setOpenId(runId);
    if (exchanges[runId]) return;
    setLoadingId(runId);
    try {
      const data = await fetch(`/api/runs/${runId}`, { cache: 'no-store' }).then((r) => r.json());
      setExchanges((current) => ({ ...current, [runId]: data.io_exchanges || [] }));
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <table className="table-grid">
      <thead>
        <tr>
          <th className="w-10"></th>
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
        {runs.length === 0 && (
          <tr>
            <td colSpan={8} className="text-slate-500">
              {emptyMessage}
            </td>
          </tr>
        )}
        {runs.map((run) => (
          <Fragment key={run.id}>
            <tr>
              <td>
                <button
                  type="button"
                  className="btn-ghost px-2 py-0.5 font-mono"
                  onClick={() => void toggle(run.id)}
                  title="Show request and response"
                >
                  {openId === run.id ? '−' : '+'}
                </button>
              </td>
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
            {openId === run.id && (
              <tr>
                <td colSpan={8} className="bg-navy-950">
                  {loadingId === run.id ? (
                    <div className="text-xs text-slate-500 px-2 py-2">Loading request/response…</div>
                  ) : (
                    <IoExchangeList exchanges={exchanges[run.id]} />
                  )}
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
