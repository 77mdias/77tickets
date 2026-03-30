"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type AuthMode = "signin" | "signup";

export interface LoginFormProps {
  nextPath: string;
}

type ViewState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string };

const defaultErrorMessage = "Não foi possível autenticar. Confira os dados e tente novamente.";

const extractErrorMessage = (payload: unknown): string => {
  if (typeof payload !== "object" || payload === null) {
    return defaultErrorMessage;
  }

  const message = (payload as { message?: unknown }).message;
  if (typeof message === "string" && message.trim()) {
    return message;
  }

  const nestedMessage = (payload as { error?: { message?: unknown } }).error?.message;
  if (typeof nestedMessage === "string" && nestedMessage.trim()) {
    return nestedMessage;
  }

  return defaultErrorMessage;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [viewState, setViewState] = useState<ViewState>({ kind: "idle" });

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setViewState({ kind: "submitting" });

    const endpoint = mode === "signin" ? "/api/auth/sign-in/email" : "/api/auth/sign-up/email";
    const payload =
      mode === "signin"
        ? { email: email.trim(), password }
        : {
            name: name.trim(),
            email: email.trim(),
            password,
            role: "customer",
          };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = (await response.json()) as unknown;
        setViewState({ kind: "error", message: extractErrorMessage(errorPayload) });
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch {
      setViewState({ kind: "error", message: defaultErrorMessage });
    }
  };

  return (
    <section className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-zinc-900">Entrar</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Faça login para concluir compras e acessar seus ingressos.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            mode === "signin" ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-700"
          }`}
          type="button"
          onClick={() => setMode("signin")}
        >
          Entrar
        </button>
        <button
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            mode === "signup" ? "bg-zinc-900 text-white" : "border border-zinc-300 text-zinc-700"
          }`}
          type="button"
          onClick={() => setMode("signup")}
        >
          Criar conta
        </button>
      </div>

      <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
        {mode === "signup" ? (
          <label className="grid gap-1">
            <span className="text-sm font-medium text-zinc-800">Nome</span>
            <input
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
        ) : null}

        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-800">E-mail</span>
          <input
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-800">Senha</span>
          <input
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            type="password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={viewState.kind === "submitting"}
        >
          {viewState.kind === "submitting"
            ? "Processando..."
            : mode === "signin"
              ? "Entrar"
              : "Criar conta"}
        </button>
      </form>

      {viewState.kind === "error" ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {viewState.message}
        </div>
      ) : null}
    </section>
  );
}
