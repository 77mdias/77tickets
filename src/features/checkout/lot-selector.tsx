"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

interface LotOption {
  id: string;
  title: string;
  priceInCents: number;
  available: number;
  maxPerOrder: number;
}

export interface LotSelectorProps {
  eventId: string;
  lots: LotOption[];
}

const formatCurrency = (valueInCents: number): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);

export function LotSelector({ eventId, lots }: LotSelectorProps) {
  const availableLots = useMemo(() => lots.filter((lot) => lot.available > 0), [lots]);
  const [selectedLotId, setSelectedLotId] = useState(availableLots[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);

  const sectionRef = useRef<HTMLElement>(null);
  useScrollReveal(sectionRef);

  const selectedLot = useMemo(
    () => availableLots.find((lot) => lot.id === selectedLotId) ?? null,
    [availableLots, selectedLotId],
  );

  const maxQuantity = selectedLot
    ? Math.max(1, Math.min(selectedLot.available, selectedLot.maxPerOrder))
    : 1;
  const safeQuantity = Math.max(1, Math.min(quantity, maxQuantity));

  if (availableLots.length === 0) {
    return (
      <section ref={sectionRef} className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold text-white">Checkout</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Não há lotes disponíveis para compra no momento.
        </p>
      </section>
    );
  }

  const checkoutParams = new URLSearchParams({
    eventId,
    lotId: selectedLot?.id ?? availableLots[0].id,
    quantity: String(safeQuantity),
  });

  return (
    <section ref={sectionRef} className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-lg font-semibold text-white">Selecionar Lote</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Escolha o lote e a quantidade respeitando o limite por pedido.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-300">Lote</span>
          <select
            className="w-full rounded-md border border-white/15 bg-zinc-900 px-3 py-2 text-base text-white focus:outline-none focus:border-white/30"
            value={selectedLot?.id ?? ""}
            onChange={(event) => {
              setSelectedLotId(event.target.value);
              setQuantity(1);
            }}
          >
            {availableLots.map((lot) => (
              <option key={lot.id} value={lot.id}>
                {lot.title} · {formatCurrency(lot.priceInCents)} · {lot.available} disponíveis
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-300">Quantidade</span>
          <input
            className="w-full rounded-md border border-white/15 bg-zinc-900 px-3 py-2 text-base text-white focus:outline-none focus:border-white/30"
            type="number"
            min={1}
            max={maxQuantity}
            step={1}
            value={safeQuantity}
            onChange={(event) => {
              const numericValue = Number(event.target.value);
              if (!Number.isFinite(numericValue)) {
                setQuantity(1);
                return;
              }
              setQuantity(Math.max(1, Math.min(maxQuantity, Math.trunc(numericValue))));
            }}
          />
          <span className="text-xs text-zinc-500">
            Limite deste lote: {maxQuantity} por pedido.
          </span>
        </label>
      </div>

      <Link
        className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-950 transition-opacity hover:opacity-90 sm:w-auto"
        href={`/checkout?${checkoutParams.toString()}`}
      >
        Comprar
      </Link>
    </section>
  );
}
