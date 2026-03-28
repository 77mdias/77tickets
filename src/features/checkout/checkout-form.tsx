"use client";

import { type FormEvent, useState } from "react";

import {
  buildCheckoutPayload,
  extractCheckoutErrorMessage,
  type CheckoutFormValues,
} from "./checkout-client";

interface CheckoutSuccessState {
  orderId: string;
  status: string;
}

type CheckoutViewState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; data: CheckoutSuccessState }
  | { kind: "error"; message: string };

const INITIAL_VALUES: CheckoutFormValues = {
  eventId: "",
  lotId: "",
  quantity: "1",
  couponCode: "",
};

export function CheckoutForm() {
  const [values, setValues] = useState<CheckoutFormValues>(INITIAL_VALUES);
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
        setViewState({
          kind: "error",
          message: extractCheckoutErrorMessage(payload),
        });
        return;
      }

      const data = (payload as { data?: { orderId?: string; status?: string } }).data;

      setViewState({
        kind: "success",
        data: {
          orderId: data?.orderId ?? "unknown",
          status: data?.status ?? "unknown",
        },
      });
    } catch {
      setViewState({
        kind: "error",
        message: "Could not complete checkout. Please review your input and try again.",
      });
    }
  };

  return (
    <section className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-zinc-900">Checkout</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Minimal form connected to <code>/api/orders</code>. Pricing and stock validation stay on
        the server.
      </p>

      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-800">Event ID</span>
          <input
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            name="eventId"
            value={values.eventId}
            onChange={(event) => setValues((prev) => ({ ...prev, eventId: event.target.value }))}
            required
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-800">Lot ID</span>
          <input
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            name="lotId"
            value={values.lotId}
            onChange={(event) => setValues((prev) => ({ ...prev, lotId: event.target.value }))}
            required
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-800">Quantity</span>
          <input
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
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
          <span className="text-sm font-medium text-zinc-800">Coupon Code (optional)</span>
          <input
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            name="couponCode"
            value={values.couponCode}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, couponCode: event.target.value }))
            }
          />
        </label>

        <button
          className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={viewState.kind === "submitting"}
        >
          {viewState.kind === "submitting" ? "Submitting..." : "Submit order"}
        </button>
      </form>

      {viewState.kind === "success" ? (
        <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Order created: <strong>{viewState.data.orderId}</strong> ({viewState.data.status})
        </div>
      ) : null}

      {viewState.kind === "error" ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {viewState.message}
        </div>
      ) : null}
    </section>
  );
}
