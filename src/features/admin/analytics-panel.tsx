"use client";

import { type FormEvent, useMemo, useState } from "react";

type AnalyticsLot = {
  lotId: string;
  title: string;
  totalQuantity: number;
  availableQuantity: number;
  soldTickets: number;
  revenue: number;
  occupancyPct: number;
};

type AnalyticsCoupon = {
  couponId: string;
  uses: number;
  totalDiscount: number;
  totalRevenue: number;
};

type EventAnalyticsResponse = {
  eventId: string;
  totalRevenue: number;
  totalTickets: number;
  lotStats: AnalyticsLot[];
  couponStats: AnalyticsCoupon[];
};

type ViewState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success" }
  | { kind: "error"; message: string };

const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const FALLBACK_ERROR_MESSAGE =
  "Não foi possível carregar os analytics do evento. Verifique o slug e tente novamente.";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const formatCurrencyPtBrFromCents = (valueInCents: number): string =>
  BRL_FORMATTER.format(valueInCents / 100);

const formatPercentage = (value: number): string =>
  new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(value);

export const extractAnalyticsErrorMessage = (payload: unknown): string => {
  if (!isRecord(payload)) {
    return FALLBACK_ERROR_MESSAGE;
  }

  const error = payload.error;
  if (!isRecord(error)) {
    return FALLBACK_ERROR_MESSAGE;
  }

  const message = error.message;
  return typeof message === "string" && message.trim() ? message : FALLBACK_ERROR_MESSAGE;
};

const extractAnalyticsData = (payload: unknown): EventAnalyticsResponse | null => {
  if (!isRecord(payload)) {
    return null;
  }

  if (isRecord(payload.data)) {
    return payload.data as EventAnalyticsResponse;
  }

  return payload as EventAnalyticsResponse;
};

export function AnalyticsPanel() {
  const [slug, setSlug] = useState("");
  const [viewState, setViewState] = useState<ViewState>({ kind: "idle" });
  const [analytics, setAnalytics] = useState<EventAnalyticsResponse | null>(null);

  const lots = useMemo(() => analytics?.lotStats ?? [], [analytics]);
  const coupons = useMemo(() => analytics?.couponStats ?? [], [analytics]);
  const occupancyPct = useMemo(() => {
    if (lots.length === 0) {
      return 0;
    }

    const totals = lots.reduce(
      (acc, lot) => {
        acc.total += lot.totalQuantity;
        acc.sold += lot.soldTickets;
        return acc;
      },
      { total: 0, sold: 0 },
    );

    if (totals.total === 0) {
      return 0;
    }

    return Math.round((totals.sold / totals.total) * 100);
  }, [lots]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedSlug = slug.trim();
    if (!trimmedSlug) {
      setViewState({
        kind: "error",
        message: "Informe um slug de evento para consultar os analytics.",
      });
      return;
    }

    setViewState({ kind: "loading" });

    try {
      const response = await fetch(`/api/events/${encodeURIComponent(trimmedSlug)}/analytics`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        setAnalytics(null);
        setViewState({
          kind: "error",
          message: extractAnalyticsErrorMessage(payload),
        });
        return;
      }

      const data = extractAnalyticsData(payload);
      if (!data) {
        setAnalytics(null);
        setViewState({
          kind: "error",
          message: FALLBACK_ERROR_MESSAGE,
        });
        return;
      }

      setAnalytics(data);
      setViewState({ kind: "success" });
    } catch {
      setAnalytics(null);
      setViewState({
        kind: "error",
        message: FALLBACK_ERROR_MESSAGE,
      });
    }
  };

  return (
    <section className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Analytics do evento</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Consulte métricas operacionais por slug sem misturar regras de negócio na interface.
          </p>
        </div>
      </header>

      <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={onSubmit}>
        <label className="grid flex-1 gap-1">
          <span className="text-sm font-medium text-zinc-800">Slug do evento</span>
          <input
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            name="slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="festival-de-verao-2027"
          />
        </label>

        <button
          className="mt-auto rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={viewState.kind === "loading"}
        >
          {viewState.kind === "loading" ? "Carregando..." : "Carregar analytics"}
        </button>
      </form>

      {viewState.kind === "error" ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {viewState.message}
        </div>
      ) : null}

      {viewState.kind === "success" && analytics ? (
        <div className="mt-6 grid gap-6">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-medium text-zinc-900">Evento consultado</p>
            <p className="mt-1 text-xs text-zinc-500">ID: {analytics.eventId}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <KpiCard
              label="Ingressos vendidos"
              value={analytics.totalTickets.toLocaleString("pt-BR")}
            />
            <KpiCard
              label="Ocupacao geral"
              value={`${formatPercentage(occupancyPct)}%`}
            />
            <KpiCard
              label="Receita"
              value={formatCurrencyPtBrFromCents(analytics.totalRevenue)}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-xl border border-zinc-200 p-4">
              <h3 className="text-sm font-semibold text-zinc-900">Lotes</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="py-2 pr-4">Lote</th>
                      <th className="py-2 pr-4">Vendidos</th>
                      <th className="py-2 pr-4">Disponíveis</th>
                      <th className="py-2 pr-4">Ocupação</th>
                      <th className="py-2 pr-4">Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lots.length > 0 ? (
                      lots.map((lot) => (
                        <tr key={lot.lotId} className="border-b border-zinc-100 last:border-0">
                          <td className="py-3 pr-4 font-medium text-zinc-900">{lot.title}</td>
                          <td className="py-3 pr-4 text-zinc-700">
                            {lot.soldTickets.toLocaleString("pt-BR")}
                          </td>
                          <td className="py-3 pr-4 text-zinc-700">
                            {lot.availableQuantity.toLocaleString("pt-BR")}
                          </td>
                          <td className="py-3 pr-4 text-zinc-700">
                            {formatPercentage(lot.occupancyPct)}%
                          </td>
                          <td className="py-3 pr-4 text-zinc-700">
                            {formatCurrencyPtBrFromCents(lot.revenue)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-3 text-sm text-zinc-500" colSpan={5}>
                          Nenhum lote cadastrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 p-4">
              <h3 className="text-sm font-semibold text-zinc-900">Cupons</h3>
              <div className="mt-4 grid gap-3">
                {coupons.length > 0 ? (
                  coupons.map((coupon, index) => {
                    const usagePct =
                      analytics.totalTickets > 0
                        ? Math.round((coupon.uses / analytics.totalTickets) * 100)
                        : 0;

                    return (
                      <article
                        key={`${coupon.couponId}-${index}`}
                        className="rounded-lg border border-zinc-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">
                              Cupom {coupon.couponId}
                            </p>
                          </div>
                          <p className="text-sm font-medium text-zinc-900">
                            {formatPercentage(usagePct)}% de uso
                          </p>
                        </div>

                        <dl className="mt-3 grid gap-2 text-xs text-zinc-600 sm:grid-cols-2">
                          <div>
                            <dt className="font-medium text-zinc-700">Usos</dt>
                            <dd>
                              {coupon.uses.toLocaleString("pt-BR")}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-medium text-zinc-700">Desconto total</dt>
                            <dd>{formatCurrencyPtBrFromCents(coupon.totalDiscount)}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-zinc-700">Receita atribuída</dt>
                            <dd>{formatCurrencyPtBrFromCents(coupon.totalRevenue)}</dd>
                          </div>
                        </dl>
                      </article>
                    );
                  })
                ) : (
                  <p className="text-sm text-zinc-500">Nenhum cupom utilizado neste evento.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
