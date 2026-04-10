import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-950 px-6 py-10">
      <main className="flex w-full max-w-2xl flex-col">
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-6 py-8">
          <p className="text-sm font-medium uppercase tracking-wide text-amber-400">
            Checkout cancelado
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Você pode tentar novamente</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
            Nenhuma alteração foi aplicada ao seu pedido nessa etapa. Você pode voltar para os
            eventos abertos ou revisar seus ingressos a qualquer momento.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-950"
              href="/"
            >
              Voltar para eventos
            </Link>
            <Link
              className="rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-zinc-300"
              href="/meus-ingressos"
            >
              Ver meus ingressos
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
