import type { Lot } from "./lot.types";

export type LotValidationReason =
  | "out_of_window"
  | "lot_not_active"
  | "exceeds_per_order_limit"
  | "insufficient_stock";

export type LotValidationResult = { ok: true } | { ok: false; reason: LotValidationReason };

export function isLotInSaleWindow(lot: Lot, now: Date): boolean {
  if (now < lot.saleStartsAt) return false;
  if (lot.saleEndsAt !== null && now > lot.saleEndsAt) return false;
  return true;
}

export function isLotActive(lot: Lot): boolean {
  return lot.status === "active";
}

export function isWithinPerOrderLimit(lot: Lot, quantity: number): boolean {
  return quantity <= lot.maxPerOrder;
}

export function hasLotSufficientStock(lot: Lot, quantity: number): boolean {
  return lot.availableQuantity >= quantity;
}

export function validateLotForPurchase(
  lot: Lot,
  quantity: number,
  now: Date,
): LotValidationResult {
  if (!isLotInSaleWindow(lot, now)) return { ok: false, reason: "out_of_window" };
  if (!isLotActive(lot)) return { ok: false, reason: "lot_not_active" };
  if (!isWithinPerOrderLimit(lot, quantity)) return { ok: false, reason: "exceeds_per_order_limit" };
  if (!hasLotSufficientStock(lot, quantity)) return { ok: false, reason: "insufficient_stock" };
  return { ok: true };
}
