"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { DiscoveryFilters } from "./event-filters";

interface DiscoveryEvent {
  id: string;
  slug: string;
  title: string;
  startsAt: string;
  imageUrl: string | null;
  location: string | null;
}

interface DiscoveryEventsPayload {
  events?: DiscoveryEvent[];
  nextCursor?: string | null;
}

export interface EventListProps {
  filters: DiscoveryFilters;
}

const DISCOVERY_LIMIT = 12;
const DISCOVERY_ERROR_MESSAGE =
  "Não foi possível carregar os eventos no momento. Tente novamente.";

const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const buildDiscoveryQuery = (filters: DiscoveryFilters, cursor?: string | null): string => {
  const searchParams = new URLSearchParams();
  searchParams.set("limit", String(DISCOVERY_LIMIT));

  const trimmedQuery = filters.q.trim();
  const trimmedDate = filters.date.trim();
  const trimmedLocation = filters.location.trim();
  const trimmedCategory = filters.category.trim();

  if (trimmedQuery) {
    searchParams.set("q", trimmedQuery);
  }
  if (trimmedDate) {
    searchParams.set("date", trimmedDate);
  }
  if (trimmedLocation) {
    searchParams.set("location", trimmedLocation);
  }
  if (trimmedCategory) {
    searchParams.set("category", trimmedCategory);
  }
  if (cursor) {
    searchParams.set("cursor", cursor);
  }

  return searchParams.toString();
};

const extractDiscoveryPayload = (payload: unknown): DiscoveryEventsPayload => {
  if (typeof payload !== "object" || payload === null) {
    return {};
  }

  if ("data" in payload && typeof (payload as { data?: unknown }).data === "object") {
    const nested = (payload as { data?: unknown }).data;
    if (nested !== null) {
      return nested as DiscoveryEventsPayload;
    }
  }

  return payload as DiscoveryEventsPayload;
};

const dedupeEvents = (previous: DiscoveryEvent[], next: DiscoveryEvent[]): DiscoveryEvent[] => {
  const seenIds = new Set(previous.map((event) => event.id));
  const merged = [...previous];

  for (const event of next) {
    if (seenIds.has(event.id)) {
      continue;
    }

    seenIds.add(event.id);
    merged.push(event);
  }

  return merged;
};

const loadDiscoveryEvents = async (input: {
  cursor?: string | null;
  filters: DiscoveryFilters;
}): Promise<{ response: Response; payload: DiscoveryEventsPayload }> => {
  const response = await fetch(`/api/events?${buildDiscoveryQuery(input.filters, input.cursor)}`, {
    cache: "no-store",
  });
  const payload = extractDiscoveryPayload((await response.json()) as unknown);

  return { response, payload };
};

export function EventList({ filters }: EventListProps) {
  const requestIdRef = useRef(0);
  const [events, setEvents] = useState<DiscoveryEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasActiveFilters = Boolean(
    filters.q.trim() || filters.date.trim() || filters.location.trim() || filters.category.trim(),
  );

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setIsInitialLoading(true);
    setIsLoadingMore(false);
    setErrorMessage(null);
    setEvents([]);
    setNextCursor(null);

    void (async () => {
      try {
        const { response, payload } = await loadDiscoveryEvents({ filters });

        if (requestId !== requestIdRef.current) {
          return;
        }

        if (!response.ok) {
          setErrorMessage(DISCOVERY_ERROR_MESSAGE);
          return;
        }

        setEvents(Array.isArray(payload.events) ? payload.events : []);
        setNextCursor(typeof payload.nextCursor === "string" ? payload.nextCursor : null);
        setErrorMessage(null);
      } catch {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setErrorMessage(DISCOVERY_ERROR_MESSAGE);
      } finally {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setIsInitialLoading(false);
        setIsLoadingMore(false);
      }
    })();

    return () => {
      requestIdRef.current = requestId + 1;
    };
  }, [filters]);

  const onLoadMore = async () => {
    if (!nextCursor) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoadingMore(true);

    try {
      const { response, payload } = await loadDiscoveryEvents({ filters, cursor: nextCursor });

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!response.ok) {
        setErrorMessage(DISCOVERY_ERROR_MESSAGE);
        return;
      }

      setEvents((previous) =>
        dedupeEvents(previous, Array.isArray(payload.events) ? payload.events : []),
      );
      setNextCursor(typeof payload.nextCursor === "string" ? payload.nextCursor : null);
      setErrorMessage(null);
    } catch {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setErrorMessage(DISCOVERY_ERROR_MESSAGE);
    } finally {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setIsLoadingMore(false);
    }
  };

  if (isInitialLoading) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-600">Carregando eventos publicados...</p>
      </section>
    );
  }

  if (errorMessage && events.length === 0) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900 shadow-sm">
        <p className="text-sm font-medium">{errorMessage}</p>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Nenhum evento encontrado</h2>
        <p className="mt-2 text-sm text-zinc-600">
          {hasActiveFilters
            ? "Ajuste os filtros para ampliar a busca."
            : "Ainda não há eventos publicados para exibir."}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {events.map((event) => (
          <article
            key={event.id}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
          >
            {event.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={event.title} className="h-40 w-full object-cover" src={event.imageUrl} />
            ) : (
              <div className="h-40 w-full bg-zinc-100" />
            )}

            <div className="p-4">
              <h2 className="text-lg font-semibold text-zinc-900">{event.title}</h2>
              <p className="mt-1 text-sm text-zinc-600">{formatDateTime(event.startsAt)}</p>
              <p className="mt-1 text-sm text-zinc-500">{event.location ?? "Local a definir"}</p>
              <Link
                className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
                href={`/eventos/${event.slug}`}
              >
                Ver detalhes
              </Link>
            </div>
          </article>
        ))}
      </div>

      {nextCursor ? (
        <div className="flex justify-center pt-2">
          <button
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Carregando..." : "Carregar mais"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

export { buildDiscoveryQuery };
