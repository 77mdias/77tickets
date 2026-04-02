"use client";

import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
  message?: string;
}

export default function GlobalError({ error, reset, message }: ErrorPageProps) {
  const displayMessage = message ?? "Algo deu errado. Tente novamente.";
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16 bg-zinc-50">
      <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-8 shadow-sm text-center">
        <h1 className="text-xl font-semibold text-zinc-900">{displayMessage}</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Ocorreu um erro inesperado. Por favor, tente novamente ou volte para o início.
        </p>

        {isDev && error.message ? (
          <details className="mt-4 rounded-md border border-zinc-200 p-3 text-left">
            <summary className="cursor-pointer text-xs font-medium text-zinc-500">
              Detalhes do erro (dev)
            </summary>
            <pre className="mt-2 overflow-x-auto text-xs text-red-700 whitespace-pre-wrap">
              {error.message}
            </pre>
          </details>
        ) : null}

        <div className="mt-6 flex justify-center gap-3">
          <button
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            type="button"
            onClick={reset}
          >
            Tentar novamente
          </button>
          <Link
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            href="/"
          >
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}
