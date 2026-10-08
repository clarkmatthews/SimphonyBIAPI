'use client';

import { useState } from 'react';
import type { IoExchange } from '@/lib/types';

function pretty(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function IoExchangeList({ exchanges }: { exchanges?: IoExchange[] | null }) {
  const items = Array.isArray(exchanges) ? exchanges : [];
  if (!items.length) {
    return <div className="text-xs text-slate-500">No request/response captured for this run. Newer jobs record the payload before upsert.</div>;
  }
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <IoExchangeRow key={`${item.at}-${item.operation}-${index}`} index={index} item={item} />
      ))}
    </div>
  );
}

function IoExchangeRow({ index, item }: { index: number; item: IoExchange }) {
  const [open, setOpen] = useState(false);
  const title = item.request?.locRef
    ? `${item.operation} ${item.request.locRef}${item.request.busDt ? ` ${item.request.busDt}` : ''}`
    : item.operation;
  return (
    <div className="border border-navy-700 rounded">
      <button
        type="button"
        className="w-full flex items-start gap-2 px-3 py-2 text-left text-sm hover:bg-navy-800"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="font-mono text-teal-400 w-4 shrink-0">{open ? '−' : '+'}</span>
        <span className="min-w-0">
          <span className="text-slate-200">{index + 1}. {title}</span>
          {item.error && <span className="text-red-400"> — {item.error}</span>}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-3 text-xs">
          <div>
            <div className="text-slate-400 mb-1">Request</div>
            <div className="text-slate-500 break-all mb-1">{item.url}</div>
            <pre className="bg-navy-950 border border-navy-700 rounded p-2 overflow-auto max-h-64 whitespace-pre-wrap">
              {pretty(item.request)}
            </pre>
          </div>
          <div>
            <div className="text-slate-400 mb-1">Response (before upsert)</div>
            <pre className="bg-navy-950 border border-navy-700 rounded p-2 overflow-auto max-h-80 whitespace-pre-wrap">
              {item.error ? item.error : pretty(item.response)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
