/**
 * Composition root — single place for infrastructure instantiation.
 *
 * All repositories share the same DB singleton from getDb().
 * Each getter is lazy and cached: the instance is created on first access
 * and reused for the lifetime of the process.
 *
 * Route handlers should import from here instead of instantiating
 * repositories directly. This keeps routes thin and makes it trivial to
 * add cross-cutting concerns (caching, observability) in one place.
 */

import { getDb } from "@/server/infrastructure/db";
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

export const getEventRepository = (): DrizzleEventRepository => {
  if (!eventRepository) eventRepository = new DrizzleEventRepository(getDb());
  return eventRepository;
};

export const getOrderRepository = (): DrizzleOrderRepository => {
  if (!orderRepository) orderRepository = new DrizzleOrderRepository(getDb());
  return orderRepository;
};

export const getLotRepository = (): DrizzleLotRepository => {
  if (!lotRepository) lotRepository = new DrizzleLotRepository(getDb());
  return lotRepository;
};

export const getCouponRepository = (): DrizzleCouponRepository => {
  if (!couponRepository) couponRepository = new DrizzleCouponRepository(getDb());
  return couponRepository;
};

export const getTicketRepository = (): DrizzleTicketRepository => {
  if (!ticketRepository) ticketRepository = new DrizzleTicketRepository(getDb());
  return ticketRepository;
};

export const getUserRepository = (): DrizzleUserRepository => {
  if (!userRepository) userRepository = new DrizzleUserRepository(getDb());
  return userRepository;
};
