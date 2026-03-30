import Link from "next/link";

import { getServerBaseUrl } from "@/src/lib/server-api";

interface EventListItem {
  id: string;
  slug: string;
  title: string;
  startsAt: string;
  imageUrl: string | null;
  location: string | null;
}

const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const loadPublishedEvents = async (): Promise<EventListItem[]> => {
  const baseUrl = await getServerBaseUrl();
  const response = await fetch(`${baseUrl}/api/events?page=1&limit=24`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    data?: {
      events?: EventListItem[];
    };
  };

  return payload.data?.events ?? [];
};

export default async function Home() {
  const events = await loadPublishedEvents();

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

        {events.length === 0 ? (
          <section className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-center">
            <h2 className="text-lg font-semibold text-zinc-900">Nenhum evento publicado</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Assim que um organizador publicar novos eventos, eles aparecerão aqui.
            </p>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <article
                key={event.id}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
              >
                {event.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={event.title}
                    className="h-40 w-full object-cover"
                    src={event.imageUrl}
                  />
                ) : (
                  <div className="h-40 w-full bg-zinc-100" />
                )}

                <div className="p-4">
                  <h2 className="text-lg font-semibold text-zinc-900">{event.title}</h2>
                  <p className="mt-1 text-sm text-zinc-600">{formatDateTime(event.startsAt)}</p>
                  <p className="mt-1 text-sm text-zinc-500">{event.location ?? "Local a definir"}</p>
                  <Link
                    className="mt-4 inline-flex rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
                    href={`/eventos/${event.slug}`}
                  >
                    Ver detalhes
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
