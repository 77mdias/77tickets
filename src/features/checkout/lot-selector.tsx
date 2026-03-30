"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-zinc-900">Checkout</h2>
        <p className="mt-2 text-sm text-zinc-600">
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
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-zinc-900">Selecionar Lote</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Escolha o lote e a quantidade respeitando o limite por pedido.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-800">Lote</span>
          <select
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
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
          <span className="text-sm font-medium text-zinc-800">Quantidade</span>
          <input
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
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
        className="mt-5 inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        href={`/checkout?${checkoutParams.toString()}`}
      >
        Comprar
      </Link>
    </section>
  );
}
