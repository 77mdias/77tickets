"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { extractCheckoutErrorMessage } from "@/features/checkout/checkout-client";

type SimulatePaymentState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string };

export default function CheckoutSimulatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<SimulatePaymentState>({ kind: "idle" });

  const orderId = searchParams.get("orderId")?.trim() ?? "";
  const hasOrderId = orderId.length > 0;

  const onSimulatePayment = async () => {
    if (!hasOrderId) {
      setState({
        kind: "error",
        message: "Missing order id. Return to checkout and create a new order.",
      });
      return;
    }

    setState({ kind: "submitting" });

    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/simulate-payment`, {
        method: "POST",
      });
      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        setState({
          kind: "error",
          message: extractCheckoutErrorMessage(payload),
        });
        return;
      }

      router.replace("/checkout/success");
    } catch {
      setState({
        kind: "error",
        message: "Could not simulate payment. Please try again.",
      });
    }
  };

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-10">
      <main className="flex w-full max-w-2xl flex-col">
        <section className="rounded-2xl border border-zinc-200 bg-white px-6 py-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-600">Modo demo</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-900">
            Simular pagamento do pedido
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600">
            Esta tela confirma o pedido sem gateway externo quando <code>PAYMENT_MODE=demo</code>.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              onClick={onSimulatePayment}
              disabled={!hasOrderId || state.kind === "submitting"}
            >
              {state.kind === "submitting" ? "Simulando..." : "Simular pagamento"}
            </button>
            <Link
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
              href="/checkout/cancel"
            >
              Cancelar
            </Link>
          </div>

          {!hasOrderId ? (
            <p className="mt-4 text-sm text-amber-700">
              Pedido ausente. Volte ao checkout e tente novamente.
            </p>
          ) : null}

          {state.kind === "error" ? (
            <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {state.message}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
