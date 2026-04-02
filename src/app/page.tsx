import Link from "next/link";

import { EventSearch } from "@/features/events/event-search";

export default async function Home() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-10">
      <main className="flex w-full max-w-6xl flex-col">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900">Eventos Abertos</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Explore eventos publicados e inicie sua compra em poucos passos.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700"
              href="/login"
            >
              Login
            </Link>
            <Link
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
              href="/meus-ingressos"
            >
              Meus Ingressos
            </Link>
          </div>
        </header>
        <EventSearch />
      </main>
    </div>
  );
}
