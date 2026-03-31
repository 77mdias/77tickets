import { notFound } from "next/navigation";

import { LotSelector } from "@/features/checkout/lot-selector";
import { getServerBaseUrl } from "@/lib/server-api";

interface EventDetailPayload {
  event: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    location: string | null;
    imageUrl: string | null;
    startsAt: string;
    endsAt: string | null;
  };
  lots: Array<{
    id: string;
    title: string;
    priceInCents: number;
    totalQuantity: number;
    maxPerOrder: number;
    available: number;
    saleStartsAt: string | null;
    saleEndsAt: string | null;
  }>;
}

const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const formatCurrency = (valueInCents: number): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);

const loadEventDetail = async (slug: string): Promise<EventDetailPayload> => {
  const baseUrl = await getServerBaseUrl();
  const response = await fetch(`${baseUrl}/api/events/${slug}`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error("Could not load event detail");
  }

  const payload = (await response.json()) as { data: EventDetailPayload };
  return payload.data;
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await loadEventDetail(slug);

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-10">
      <main className="flex w-full max-w-5xl flex-col gap-6">
        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          {data.event.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={data.event.title}
              className="h-56 w-full object-cover"
              src={data.event.imageUrl}
            />
          ) : (
            <div className="h-56 w-full bg-zinc-100" />
          )}

          <div className="p-6">
            <h1 className="text-3xl font-semibold text-zinc-900">{data.event.title}</h1>
            <p className="mt-2 text-sm text-zinc-600">{data.event.description ?? "Sem descrição."}</p>
            <div className="mt-4 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
              <p>
                <strong>Data:</strong> {formatDateTime(data.event.startsAt)}
              </p>
              <p>
                <strong>Local:</strong> {data.event.location ?? "A definir"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-zinc-900">Lotes</h2>
          <ul className="mt-4 grid gap-3">
            {data.lots.map((lot) => (
              <li
                key={lot.id}
                className="grid gap-1 rounded-md border border-zinc-200 px-4 py-3 text-sm sm:grid-cols-4 sm:items-center"
              >
                <span className="font-medium text-zinc-900">{lot.title}</span>
                <span className="text-zinc-700">{formatCurrency(lot.priceInCents)}</span>
                <span className="text-zinc-700">Disponíveis: {lot.available}</span>
                <span className="text-zinc-500">Máx/pedido: {lot.maxPerOrder}</span>
              </li>
            ))}
          </ul>
        </section>

        <LotSelector
          eventId={data.event.id}
          lots={data.lots.map((lot) => ({
            id: lot.id,
            title: lot.title,
            priceInCents: lot.priceInCents,
            available: lot.available,
            maxPerOrder: lot.maxPerOrder,
          }))}
        />
      </main>
    </div>
  );
}
