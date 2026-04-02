import { EventListSkeleton } from "@/features/events/event-card-skeleton";

export default function EventosLoading() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-4 py-10">
      <main className="flex w-full max-w-6xl flex-col gap-6">
        <div className="h-8 w-48 rounded bg-zinc-200 animate-pulse" />
        <EventListSkeleton count={6} />
      </main>
    </div>
  );
}
