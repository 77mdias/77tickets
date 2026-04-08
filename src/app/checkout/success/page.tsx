import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <div className="flex flex-1 justify-center bg-zinc-950 px-6 py-10">
      <main className="flex w-full max-w-2xl flex-col">
        <section className="rounded-2xl border border-green-500/20 bg-green-500/10 px-6 py-8">
          <p className="text-sm font-medium uppercase tracking-wide text-green-400">
            Checkout concluído
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Seu pagamento foi processado</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
            Seus ingressos ficam disponíveis em <strong className="text-zinc-200">Meus Ingressos</strong>. Se esta etapa
            ainda estiver sincronizando, aguarde alguns instantes e recarregue a página.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-950"
              href="/meus-ingressos"
            >
              Ir para meus ingressos
            </Link>
            <Link
              className="rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-zinc-300"
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
