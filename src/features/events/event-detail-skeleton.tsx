export function EventDetailSkeleton() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-4 py-10 animate-pulse">
      <main className="flex w-full max-w-4xl flex-col gap-6">
        <div className="h-64 w-full rounded-2xl bg-zinc-200 md:h-80" />
        <div className="space-y-4">
          <div className="h-8 w-2/3 rounded bg-zinc-200" />
          <div className="h-5 w-1/3 rounded bg-zinc-200" />
          <div className="h-5 w-1/4 rounded bg-zinc-200" />
          <div className="mt-4 space-y-2">
            <div className="h-4 w-full rounded bg-zinc-200" />
            <div className="h-4 w-5/6 rounded bg-zinc-200" />
            <div className="h-4 w-4/6 rounded bg-zinc-200" />
          </div>
          <div className="mt-6 h-10 w-40 rounded-md bg-zinc-200" />
        </div>
      </main>
    </div>
  );
}
