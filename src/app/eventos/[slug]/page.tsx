import { notFound } from "next/navigation";

import { LotSelector } from "@/features/checkout/lot-selector";
import { RevealWrapper } from "@/components/reveal-wrapper";
import { getServerBaseUrl } from "@/app/lib/server-api";

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
    <div className="flex flex-1 justify-center bg-zinc-950 px-6 py-10">
      <main className="flex w-full max-w-5xl flex-col gap-6">
        <RevealWrapper
          as="section"
          className="overflow-hidden rounded-xl border border-white/10 bg-white/5"
        >
          {data.event.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={data.event.title}
              className="h-56 w-full object-cover"
              src={data.event.imageUrl}
            />
          ) : (
            <div className="h-56 w-full bg-white/10" />
          )}

          <div className="p-6">
            <h1 className="text-3xl font-semibold text-white">{data.event.title}</h1>
            <p className="mt-2 text-sm text-zinc-400">{data.event.description ?? "Sem descrição."}</p>
            <div className="mt-4 grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
              <p>
                <strong className="text-white">Data:</strong> {formatDateTime(data.event.startsAt)}
              </p>
              <p>
                <strong className="text-white">Local:</strong> {data.event.location ?? "A definir"}
              </p>
            </div>
          </div>
        </RevealWrapper>

        <RevealWrapper
          as="section"
          className="rounded-xl border border-white/10 bg-white/5 p-5"
        >
          <h2 className="text-lg font-semibold text-white">Lotes</h2>
          <ul className="mt-4 grid gap-3">
            {data.lots.map((lot) => (
              <li
                key={lot.id}
                className="grid gap-1 rounded-md border border-white/10 px-4 py-3 text-sm sm:grid-cols-4 sm:items-center"
              >
                <span className="font-medium text-white">{lot.title}</span>
                <span className="text-zinc-300">{formatCurrency(lot.priceInCents)}</span>
                <span className="text-zinc-300">Disponíveis: {lot.available}</span>
                <span className="text-zinc-500">Máx/pedido: {lot.maxPerOrder}</span>
              </li>
            ))}
          </ul>
        </RevealWrapper>

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
