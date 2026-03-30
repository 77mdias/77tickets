"use client";

import { useEffect, useState } from "react";

import { generateTicketQrDataUrl } from "./qr-client";

export interface TicketQrProps {
  token: string;
}

export function TicketQr({ token }: TicketQrProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const dataUrl = await generateTicketQrDataUrl(token);

        if (!cancelled) {
          setSrc(dataUrl);
          setHasError(false);
        }
      } catch {
        if (!cancelled) {
          setHasError(true);
          setSrc(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (hasError) {
    return (
      <div className="rounded-md border border-zinc-300 px-3 py-2 text-xs text-zinc-500">
        QR indisponível no momento.
      </div>
    );
  }

  if (!src) {
    return (
      <div className="rounded-md border border-zinc-300 px-3 py-2 text-xs text-zinc-500">
        Gerando QR...
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={`QR do ticket ${token}`}
      className="h-40 w-40 rounded-md border border-zinc-200 bg-white p-1"
      src={src}
    />
  );
}
