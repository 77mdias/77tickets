"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  buildCheckoutPayload,
  extractCheckoutErrorMessage,
  extractCheckoutRedirectTarget,
  type CheckoutFormValues,
} from "./checkout-client";

type CheckoutViewState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string };

const DEFAULT_VALUES: CheckoutFormValues = {
  eventId: "",
  lotId: "",
  quantity: "1",
  couponCode: "",
};

export interface CheckoutFormProps {
  initialEventId?: string;
  initialLotId?: string;
  initialQuantity?: string;
}

export function CheckoutForm({
  initialEventId = "",
  initialLotId = "",
  initialQuantity = "1",
}: CheckoutFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<CheckoutFormValues>({
    ...DEFAULT_VALUES,
    eventId: initialEventId,
    lotId: initialLotId,
    quantity: initialQuantity,
  });
  const [viewState, setViewState] = useState<CheckoutViewState>({ kind: "idle" });

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setViewState({ kind: "submitting" });

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(buildCheckoutPayload(values)),
      });

      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        const errorMessage = extractCheckoutErrorMessage(payload);
        setViewState({ kind: "error", message: errorMessage });
        toast.error("Erro ao processar pagamento. Tente novamente.");
        return;
      }

      const redirectTarget = extractCheckoutRedirectTarget(payload);

      if (!redirectTarget) {
        const errorMessage = "Could not complete checkout. Please review your input and try again.";
        setViewState({ kind: "error", message: errorMessage });
        toast.error("Erro ao processar pagamento. Tente novamente.");
        return;
      }

      toast.success("Pedido criado com sucesso!");

      if (redirectTarget.isExternal) {
        window.location.href = redirectTarget.checkoutUrl;
        return;
      }

      router.push(redirectTarget.checkoutUrl);
      router.refresh();
    } catch {
      const errorMessage = "Could not complete checkout. Please review your input and try again.";
      setViewState({ kind: "error", message: errorMessage });
      toast.error("Erro ao processar pagamento. Tente novamente.");
    }
  };

  return (
    <section className="w-full max-w-2xl rounded-xl border border-white/10 bg-white/5 p-6">
      <h1 className="text-2xl font-semibold text-white">Checkout</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Formulário conectado ao <code>/api/orders</code>. Preço, estoque e identidade do comprador
        são sempre validados no servidor.
      </p>

      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-300">Event ID</span>
          <input
            className="w-full rounded-md border border-white/15 bg-zinc-900 px-3 py-2 text-base text-white focus:outline-none focus:border-white/30"
            name="eventId"
            value={values.eventId}
            onChange={(event) => setValues((prev) => ({ ...prev, eventId: event.target.value }))}
            required
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-300">Lot ID</span>
          <input
            className="w-full rounded-md border border-white/15 bg-zinc-900 px-3 py-2 text-base text-white focus:outline-none focus:border-white/30"
            name="lotId"
            value={values.lotId}
            onChange={(event) => setValues((prev) => ({ ...prev, lotId: event.target.value }))}
            required
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-300">Quantity</span>
          <input
            className="w-full rounded-md border border-white/15 bg-zinc-900 px-3 py-2 text-base text-white focus:outline-none focus:border-white/30"
            name="quantity"
            type="number"
            min={1}
            step={1}
            value={values.quantity}
            onChange={(event) => setValues((prev) => ({ ...prev, quantity: event.target.value }))}
            required
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-300">Coupon Code (optional)</span>
          <input
            className="w-full rounded-md border border-white/15 bg-zinc-900 px-3 py-2 text-base text-white focus:outline-none focus:border-white/30"
            name="couponCode"
            value={values.couponCode}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, couponCode: event.target.value }))
            }
          />
        </label>

        <button
          className="mt-2 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={viewState.kind === "submitting"}
        >
          {viewState.kind === "submitting" ? (
            <>
              <svg
                aria-hidden="true"
                className="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
              </svg>
              Processando...
            </>
          ) : (
            "Finalizar pedido"
          )}
        </button>
      </form>

      {viewState.kind === "error" ? (
        <div className="mt-6 rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {viewState.message}
        </div>
      ) : null}
    </section>
  );
}
