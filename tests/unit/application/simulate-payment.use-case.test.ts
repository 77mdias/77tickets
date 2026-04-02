import { expect, test, vi } from "vitest";

type SimulatePaymentUseCaseFactory = (dependencies: {
  paymentMode: () => string | undefined;
  confirmOrderPayment: (input: { orderId: string }) => Promise<{
    outcome: "confirmed" | "already_paid";
  }>;
}) => (input: { orderId: string }) => Promise<{
  outcome: "confirmed" | "already_paid";
}>;

async function loadFactory(): Promise<SimulatePaymentUseCaseFactory> {
  const importedModule = await import(
    "../../../src/server/application/use-cases/simulate-payment.use-case"
  );
  const factory = (importedModule as { createSimulatePaymentUseCase?: unknown })
    .createSimulatePaymentUseCase;

  if (typeof factory !== "function") {
    throw new Error("PAY-004 RED: expected createSimulatePaymentUseCase export");
  }

  return factory as SimulatePaymentUseCaseFactory;
}

test("PAY-004 RED: simulates payment only when PAYMENT_MODE is demo", async () => {
  const createUseCase = await loadFactory();
  const confirmOrderPayment = vi.fn(async () => ({ outcome: "confirmed" as const }));

  const useCase = createUseCase({
    paymentMode: () => "demo",
    confirmOrderPayment,
  });

  const result = await useCase({ orderId: "ord_demo_001" });

  expect(result).toMatchObject({ outcome: "confirmed" });
  expect(confirmOrderPayment).toHaveBeenCalledWith({ orderId: "ord_demo_001" });
});

test("PAY-004 RED: blocks simulation when PAYMENT_MODE is not demo", async () => {
  const createUseCase = await loadFactory();
  const confirmOrderPayment = vi.fn(async () => ({ outcome: "confirmed" as const }));

  const useCase = createUseCase({
    paymentMode: () => "stripe",
    confirmOrderPayment,
  });

  await expect(useCase({ orderId: "ord_demo_002" })).rejects.toMatchObject({
    code: "authorization",
  });
  expect(confirmOrderPayment).not.toHaveBeenCalled();
});
