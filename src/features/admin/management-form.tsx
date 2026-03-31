"use client";

import { type FormEvent, useMemo, useState } from "react";

import {
  buildCreateCouponPayload,
  buildCreateEventPayload,
  buildCreateLotPayload,
  buildListEventOrdersQuery,
  buildPublishEventPayload,
  buildUpdateCouponPayload,
  buildUpdateEventStatusPayload,
  buildUpdateLotPayload,
  type CouponDiscountType,
  type CreateCouponFormValues,
  type CreateEventFormValues,
  type CreateLotFormValues,
  type ListEventOrdersQueryValues,
  type ManagementActorRole,
  type ManagementActorValues,
  type UpdateCouponFormValues,
  type UpdateEventStatusFormValues,
  type UpdateLotFormValues,
  postManagementOperation,
} from "./management-client";

type OperationViewState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type OrderStatusFilter = ListEventOrdersQueryValues["status"] | "all";

type NormalizedOrder = {
  id: string;
  status: string;
  subtotalInCents?: number;
  discountInCents?: number;
  totalInCents?: number;
  createdAt?: string;
  itemsCount: number;
};

const FIELD_CLASS = "rounded-md border border-zinc-300 px-3 py-2 text-sm";
const TEXTAREA_CLASS = `${FIELD_CLASS} min-h-[96px] resize-y`;
const CARD_CLASS = "rounded-lg border border-zinc-200 p-4";
const BUTTON_CLASS =
  "mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60";

const INITIAL_ACTOR: ManagementActorValues = {
  actorId: "",
  role: "organizer",
};

const INITIAL_CREATE_EVENT: CreateEventFormValues = {
  title: "",
  description: "",
  location: "",
  imageUrl: "",
  startsAt: "",
  endsAt: "",
};

const INITIAL_CREATE_LOT: CreateLotFormValues = {
  eventId: "",
  title: "",
  priceInCents: "",
  totalQuantity: "",
  maxPerOrder: "",
  saleStartsAt: "",
  saleEndsAt: "",
  status: "active",
};

const INITIAL_UPDATE_LOT: UpdateLotFormValues = {
  lotId: "",
  title: "",
  priceInCents: "",
  totalQuantity: "",
  maxPerOrder: "",
  saleStartsAt: "",
  saleEndsAt: "",
  status: "active",
};

const INITIAL_CREATE_COUPON: CreateCouponFormValues = {
  eventId: "",
  code: "",
  discountType: "percentage",
  discountInCents: "",
  discountPercentage: "10",
  maxRedemptions: "100",
  validFrom: "",
  validUntil: "",
};

const INITIAL_UPDATE_COUPON: UpdateCouponFormValues = {
  couponId: "",
  code: "",
  discountType: "percentage",
  discountInCents: "",
  discountPercentage: "10",
  maxRedemptions: "100",
  validFrom: "",
  validUntil: "",
};

const STATUS_OPTIONS: Array<UpdateEventStatusFormValues["targetStatus"]> = [
  "draft",
  "published",
  "cancelled",
];

const ORDER_STATUS_FILTER_OPTIONS: Array<OrderStatusFilter> = [
  "all",
  "pending",
  "paid",
  "expired",
  "cancelled",
];

const discountInputLabel = (discountType: CouponDiscountType): string =>
  discountType === "fixed" ? "Discount in cents" : "Discount percentage";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const extractOrdersArray = (data: unknown): unknown[] => {
  if (Array.isArray(data)) {
    return data;
  }

  if (isRecord(data) && Array.isArray(data.orders)) {
    return data.orders;
  }

  return [];
};

const normalizeOrderEntry = (entry: unknown): NormalizedOrder | null => {
  if (!isRecord(entry)) {
    return null;
  }

  const source = isRecord(entry.order) ? entry.order : entry;
  const id =
    typeof source.id === "string"
      ? source.id
      : typeof source.orderId === "string"
        ? source.orderId
        : null;
  const status = source.status;

  if (!id || typeof status !== "string") {
    return null;
  }

  const itemsCount = Array.isArray(entry.items) ? entry.items.length : 0;
  const subtotalInCents = typeof source.subtotalInCents === "number" ? source.subtotalInCents : undefined;
  const discountInCents = typeof source.discountInCents === "number" ? source.discountInCents : undefined;
  const totalInCents = typeof source.totalInCents === "number" ? source.totalInCents : undefined;
  const createdAt =
    typeof source.createdAt === "string"
      ? source.createdAt
      : source.createdAt instanceof Date
        ? source.createdAt.toISOString()
        : undefined;

  return {
    id,
    status,
    subtotalInCents,
    discountInCents,
    totalInCents,
    createdAt,
    itemsCount,
  };
};

const getVisibleOrders = (data: unknown, statusFilter: OrderStatusFilter): NormalizedOrder[] => {
  const normalizedOrders = extractOrdersArray(data)
    .map(normalizeOrderEntry)
    .filter((entry): entry is NormalizedOrder => entry !== null);

  if (statusFilter === "all") {
    return normalizedOrders;
  }

  return normalizedOrders.filter((order) => order.status === statusFilter);
};

const renderOperationFeedback = (state: OperationViewState) => {
  if (state.kind === "success") {
    return (
      <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
        {state.message}
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
        {state.message}
      </div>
    );
  }

  return null;
};

const renderOrderSummary = (order: NormalizedOrder) => (
  <div key={order.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-sm font-semibold text-zinc-900">Order {order.id}</p>
        <p className="text-xs text-zinc-500">Status: {order.status}</p>
      </div>
      <p className="text-sm font-medium text-zinc-900">
        {typeof order.totalInCents === "number" ? `${order.totalInCents} cents` : "Total unavailable"}
      </p>
    </div>

    <dl className="mt-3 grid gap-2 text-xs text-zinc-600 md:grid-cols-2">
      <div>
        <dt className="font-medium text-zinc-700">Items</dt>
        <dd>{order.itemsCount}</dd>
      </div>
      <div>
        <dt className="font-medium text-zinc-700">Created at</dt>
        <dd>{order.createdAt ?? "Unavailable"}</dd>
      </div>
      <div>
        <dt className="font-medium text-zinc-700">Subtotal</dt>
        <dd>{typeof order.subtotalInCents === "number" ? `${order.subtotalInCents} cents` : "Unavailable"}</dd>
      </div>
      <div>
        <dt className="font-medium text-zinc-700">Discount</dt>
        <dd>{typeof order.discountInCents === "number" ? `${order.discountInCents} cents` : "Unavailable"}</dd>
      </div>
    </dl>
  </div>
);

export function AdminManagementForm() {
  const [actor, setActor] = useState<ManagementActorValues>(INITIAL_ACTOR);

  const [createEventValues, setCreateEventValues] = useState<CreateEventFormValues>(INITIAL_CREATE_EVENT);
  const [createEventState, setCreateEventState] = useState<OperationViewState>({ kind: "idle" });

  const [createLotValues, setCreateLotValues] = useState<CreateLotFormValues>(INITIAL_CREATE_LOT);
  const [createLotState, setCreateLotState] = useState<OperationViewState>({ kind: "idle" });

  const [updateLotValues, setUpdateLotValues] = useState<UpdateLotFormValues>(INITIAL_UPDATE_LOT);
  const [updateLotState, setUpdateLotState] = useState<OperationViewState>({ kind: "idle" });

  const [listOrdersValues, setListOrdersValues] = useState<{
    eventId: string;
    status: OrderStatusFilter;
  }>({
    eventId: "",
    status: "all",
  });
  const [listOrdersState, setListOrdersState] = useState<OperationViewState>({ kind: "idle" });
  const [listOrdersData, setListOrdersData] = useState<unknown>(null);

  const [publishEventId, setPublishEventId] = useState("");
  const [publishState, setPublishState] = useState<OperationViewState>({ kind: "idle" });

  const [updateEventValues, setUpdateEventValues] = useState<UpdateEventStatusFormValues>({
    eventId: "",
    targetStatus: "cancelled",
  });
  const [updateEventState, setUpdateEventState] = useState<OperationViewState>({ kind: "idle" });

  const [createCouponValues, setCreateCouponValues] =
    useState<CreateCouponFormValues>(INITIAL_CREATE_COUPON);
  const [createCouponState, setCreateCouponState] = useState<OperationViewState>({
    kind: "idle",
  });

  const [updateCouponValues, setUpdateCouponValues] =
    useState<UpdateCouponFormValues>(INITIAL_UPDATE_COUPON);
  const [updateCouponState, setUpdateCouponState] = useState<OperationViewState>({
    kind: "idle",
  });

  const visibleOrders = useMemo(
    () => getVisibleOrders(listOrdersData, listOrdersValues.status),
    [listOrdersData, listOrdersValues.status],
  );

  const onCreateEventSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateEventState({ kind: "submitting" });

    const result = await postManagementOperation({
      endpoint: "/api/events",
      actor,
      method: "POST",
      payload: buildCreateEventPayload(createEventValues),
    });

    setCreateEventState(
      result.ok
        ? { kind: "success", message: result.message }
        : { kind: "error", message: result.message },
    );
  };

  const onCreateLotSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateLotState({ kind: "submitting" });

    const result = await postManagementOperation({
      endpoint: "/api/lots",
      actor,
      method: "POST",
      payload: buildCreateLotPayload(createLotValues),
    });

    setCreateLotState(
      result.ok
        ? { kind: "success", message: result.message }
        : { kind: "error", message: result.message },
    );
  };

  const onUpdateLotSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUpdateLotState({ kind: "submitting" });

    const result = await postManagementOperation({
      endpoint: `/api/lots/${updateLotValues.lotId.trim()}`,
      actor,
      method: "PUT",
      payload: buildUpdateLotPayload(updateLotValues),
    });

    setUpdateLotState(
      result.ok
        ? { kind: "success", message: result.message }
        : { kind: "error", message: result.message },
    );
  };

  const onListOrdersSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setListOrdersState({ kind: "submitting" });

    const result = await postManagementOperation({
      endpoint: `/api/events/${listOrdersValues.eventId.trim()}/orders`,
      actor,
      method: "GET",
      query: buildListEventOrdersQuery({
        status: listOrdersValues.status === "all" ? "" : listOrdersValues.status,
      }),
    });

    setListOrdersData(result.ok ? result.data : null);
    setListOrdersState(
      result.ok
        ? { kind: "success", message: result.message }
        : { kind: "error", message: result.message },
    );
  };

  const onPublishSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPublishState({ kind: "submitting" });

    const result = await postManagementOperation({
      endpoint: "/api/events/publish",
      actor,
      method: "POST",
      payload: buildPublishEventPayload({ eventId: publishEventId }),
    });

    setPublishState(
      result.ok
        ? { kind: "success", message: result.message }
        : { kind: "error", message: result.message },
    );
  };

  const onUpdateEventSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUpdateEventState({ kind: "submitting" });

    const result = await postManagementOperation({
      endpoint: "/api/events/update-status",
      actor,
      method: "POST",
      payload: buildUpdateEventStatusPayload(updateEventValues),
    });

    setUpdateEventState(
      result.ok
        ? { kind: "success", message: result.message }
        : { kind: "error", message: result.message },
    );
  };

  const onCreateCouponSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateCouponState({ kind: "submitting" });

    const result = await postManagementOperation({
      endpoint: "/api/coupons/create",
      actor,
      method: "POST",
      payload: buildCreateCouponPayload(createCouponValues),
    });

    setCreateCouponState(
      result.ok
        ? { kind: "success", message: result.message }
        : { kind: "error", message: result.message },
    );
  };

  const onUpdateCouponSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUpdateCouponState({ kind: "submitting" });

    const result = await postManagementOperation({
      endpoint: "/api/coupons/update",
      actor,
      method: "POST",
      payload: buildUpdateCouponPayload(updateCouponValues),
    });

    setUpdateCouponState(
      result.ok
        ? { kind: "success", message: result.message }
        : { kind: "error", message: result.message },
    );
  };

  return (
    <section className="w-full max-w-6xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-zinc-900">Organizer/Admin Management</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Minimal operational UI for event creation, lot management, order lookup, event status
        changes, and coupon governance. All ownership, RBAC, and business rules remain server-side.
      </p>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Actor Context</h2>
        <p className="mt-1 text-xs text-zinc-600">
          Required by admin endpoints through request headers.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-zinc-800">Actor ID</span>
            <input
              className={FIELD_CLASS}
              name="actorId"
              value={actor.actorId}
              onChange={(nextEvent) =>
                setActor((previous) => ({ ...previous, actorId: nextEvent.target.value }))
              }
              placeholder="00000000-0000-0000-0000-000000000001"
              required
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-zinc-800">Role</span>
            <select
              className={FIELD_CLASS}
              value={actor.role}
              onChange={(nextEvent) =>
                setActor((previous) => ({
                  ...previous,
                  role: nextEvent.target.value as ManagementActorRole,
                }))
              }
            >
              <option value="organizer">organizer</option>
              <option value="admin">admin</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <form className={CARD_CLASS} onSubmit={onCreateEventSubmit}>
          <h3 className="text-sm font-semibold text-zinc-900">Create Event</h3>
          <p className="mt-1 text-xs text-zinc-600">Creates the shell event. Ownership remains server-derived.</p>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm font-medium text-zinc-800">Title</span>
              <input
                className={FIELD_CLASS}
                value={createEventValues.title}
                onChange={(nextEvent) =>
                  setCreateEventValues((previous) => ({ ...previous, title: nextEvent.target.value }))
                }
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-medium text-zinc-800">Description</span>
              <textarea
                className={TEXTAREA_CLASS}
                value={createEventValues.description}
                onChange={(nextEvent) =>
                  setCreateEventValues((previous) => ({
                    ...previous,
                    description: nextEvent.target.value,
                  }))
                }
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">Location</span>
                <input
                  className={FIELD_CLASS}
                  value={createEventValues.location}
                  onChange={(nextEvent) =>
                    setCreateEventValues((previous) => ({
                      ...previous,
                      location: nextEvent.target.value,
                    }))
                  }
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">Image URL</span>
                <input
                  className={FIELD_CLASS}
                  value={createEventValues.imageUrl}
                  onChange={(nextEvent) =>
                    setCreateEventValues((previous) => ({
                      ...previous,
                      imageUrl: nextEvent.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">Starts at</span>
                <input
                  className={FIELD_CLASS}
                  type="datetime-local"
                  value={createEventValues.startsAt}
                  onChange={(nextEvent) =>
                    setCreateEventValues((previous) => ({
                      ...previous,
                      startsAt: nextEvent.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">Ends at</span>
                <input
                  className={FIELD_CLASS}
                  type="datetime-local"
                  value={createEventValues.endsAt}
                  onChange={(nextEvent) =>
                    setCreateEventValues((previous) => ({
                      ...previous,
                      endsAt: nextEvent.target.value,
                    }))
                  }
                  required
                />
              </label>
            </div>
          </div>
          <button
            className={BUTTON_CLASS}
            type="submit"
            disabled={createEventState.kind === "submitting"}
          >
            {createEventState.kind === "submitting" ? "Creating..." : "Create event"}
          </button>
          {renderOperationFeedback(createEventState)}
        </form>

        <form className={CARD_CLASS} onSubmit={onCreateLotSubmit}>
          <h3 className="text-sm font-semibold text-zinc-900">Create Lot</h3>
          <p className="mt-1 text-xs text-zinc-600">Client sends lot inputs only. Availability rules stay on the server.</p>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm font-medium text-zinc-800">Event ID</span>
              <input
                className={FIELD_CLASS}
                value={createLotValues.eventId}
                onChange={(nextEvent) =>
                  setCreateLotValues((previous) => ({ ...previous, eventId: nextEvent.target.value }))
                }
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-medium text-zinc-800">Title</span>
              <input
                className={FIELD_CLASS}
                value={createLotValues.title}
                onChange={(nextEvent) =>
                  setCreateLotValues((previous) => ({ ...previous, title: nextEvent.target.value }))
                }
                required
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">Price in cents</span>
                <input
                  className={FIELD_CLASS}
                  type="number"
                  min={0}
                  step={1}
                  value={createLotValues.priceInCents}
                  onChange={(nextEvent) =>
                    setCreateLotValues((previous) => ({
                      ...previous,
                      priceInCents: nextEvent.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">Total quantity</span>
                <input
                  className={FIELD_CLASS}
                  type="number"
                  min={1}
                  step={1}
                  value={createLotValues.totalQuantity}
                  onChange={(nextEvent) =>
                    setCreateLotValues((previous) => ({
                      ...previous,
                      totalQuantity: nextEvent.target.value,
                    }))
                  }
                  required
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">Max per order</span>
                <input
                  className={FIELD_CLASS}
                  type="number"
                  min={1}
                  step={1}
                  value={createLotValues.maxPerOrder}
                  onChange={(nextEvent) =>
                    setCreateLotValues((previous) => ({
                      ...previous,
                      maxPerOrder: nextEvent.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">Status</span>
                <select
                  className={FIELD_CLASS}
                  value={createLotValues.status}
                  onChange={(nextEvent) =>
                    setCreateLotValues((previous) => ({
                      ...previous,
                      status: nextEvent.target.value as CreateLotFormValues["status"],
                    }))
                  }
                >
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="sold_out">sold_out</option>
                  <option value="closed">closed</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">Sale starts at</span>
                <input
                  className={FIELD_CLASS}
                  type="datetime-local"
                  value={createLotValues.saleStartsAt}
                  onChange={(nextEvent) =>
                    setCreateLotValues((previous) => ({
                      ...previous,
                      saleStartsAt: nextEvent.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">Sale ends at</span>
                <input
                  className={FIELD_CLASS}
                  type="datetime-local"
                  value={createLotValues.saleEndsAt}
                  onChange={(nextEvent) =>
                    setCreateLotValues((previous) => ({
                      ...previous,
                      saleEndsAt: nextEvent.target.value,
                    }))
                  }
                />
              </label>
            </div>
          </div>
          <button className={BUTTON_CLASS} type="submit" disabled={createLotState.kind === "submitting"}>
            {createLotState.kind === "submitting" ? "Creating..." : "Create lot"}
          </button>
          {renderOperationFeedback(createLotState)}
        </form>

        <form className={CARD_CLASS} onSubmit={onUpdateLotSubmit}>
          <h3 className="text-sm font-semibold text-zinc-900">Update Lot</h3>
          <p className="mt-1 text-xs text-zinc-600">Updates lot metadata without letting the client control inventory logic.</p>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm font-medium text-zinc-800">Lot ID</span>
              <input
                className={FIELD_CLASS}
                value={updateLotValues.lotId}
                onChange={(nextEvent) =>
                  setUpdateLotValues((previous) => ({ ...previous, lotId: nextEvent.target.value }))
                }
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-medium text-zinc-800">Title</span>
              <input
                className={FIELD_CLASS}
                value={updateLotValues.title}
                onChange={(nextEvent) =>
                  setUpdateLotValues((previous) => ({ ...previous, title: nextEvent.target.value }))
                }
                required
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">Price in cents</span>
                <input
                  className={FIELD_CLASS}
                  type="number"
                  min={0}
                  step={1}
                  value={updateLotValues.priceInCents}
                  onChange={(nextEvent) =>
                    setUpdateLotValues((previous) => ({
                      ...previous,
                      priceInCents: nextEvent.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">Total quantity</span>
                <input
                  className={FIELD_CLASS}
                  type="number"
                  min={1}
                  step={1}
                  value={updateLotValues.totalQuantity}
                  onChange={(nextEvent) =>
                    setUpdateLotValues((previous) => ({
                      ...previous,
                      totalQuantity: nextEvent.target.value,
                    }))
                  }
                  required
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">Max per order</span>
                <input
                  className={FIELD_CLASS}
                  type="number"
                  min={1}
                  step={1}
                  value={updateLotValues.maxPerOrder}
                  onChange={(nextEvent) =>
                    setUpdateLotValues((previous) => ({
                      ...previous,
                      maxPerOrder: nextEvent.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">Status</span>
                <select
                  className={FIELD_CLASS}
                  value={updateLotValues.status}
                  onChange={(nextEvent) =>
                    setUpdateLotValues((previous) => ({
                      ...previous,
                      status: nextEvent.target.value as UpdateLotFormValues["status"],
                    }))
                  }
                >
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="sold_out">sold_out</option>
                  <option value="closed">closed</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">Sale starts at</span>
                <input
                  className={FIELD_CLASS}
                  type="datetime-local"
                  value={updateLotValues.saleStartsAt}
                  onChange={(nextEvent) =>
                    setUpdateLotValues((previous) => ({
                      ...previous,
                      saleStartsAt: nextEvent.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">Sale ends at</span>
                <input
                  className={FIELD_CLASS}
                  type="datetime-local"
                  value={updateLotValues.saleEndsAt}
                  onChange={(nextEvent) =>
                    setUpdateLotValues((previous) => ({
                      ...previous,
                      saleEndsAt: nextEvent.target.value,
                    }))
                  }
                />
              </label>
            </div>
          </div>
          <button className={BUTTON_CLASS} type="submit" disabled={updateLotState.kind === "submitting"}>
            {updateLotState.kind === "submitting" ? "Updating..." : "Update lot"}
          </button>
          {renderOperationFeedback(updateLotState)}
        </form>

        <section className={CARD_CLASS}>
          <h3 className="text-sm font-semibold text-zinc-900">List Orders by Event</h3>
          <p className="mt-1 text-xs text-zinc-600">
            Fetches event orders once, then filters the visible list on the client by status.
          </p>
          <form className="mt-3 grid gap-3" onSubmit={onListOrdersSubmit}>
            <label className="grid gap-1">
              <span className="text-sm font-medium text-zinc-800">Event ID</span>
              <input
                className={FIELD_CLASS}
                value={listOrdersValues.eventId}
                onChange={(nextEvent) =>
                  setListOrdersValues((previous) => ({ ...previous, eventId: nextEvent.target.value }))
                }
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-medium text-zinc-800">Status filter</span>
              <select
                className={FIELD_CLASS}
                value={listOrdersValues.status}
                onChange={(nextEvent) =>
                  setListOrdersValues((previous) => ({
                    ...previous,
                    status: nextEvent.target.value as OrderStatusFilter,
                  }))
                }
              >
                {ORDER_STATUS_FILTER_OPTIONS.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {statusOption}
                  </option>
                ))}
              </select>
            </label>

            <button className={BUTTON_CLASS} type="submit" disabled={listOrdersState.kind === "submitting"}>
              {listOrdersState.kind === "submitting" ? "Loading..." : "List orders"}
            </button>
          </form>

          {renderOperationFeedback(listOrdersState)}

          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-zinc-900">Visible orders</h4>
              <span className="text-xs text-zinc-600">{visibleOrders.length} shown</span>
            </div>

            <div className="mt-3 grid gap-3">
              {visibleOrders.length > 0 ? (
                visibleOrders.map(renderOrderSummary)
              ) : (
                <p className="text-sm text-zinc-600">No orders loaded for the current filter.</p>
              )}
            </div>
          </div>
        </section>

        <form className={CARD_CLASS} onSubmit={onPublishSubmit}>
          <h3 className="text-sm font-semibold text-zinc-900">Publish Event</h3>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm font-medium text-zinc-800">Event ID</span>
              <input
                className={FIELD_CLASS}
                value={publishEventId}
                onChange={(nextEvent) => setPublishEventId(nextEvent.target.value)}
                required
              />
            </label>
          </div>
          <button className={BUTTON_CLASS} type="submit" disabled={publishState.kind === "submitting"}>
            {publishState.kind === "submitting" ? "Publishing..." : "Publish event"}
          </button>
          {renderOperationFeedback(publishState)}
        </form>

        <form className={CARD_CLASS} onSubmit={onUpdateEventSubmit}>
          <h3 className="text-sm font-semibold text-zinc-900">Update Event Status</h3>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm font-medium text-zinc-800">Event ID</span>
              <input
                className={FIELD_CLASS}
                value={updateEventValues.eventId}
                onChange={(nextEvent) =>
                  setUpdateEventValues((previous) => ({
                    ...previous,
                    eventId: nextEvent.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-medium text-zinc-800">Target status</span>
              <select
                className={FIELD_CLASS}
                value={updateEventValues.targetStatus}
                onChange={(nextEvent) =>
                  setUpdateEventValues((previous) => ({
                    ...previous,
                    targetStatus: nextEvent.target.value as UpdateEventStatusFormValues["targetStatus"],
                  }))
                }
              >
                {STATUS_OPTIONS.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {statusOption}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className={BUTTON_CLASS} type="submit" disabled={updateEventState.kind === "submitting"}>
            {updateEventState.kind === "submitting" ? "Updating..." : "Update event status"}
          </button>
          {renderOperationFeedback(updateEventState)}
        </form>

        <form className={CARD_CLASS} onSubmit={onCreateCouponSubmit}>
          <h3 className="text-sm font-semibold text-zinc-900">Create Coupon</h3>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm font-medium text-zinc-800">Event ID</span>
              <input
                className={FIELD_CLASS}
                value={createCouponValues.eventId}
                onChange={(nextEvent) =>
                  setCreateCouponValues((previous) => ({
                    ...previous,
                    eventId: nextEvent.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-medium text-zinc-800">Code</span>
              <input
                className={FIELD_CLASS}
                value={createCouponValues.code}
                onChange={(nextEvent) =>
                  setCreateCouponValues((previous) => ({ ...previous, code: nextEvent.target.value }))
                }
                required
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">Discount type</span>
                <select
                  className={FIELD_CLASS}
                  value={createCouponValues.discountType}
                  onChange={(nextEvent) =>
                    setCreateCouponValues((previous) => ({
                      ...previous,
                      discountType: nextEvent.target.value as CouponDiscountType,
                    }))
                  }
                >
                  <option value="percentage">percentage</option>
                  <option value="fixed">fixed</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">
                  {discountInputLabel(createCouponValues.discountType)}
                </span>
                <input
                  className={FIELD_CLASS}
                  type="number"
                  min={1}
                  step={1}
                  value={
                    createCouponValues.discountType === "fixed"
                      ? createCouponValues.discountInCents
                      : createCouponValues.discountPercentage
                  }
                  onChange={(nextEvent) =>
                    setCreateCouponValues((previous) =>
                      previous.discountType === "fixed"
                        ? { ...previous, discountInCents: nextEvent.target.value }
                        : { ...previous, discountPercentage: nextEvent.target.value },
                    )
                  }
                  required
                />
              </label>
            </div>

            <label className="grid gap-1">
              <span className="text-sm font-medium text-zinc-800">Max redemptions</span>
              <input
                className={FIELD_CLASS}
                type="number"
                min={1}
                step={1}
                value={createCouponValues.maxRedemptions}
                onChange={(nextEvent) =>
                  setCreateCouponValues((previous) => ({
                    ...previous,
                    maxRedemptions: nextEvent.target.value,
                  }))
                }
                required
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">Valid from</span>
                <input
                  className={FIELD_CLASS}
                  type="datetime-local"
                  value={createCouponValues.validFrom}
                  onChange={(nextEvent) =>
                    setCreateCouponValues((previous) => ({
                      ...previous,
                      validFrom: nextEvent.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">Valid until</span>
                <input
                  className={FIELD_CLASS}
                  type="datetime-local"
                  value={createCouponValues.validUntil}
                  onChange={(nextEvent) =>
                    setCreateCouponValues((previous) => ({
                      ...previous,
                      validUntil: nextEvent.target.value,
                    }))
                  }
                  required
                />
              </label>
            </div>
          </div>

          <button className={BUTTON_CLASS} type="submit" disabled={createCouponState.kind === "submitting"}>
            {createCouponState.kind === "submitting" ? "Creating..." : "Create coupon"}
          </button>
          {renderOperationFeedback(createCouponState)}
        </form>

        <form className={CARD_CLASS} onSubmit={onUpdateCouponSubmit}>
          <h3 className="text-sm font-semibold text-zinc-900">Update Coupon</h3>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm font-medium text-zinc-800">Coupon ID</span>
              <input
                className={FIELD_CLASS}
                value={updateCouponValues.couponId}
                onChange={(nextEvent) =>
                  setUpdateCouponValues((previous) => ({
                    ...previous,
                    couponId: nextEvent.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-medium text-zinc-800">Code</span>
              <input
                className={FIELD_CLASS}
                value={updateCouponValues.code}
                onChange={(nextEvent) =>
                  setUpdateCouponValues((previous) => ({ ...previous, code: nextEvent.target.value }))
                }
                required
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">Discount type</span>
                <select
                  className={FIELD_CLASS}
                  value={updateCouponValues.discountType}
                  onChange={(nextEvent) =>
                    setUpdateCouponValues((previous) => ({
                      ...previous,
                      discountType: nextEvent.target.value as CouponDiscountType,
                    }))
                  }
                >
                  <option value="percentage">percentage</option>
                  <option value="fixed">fixed</option>
                </select>
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">
                  {discountInputLabel(updateCouponValues.discountType)}
                </span>
                <input
                  className={FIELD_CLASS}
                  type="number"
                  min={1}
                  step={1}
                  value={
                    updateCouponValues.discountType === "fixed"
                      ? updateCouponValues.discountInCents
                      : updateCouponValues.discountPercentage
                  }
                  onChange={(nextEvent) =>
                    setUpdateCouponValues((previous) =>
                      previous.discountType === "fixed"
                        ? { ...previous, discountInCents: nextEvent.target.value }
                        : { ...previous, discountPercentage: nextEvent.target.value },
                    )
                  }
                  required
                />
              </label>
            </div>

            <label className="grid gap-1">
              <span className="text-sm font-medium text-zinc-800">Max redemptions</span>
              <input
                className={FIELD_CLASS}
                type="number"
                min={1}
                step={1}
                value={updateCouponValues.maxRedemptions}
                onChange={(nextEvent) =>
                  setUpdateCouponValues((previous) => ({
                    ...previous,
                    maxRedemptions: nextEvent.target.value,
                  }))
                }
                required
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">Valid from</span>
                <input
                  className={FIELD_CLASS}
                  type="datetime-local"
                  value={updateCouponValues.validFrom}
                  onChange={(nextEvent) =>
                    setUpdateCouponValues((previous) => ({
                      ...previous,
                      validFrom: nextEvent.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-zinc-800">Valid until</span>
                <input
                  className={FIELD_CLASS}
                  type="datetime-local"
                  value={updateCouponValues.validUntil}
                  onChange={(nextEvent) =>
                    setUpdateCouponValues((previous) => ({
                      ...previous,
                      validUntil: nextEvent.target.value,
                    }))
                  }
                  required
                />
              </label>
            </div>
          </div>

          <button className={BUTTON_CLASS} type="submit" disabled={updateCouponState.kind === "submitting"}>
            {updateCouponState.kind === "submitting" ? "Updating..." : "Update coupon"}
          </button>
          {renderOperationFeedback(updateCouponState)}
        </form>
      </div>
    </section>
  );
}
