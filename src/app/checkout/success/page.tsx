import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-10">
      <main className="flex w-full max-w-2xl flex-col">
        <section className="rounded-2xl border border-emerald-200 bg-white px-6 py-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
            Checkout concluído
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-900">Seu pagamento foi processado</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600">
            Seus ingressos ficam disponíveis em <strong>Meus Ingressos</strong>. Se esta etapa
            ainda estiver sincronizando, aguarde alguns instantes e recarregue a página.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
              href="/meus-ingressos"
            >
              Ir para meus ingressos
            </Link>
            <Link
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
              href="/"
            >
              Voltar para eventos
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
