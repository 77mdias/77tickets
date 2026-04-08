export function TicketCardSkeleton() {
  return (
    <div className="rounded-lg border border-white/10 p-4 animate-pulse space-y-3">
      <div className="h-3 w-16 rounded bg-white/10" />
      <div className="h-4 w-full rounded bg-white/10" />
      <div className="h-4 w-1/2 rounded bg-white/10" />
      <div className="mt-3 h-40 w-40 rounded-md bg-white/10" />
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <article className="rounded-xl border border-white/10 bg-white/5 p-5 animate-pulse space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="h-4 w-3/4 rounded bg-white/10" />
        <div className="h-4 w-2/3 rounded bg-white/10" />
        <div className="h-4 w-1/2 rounded bg-white/10" />
        <div className="h-4 w-1/3 rounded bg-white/10" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TicketCardSkeleton />
        <TicketCardSkeleton />
      </div>
    </article>
  );
}
