export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: 'bg-emerald-700 text-emerald-100',
    running: 'bg-sky-700 text-sky-100',
    queued: 'bg-amber-700 text-amber-100',
    error: 'bg-red-800 text-red-100',
    aborted: 'bg-slate-600 text-slate-100',
  };
  return <span className={`badge ${map[status] || 'bg-navy-600'}`}>{status}</span>;
}

export function formatWhen(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export function formatElapsed(start?: string | null, end?: string | null) {
  if (!start) return '—';
  const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
  const sec = Math.max(0, Math.round(ms / 1000));
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}
