export function EventCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm animate-pulse">
      <div className="h-40 w-full bg-zinc-200" />
      <div className="p-4 space-y-3">
        <div className="h-5 w-3/4 rounded bg-zinc-200" />
        <div className="h-4 w-1/2 rounded bg-zinc-200" />
        <div className="h-4 w-1/3 rounded bg-zinc-200" />
        <div className="mt-4 h-8 w-24 rounded-md bg-zinc-200" />
      </div>
    </article>
  );
}

export function EventListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <EventCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
