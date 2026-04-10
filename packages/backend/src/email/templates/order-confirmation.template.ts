import type { SendOrderConfirmationEmailInput } from "../email.provider";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatDateTime = (value: Date): string =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(value);

const normalizeBaseUrl = (value: string | undefined): string =>
  (value?.trim() || "http://localhost:3000").replace(/\/+$/, "");

export const renderOrderConfirmationEmail = (
  input: SendOrderConfirmationEmailInput,
): string => {
  const baseUrl = normalizeBaseUrl(input.appBaseUrl);
  const eventDateTime = formatDateTime(input.event.startsAt);

  const ticketBlocks = input.tickets
    .map(
      (ticket) => `
        <tr>
          <td style="padding:16px;border:1px solid #e5e7eb;border-radius:8px;">
            <p style="margin:0 0 8px;font-size:14px;color:#111827;"><strong>Código:</strong> ${escapeHtml(ticket.code)}</p>
            <img src="${ticket.qrDataUrl}" alt="QR code do ingresso ${escapeHtml(ticket.code)}" style="display:block;max-width:200px;width:100%;height:auto;border-radius:8px;" />
          </td>
        </tr>
      `,
    )
    .join("");

  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:16px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:24px 24px 8px;">
          <h1 style="margin:0;font-size:24px;line-height:1.2;">Compra confirmada</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#4b5563;">Seu pedido foi pago com sucesso e seus ingressos já estão ativos.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 24px 0;">
          <p style="margin:0 0 8px;font-size:16px;"><strong>${escapeHtml(input.event.title)}</strong></p>
          <p style="margin:0 0 4px;font-size:14px;color:#374151;">${escapeHtml(eventDateTime)}</p>
          <p style="margin:0 0 16px;font-size:14px;color:#374151;">${escapeHtml(input.event.location ?? "Local a confirmar")}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${ticketBlocks}
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 24px 24px;">
          <a href="${baseUrl}/meus-ingressos" style="display:inline-block;padding:12px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;">
            Ver meus ingressos
          </a>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

