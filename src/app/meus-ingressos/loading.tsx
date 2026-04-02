import { OrderCardSkeleton } from "@/features/tickets/ticket-card-skeleton";

export default function MeusIngressosLoading() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-10">
      <main className="flex w-full max-w-6xl flex-col">
        <header className="mb-6">
          <div className="h-8 w-48 rounded bg-zinc-200 animate-pulse" />
          <div className="mt-1 h-4 w-64 rounded bg-zinc-200 animate-pulse" />
        </header>
        <section className="grid gap-5">
          <OrderCardSkeleton />
          <OrderCardSkeleton />
        </section>
      </main>
    </div>
  );
}
