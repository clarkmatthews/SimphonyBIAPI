'use client';

import { useEffect, useState } from 'react';
import { formatWhen } from '@/components/StatusBadge';

export default function ActivityPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    const load = () =>
      fetch('/api/activity', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => setRows(d.activity || []));
    void load();
    const id = setInterval(() => void load(), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Activity Log</h1>
      <div className="card overflow-hidden">
        <table className="table-grid">
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{formatWhen(row.created_at)}</td>
                <td>{row.action}</td>
                <td>{row.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
