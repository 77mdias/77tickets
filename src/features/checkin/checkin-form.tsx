"use client";

import { type FormEvent, useState } from "react";

import {
  buildCheckinPayload,
  extractCheckinErrorMessage,
  type CheckinFormValues,
} from "./checkin-client";

interface CheckinSuccessState {
  ticketId: string;
  eventId: string;
  checkerId: string;
  validatedAt: string;
}

type CheckinViewState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; data: CheckinSuccessState }
  | { kind: "error"; message: string };

const INITIAL_VALUES: CheckinFormValues = {
  ticketId: "",
  eventId: "",
};

export function CheckinForm() {
  const [values, setValues] = useState<CheckinFormValues>(INITIAL_VALUES);
  const [viewState, setViewState] = useState<CheckinViewState>({ kind: "idle" });

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setViewState({ kind: "submitting" });

    try {
      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(buildCheckinPayload(values)),
      });

      const payload = (await response.json()) as unknown;
      if (!response.ok) {
        setViewState({
          kind: "error",
          message: extractCheckinErrorMessage(payload),
        });
        return;
      }

      const data = (
        payload as {
          data?: {
            ticketId?: string;
            eventId?: string;
            checkerId?: string;
            validatedAt?: string;
          };
        }
      ).data;

      setViewState({
        kind: "success",
        data: {
          ticketId: data?.ticketId ?? "unknown",
          eventId: data?.eventId ?? "unknown",
          checkerId: data?.checkerId ?? "unknown",
          validatedAt: data?.validatedAt ?? "unknown",
        },
      });
    } catch {
      setViewState({
        kind: "error",
        message: "Could not validate ticket. Please review your input and try again.",
      });
    }
  };

  return (
    <section className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-zinc-900">Operational Check-in</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Minimal checker screen connected to <code>/api/checkin</code>. Ticket validity is decided
        server-side.
      </p>

      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-800">Ticket ID</span>
          <input
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            name="ticketId"
            value={values.ticketId}
            onChange={(nextEvent) =>
              setValues((previousValues) => ({
                ...previousValues,
                ticketId: nextEvent.target.value,
              }))
            }
            required
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-800">Event ID</span>
          <input
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            name="eventId"
            value={values.eventId}
            onChange={(nextEvent) =>
              setValues((previousValues) => ({
                ...previousValues,
                eventId: nextEvent.target.value,
              }))
            }
            required
          />
        </label>

        <button
          className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={viewState.kind === "submitting"}
        >
          {viewState.kind === "submitting" ? "Validating..." : "Validate ticket"}
        </button>
      </form>

      {viewState.kind === "success" ? (
        <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Check-in approved for ticket <strong>{viewState.data.ticketId}</strong> in event{" "}
          <strong>{viewState.data.eventId}</strong>. Checker: {viewState.data.checkerId}. Validated
          at: {viewState.data.validatedAt}.
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
