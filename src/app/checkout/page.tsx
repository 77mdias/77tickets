import Link from "next/link";

import { CheckoutForm } from "@/features/checkout/checkout-form";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; lotId?: string; quantity?: string }>;
}) {
  const params = await searchParams;

  const hasRequiredParams = Boolean(params.eventId && params.lotId);

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-10">
      <main className="flex w-full max-w-3xl flex-col items-center gap-4">
        {!hasRequiredParams ? (
          <section className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Selecione um evento e um lote antes de continuar para o checkout.
            <div className="mt-3">
              <Link className="font-medium underline" href="/">
                Voltar para eventos
              </Link>
            </div>
          </section>
        ) : null}

        <CheckoutForm
          initialEventId={params.eventId ?? ""}
          initialLotId={params.lotId ?? ""}
          initialQuantity={params.quantity ?? "1"}
        />
      </main>
    </div>
  );
}
