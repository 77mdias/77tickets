"use client";

import { type FormEvent, useCallback, useState } from "react";
import { toast } from "sonner";

import {
  buildCheckinPayload,
  extractCheckinErrorMessage,
  type CheckinFormValues,
} from "./checkin-client";
import { QrScanner } from "./qr-scanner";

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

const submitCheckin = async (values: CheckinFormValues) => {
  const response = await fetch("/api/checkin", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildCheckinPayload(values)),
  });
  return response;
};

export function CheckinForm() {
  const [values, setValues] = useState<CheckinFormValues>(INITIAL_VALUES);
  const [viewState, setViewState] = useState<CheckinViewState>({ kind: "idle" });
  const [cameraError, setCameraError] = useState<string | null>(null);

  const handleCheckinResponse = async (response: Response) => {
    const payload = (await response.json()) as unknown;
    if (!response.ok) {
      const errorMessage = extractCheckinErrorMessage(payload);
      setViewState({ kind: "error", message: errorMessage });
      toast.error(`Falha no check-in: ${errorMessage}`);
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
    toast.success("Check-in realizado com sucesso!");
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setViewState({ kind: "submitting" });

    try {
      const response = await submitCheckin(values);
      await handleCheckinResponse(response);
    } catch {
      setViewState({
        kind: "error",
        message: "Could not validate ticket. Please review your input and try again.",
      });
      toast.error("Falha no check-in. Verifique os dados e tente novamente.");
    }
  };

  const handleQrScan = useCallback(
    async (code: string) => {
      // QR code from TicketQR is the ticket token. We need ticketId and eventId separately.
      // The token encodes the ticketId; eventId comes from the form field.
      // Auto-fill ticketId and submit if eventId is present.
      const nextValues: CheckinFormValues = { ...values, ticketId: code };
      setValues(nextValues);

      if (!nextValues.eventId.trim()) {
        return; // User still needs to fill eventId
      }

      setViewState({ kind: "submitting" });
      try {
        const response = await submitCheckin(nextValues);
        await handleCheckinResponse(response);
      } catch {
        setViewState({
          kind: "error",
          message: "Could not validate ticket. Please review your input and try again.",
        });
        toast.error("Falha no check-in. Verifique os dados e tente novamente.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values.eventId],
  );

  const handleCameraError = useCallback((reason: string) => {
    setCameraError(reason);
  }, []);

  return (
    <section className="w-full max-w-2xl rounded-xl border border-white/10 bg-white/5 p-6">
      <h1 className="text-2xl font-semibold text-white">Check-in</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Escaneie o QR code do ingresso ou insira o código manualmente. A validação é feita no
        servidor.
      </p>

      <div className="mt-6">
        {cameraError ? (
          <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            {cameraError}
          </div>
        ) : (
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-zinc-300">Câmera</p>
            <QrScanner onScan={handleQrScan} onError={handleCameraError} />
          </div>
        )}
      </div>

      <form className="mt-4 grid gap-4" onSubmit={onSubmit}>
        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-300">Ticket ID</span>
          <input
            className="rounded-md border border-white/15 bg-zinc-900 px-3 py-2 text-base text-white"
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
          <span className="text-sm font-medium text-zinc-300">Event ID</span>
          <input
            className="rounded-md border border-white/15 bg-zinc-900 px-3 py-2 text-base text-white"
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
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  fill="currentColor"
                />
              </svg>
              Processando...
            </>
          ) : (
            "Realizar check-in"
          )}
        </button>
      </form>

      {viewState.kind === "success" ? (
        <div className="mt-6 rounded-md border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          Check-in aprovado para o ingresso <strong>{viewState.data.ticketId}</strong> no evento{" "}
          <strong>{viewState.data.eventId}</strong>. Checker: {viewState.data.checkerId}. Validado
          em: {viewState.data.validatedAt}.
        </div>
      ) : null}

      {viewState.kind === "error" ? (
        <div className="mt-6 rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {viewState.message}
        </div>
      ) : null}
    </section>
  );
}
