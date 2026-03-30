import { expect, test } from "vitest";

import { generateTicketQrDataUrl } from "../../../../src/features/tickets/qr-client";

test("QR-001 RED/GREEN: generates a PNG data URL from ticket token", async () => {
  const qrDataUrl = await generateTicketQrDataUrl("TKT-UNIT-QR-001");

  expect(qrDataUrl.startsWith("data:image/png;base64,")).toBe(true);
  expect(qrDataUrl.length).toBeGreaterThan(100);
});
