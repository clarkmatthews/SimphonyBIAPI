'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { JobRunTable } from '@/components/JobRunTable';

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
        <JobRunTable runs={runs} emptyMessage="No job history." />
      </div>
    </div>
  );
}
