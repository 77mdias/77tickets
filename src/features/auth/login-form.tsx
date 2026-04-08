"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

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

  const sectionRef = useRef<HTMLElement>(null);
  useScrollReveal(sectionRef);

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
    <section ref={sectionRef} className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-6">
      <h1 className="text-2xl font-semibold text-white">Entrar</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Faça login para concluir compras e acessar seus ingressos.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            mode === "signin" ? "bg-white text-zinc-950" : "border border-white/20 text-zinc-400 hover:text-zinc-200"
          }`}
          type="button"
          onClick={() => setMode("signin")}
        >
          Entrar
        </button>
        <button
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            mode === "signup" ? "bg-white text-zinc-950" : "border border-white/20 text-zinc-400 hover:text-zinc-200"
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
            <span className="text-sm font-medium text-zinc-300">Nome</span>
            <input
              className="rounded-md border border-white/15 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
        ) : null}

        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-300">E-mail</span>
          <input
            className="rounded-md border border-white/15 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium text-zinc-300">Senha</span>
          <input
            className="rounded-md border border-white/15 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            type="password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {viewState.message}
        </div>
      ) : null}
    </section>
  );
}
