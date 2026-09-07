import { Suspense } from 'react';
import { HistoryClient } from './HistoryClient';

export default function HistoryPage() {
  return (
    <Suspense fallback={<div>Loading history…</div>}>
      <HistoryClient />
    </Suspense>
  );
}
