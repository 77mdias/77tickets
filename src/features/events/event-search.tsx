"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { EventFilters, type DiscoveryFilters } from "./event-filters";
import { EventList } from "./event-list";

export const DISCOVERY_SEARCH_DEBOUNCE_MS = 300;

const getTrimmedQueryValue = (value: string | null): string => value?.trim() ?? "";

export const readDiscoveryFilters = (searchParams: {
  get(name: string): string | null;
}): DiscoveryFilters => ({
  q: getTrimmedQueryValue(searchParams.get("q")),
  date: getTrimmedQueryValue(searchParams.get("date")),
  location: getTrimmedQueryValue(searchParams.get("location")),
  category: getTrimmedQueryValue(searchParams.get("category")),
});

export const buildDiscoveryHref = (pathname: string, filters: DiscoveryFilters): string => {
  const searchParams = new URLSearchParams();

  if (filters.q.trim()) {
    searchParams.set("q", filters.q.trim());
  }
  if (filters.date.trim()) {
    searchParams.set("date", filters.date.trim());
  }
  if (filters.location.trim()) {
    searchParams.set("location", filters.location.trim());
  }
  if (filters.category.trim()) {
    searchParams.set("category", filters.category.trim());
  }

  const queryString = searchParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
};

export function EventSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [filters, setFilters] = useState<DiscoveryFilters>(() => readDiscoveryFilters(searchParams));
  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextHref = buildDiscoveryHref(pathname, filtersRef.current);
      const currentHref = queryString ? `${pathname}?${queryString}` : pathname;

      if (nextHref !== currentHref) {
        router.replace(nextHref, { scroll: false });
      }
    }, DISCOVERY_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [filters.q, pathname, queryString, router]);

  useEffect(() => {
    const nextHref = buildDiscoveryHref(pathname, filtersRef.current);
    const currentHref = queryString ? `${pathname}?${queryString}` : pathname;

    if (nextHref !== currentHref) {
      router.replace(nextHref, { scroll: false });
    }
  }, [filters.date, filters.location, filters.category, pathname, queryString, router]);

  return (
    <div className="grid gap-5">
      <EventFilters
        filters={filters}
        onChange={(key, value) =>
          setFilters((current) => ({
            ...current,
            [key]: value,
          }))
        }
      />

      <EventList filters={filters} />
    </div>
  );
}
