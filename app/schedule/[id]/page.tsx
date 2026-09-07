import { EventForm } from '@/components/EventForm';

export default async function EventEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{id === 'new' ? 'Add Event' : 'Edit Event'}</h1>
      <EventForm eventId={id} />
    </div>
  );
}
