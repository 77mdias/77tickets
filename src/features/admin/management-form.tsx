"use client";

import { type FormEvent, useState } from "react";

import {
  buildCreateCouponPayload,
  buildPublishEventPayload,
  buildUpdateCouponPayload,
  buildUpdateEventStatusPayload,
  type CouponDiscountType,
  type CreateCouponFormValues,
  type ManagementActorRole,
  type ManagementActorValues,
  type UpdateCouponFormValues,
  type UpdateEventStatusFormValues,
  postManagementOperation,
} from "./management-client";

type OperationViewState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

const FIELD_CLASS = "rounded-md border border-zinc-300 px-3 py-2 text-sm";

const INITIAL_ACTOR: ManagementActorValues = {
  actorId: "",
  role: "organizer",
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

const discountInputLabel = (discountType: CouponDiscountType): string =>
  discountType === "fixed" ? "Discount in cents" : "Discount percentage";

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

export function AdminManagementForm() {
  const [actor, setActor] = useState<ManagementActorValues>(INITIAL_ACTOR);

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

  const onPublishSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPublishState({ kind: "submitting" });

    const result = await postManagementOperation({
      endpoint: "/api/events/publish",
      actor,
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
      payload: buildUpdateCouponPayload(updateCouponValues),
    });

    setUpdateCouponState(
      result.ok
        ? { kind: "success", message: result.message }
        : { kind: "error", message: result.message },
    );
  };

  return (
    <section className="w-full max-w-5xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-zinc-900">Organizer/Admin Management</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Minimal operational UI for event publication, status updates, and coupon governance. All
        ownership, RBAC, and business rules remain server-side.
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
        <form className="rounded-lg border border-zinc-200 p-4" onSubmit={onPublishSubmit}>
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
          <button
            className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={publishState.kind === "submitting"}
          >
            {publishState.kind === "submitting" ? "Publishing..." : "Publish event"}
          </button>
          {renderOperationFeedback(publishState)}
        </form>

        <form className="rounded-lg border border-zinc-200 p-4" onSubmit={onUpdateEventSubmit}>
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
          <button
            className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={updateEventState.kind === "submitting"}
          >
            {updateEventState.kind === "submitting" ? "Updating..." : "Update event status"}
          </button>
          {renderOperationFeedback(updateEventState)}
        </form>

        <form className="rounded-lg border border-zinc-200 p-4" onSubmit={onCreateCouponSubmit}>
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

          <button
            className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={createCouponState.kind === "submitting"}
          >
            {createCouponState.kind === "submitting" ? "Creating..." : "Create coupon"}
          </button>
          {renderOperationFeedback(createCouponState)}
        </form>

        <form className="rounded-lg border border-zinc-200 p-4" onSubmit={onUpdateCouponSubmit}>
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

          <button
            className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={updateCouponState.kind === "submitting"}
          >
            {updateCouponState.kind === "submitting" ? "Updating..." : "Update coupon"}
          </button>
          {renderOperationFeedback(updateCouponState)}
        </form>
      </div>
    </section>
  );
}
