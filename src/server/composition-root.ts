/**
 * Composition root — single place for infrastructure instantiation.
 *
 * Transport strategy:
 *   - HTTP transport (getHttpDb): stateless per-query HTTP request, immune to
 *     Neon auto-suspend "Connection terminated" errors. Used for all repos
 *     that do NOT call db.transaction().
 *   - WebSocket transport (getDb): persistent pool, required for db.transaction().
 *     Used ONLY by OrderRepository (which creates orders inside a transaction).
 *
 * Each getter is lazy and cached: the instance is created on first access
 * and reused for the lifetime of the process.
 *
 * Route handlers should import from here instead of instantiating
 * repositories directly. This keeps routes thin and makes it trivial to
 * add cross-cutting concerns (caching, observability) in one place.
 */

import { getDb, getHttpDb, type Db } from "@/server/infrastructure/db";
import {
  DrizzleCouponRepository,
  DrizzleEventRepository,
  DrizzleLotRepository,
  DrizzleOrderRepository,
  DrizzleTicketRepository,
  DrizzleUserRepository,
} from "@/server/repositories/drizzle";

let eventRepository: DrizzleEventRepository | null = null;
let orderRepository: DrizzleOrderRepository | null = null;
let lotRepository: DrizzleLotRepository | null = null;
let couponRepository: DrizzleCouponRepository | null = null;
let ticketRepository: DrizzleTicketRepository | null = null;
let userRepository: DrizzleUserRepository | null = null;

// HTTP transport cast: safe because these repositories never call db.transaction().
// HttpDb supports all Drizzle query operations (select/insert/update/delete) but
// uses stateless per-request HTTP instead of a persistent WebSocket pool.
// This prevents 500 errors caused by Neon auto-suspend on idle WebSocket connections.
const http = (): Db => getHttpDb() as unknown as Db;

export const getEventRepository = (): DrizzleEventRepository => {
  if (!eventRepository) eventRepository = new DrizzleEventRepository(http());
  return eventRepository;
};

// WebSocket pool required: OrderRepository.create() uses db.transaction().
export const getOrderRepository = (): DrizzleOrderRepository => {
  if (!orderRepository) orderRepository = new DrizzleOrderRepository(getDb());
  return orderRepository;
};

export const getLotRepository = (): DrizzleLotRepository => {
  if (!lotRepository) lotRepository = new DrizzleLotRepository(http());
  return lotRepository;
};

export const getCouponRepository = (): DrizzleCouponRepository => {
  if (!couponRepository) couponRepository = new DrizzleCouponRepository(http());
  return couponRepository;
};

export const getTicketRepository = (): DrizzleTicketRepository => {
  if (!ticketRepository) ticketRepository = new DrizzleTicketRepository(http());
  return ticketRepository;
};

export const getUserRepository = (): DrizzleUserRepository => {
  if (!userRepository) userRepository = new DrizzleUserRepository(http());
  return userRepository;
};
