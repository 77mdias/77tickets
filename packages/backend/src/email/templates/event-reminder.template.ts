import type { SendEventReminderEmailInput } from "../email.provider";

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

export const renderEventReminderEmail = (
  input: SendEventReminderEmailInput,
): string => {
  const baseUrl = normalizeBaseUrl(input.appBaseUrl);
  const eventDateTime = formatDateTime(input.event.startsAt);

  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:16px;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:24px;">
          <h1 style="margin:0 0 8px;font-size:24px;line-height:1.2;">Seu evento é amanhã</h1>
          <p style="margin:0 0 16px;font-size:14px;color:#4b5563;">Seu ingresso te espera. Revise os detalhes abaixo e deixe tudo pronto para o check-in.</p>
          <p style="margin:0 0 8px;font-size:18px;"><strong>${escapeHtml(input.event.title)}</strong></p>
          <p style="margin:0 0 4px;font-size:14px;color:#374151;">${escapeHtml(eventDateTime)}</p>
          <p style="margin:0 0 20px;font-size:14px;color:#374151;">${escapeHtml(input.event.location ?? "Local a confirmar")}</p>
          <a href="${baseUrl}/meus-ingressos" style="display:inline-block;padding:12px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;">
            Abrir meus ingressos
          </a>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

