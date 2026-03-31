import Link from "next/link";
import { redirect } from "next/navigation";

import { TicketQr } from "@/features/tickets/ticket-qr";
import { getServerBaseUrl, getServerCookieHeader } from "@/lib/server-api";

interface CustomerTicket {
  id: string;
  token: string;
  status: "active" | "used" | "cancelled";
  eventId: string;
  orderId: string;
  checkedInAt: string | null;
}

interface CustomerOrder {
  id: string;
  eventId: string;
  status: "pending" | "paid" | "expired" | "cancelled";
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  createdAt: string;
  items: Array<{
    lotId: string;
    quantity: number;
    unitPriceInCents: number;
  }>;
  tickets: CustomerTicket[];
}

const formatCurrency = (valueInCents: number): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);

const statusLabel: Record<CustomerTicket["status"], string> = {
  active: "Válido",
  used: "Utilizado",
  cancelled: "Cancelado",
};

const loadCustomerOrders = async (): Promise<CustomerOrder[]> => {
  const baseUrl = await getServerBaseUrl();
  const cookieHeader = await getServerCookieHeader();

  const response = await fetch(`${baseUrl}/api/orders/mine`, {
    cache: "no-store",
    headers: cookieHeader
      ? {
          cookie: cookieHeader,
        }
      : undefined,
  });

  if (response.status === 401) {
    redirect("/login?next=/meus-ingressos");
  }

  if (!response.ok) {
    throw new Error("Could not load customer orders");
  }

  const payload = (await response.json()) as { data?: { orders?: CustomerOrder[] } };
  return payload.data?.orders ?? [];
};

export default async function MyTicketsPage() {
  const orders = await loadCustomerOrders();

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-6 py-10">
      <main className="flex w-full max-w-6xl flex-col">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900">Meus Ingressos</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Acompanhe seus pedidos e apresente o QR code no check-in.
            </p>
          </div>
          <Link
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700"
            href="/"
          >
            Ver eventos
          </Link>
        </header>

        {orders.length === 0 ? (
          <section className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-center">
            <h2 className="text-lg font-semibold text-zinc-900">Você ainda não possui ingressos</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Escolha um evento publicado e conclua seu checkout para gerar tickets com QR code.
            </p>
          </section>
        ) : (
          <section className="grid gap-5">
            {orders.map((order) => (
              <article key={order.id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="mb-4 grid gap-1 text-sm text-zinc-700 sm:grid-cols-2">
                  <p>
                    <strong>Pedido:</strong> {order.id}
                  </p>
                  <p>
                    <strong>Evento:</strong> {order.eventId}
                  </p>
                  <p>
                    <strong>Status:</strong> {order.status}
                  </p>
                  <p>
                    <strong>Total:</strong> {formatCurrency(order.totalInCents)}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {order.tickets.map((ticket) => (
                    <div key={ticket.id} className="rounded-lg border border-zinc-200 p-4">
                      <p className="text-xs uppercase tracking-wide text-zinc-500">Token</p>
                      <p className="mt-1 break-all text-sm font-medium text-zinc-900">{ticket.token}</p>
                      <p className="mt-1 text-sm text-zinc-700">
                        Status: <strong>{statusLabel[ticket.status]}</strong>
                      </p>
                      <div className="mt-3">
                        <TicketQr token={ticket.token} />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
