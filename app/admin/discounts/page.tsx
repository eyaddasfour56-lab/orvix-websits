"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type DiscountType =
  | "free_delivery"
  | "percentage"
  | "fixed_amount";

type DiscountCode = {
  id: number;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  minimum_order_value: number;
  maximum_discount: number | null;
  usage_limit: number | null;
  times_used: number;
  active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type DiscountForm = {
  code: string;
  discountType: DiscountType;
  discountValue: string;
  minimumOrderValue: string;
  maximumDiscount: string;
  usageLimit: string;
  startsAt: string;
  expiresAt: string;
  active: boolean;
};

const emptyForm: DiscountForm = {
  code: "",
  discountType: "free_delivery",
  discountValue: "100",
  minimumOrderValue: "0",
  maximumDiscount: "",
  usageLimit: "",
  startsAt: "",
  expiresAt: "",
  active: true,
};

function toInputDateTime(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(
    date.getTime() - offset * 60 * 1000
  );

  return localDate.toISOString().slice(0, 16);
}

function toISOStringOrNull(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function formatDate(value: string | null) {
  if (!value) {
    return "No limit";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString("en-GB");
}

function getDiscountTitle(discount: DiscountCode) {
  if (discount.discount_type === "free_delivery") {
    return "Free Delivery";
  }

  if (discount.discount_type === "percentage") {
    return `${Number(
      discount.discount_value
    ).toLocaleString("en-GB")}% Off`;
  }

  return `${Number(
    discount.discount_value
  ).toLocaleString("en-GB")} EGP Off`;
}

function getDiscountStatus(discount: DiscountCode) {
  const now = Date.now();

  if (!discount.active) {
    return {
      label: "Inactive",
      className:
        "border-gray-500/30 bg-gray-500/10 text-gray-300",
    };
  }

  if (
    discount.starts_at &&
    new Date(discount.starts_at).getTime() > now
  ) {
    return {
      label: "Scheduled",
      className:
        "border-blue-500/30 bg-blue-500/10 text-blue-300",
    };
  }

  if (
    discount.expires_at &&
    new Date(discount.expires_at).getTime() < now
  ) {
    return {
      label: "Expired",
      className:
        "border-red-500/30 bg-red-500/10 text-red-300",
    };
  }

  if (
    discount.usage_limit !== null &&
    discount.times_used >= discount.usage_limit
  ) {
    return {
      label: "Limit reached",
      className:
        "border-orange-500/30 bg-orange-500/10 text-orange-300",
    };
  }

  return {
    label: "Active",
    className:
      "border-green-500/30 bg-green-500/10 text-green-300",
  };
}

export default function DiscountsPage() {
  const router = useRouter();

  const [discounts, setDiscounts] = useState<
    DiscountCode[]
  >([]);
  const [form, setForm] =
    useState<DiscountForm>(emptyForm);

  const [editingId, setEditingId] = useState<
    number | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<
    number | null
  >(null);

  const [togglingId, setTogglingId] = useState<
    number | null
  >(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadDiscounts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const authResponse = await fetch(
        "/api/admin/orders",
        {
          cache: "no-store",
        }
      );

      if (authResponse.status === 401) {
        router.replace("/admin");
        return;
      }

      const response = await fetch(
        "/api/admin/discounts",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Could not load discount codes."
        );
      }

      setDiscounts(result.discounts || []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load discount codes."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDiscounts();
  }, [loadDiscounts]);

  const statistics = useMemo(() => {
    const now = Date.now();

    const active = discounts.filter((discount) => {
      const startsAt = discount.starts_at
        ? new Date(discount.starts_at).getTime()
        : null;

      const expiresAt = discount.expires_at
        ? new Date(discount.expires_at).getTime()
        : null;

      const limitReached =
        discount.usage_limit !== null &&
        discount.times_used >=
          discount.usage_limit;

      return (
        discount.active &&
        !limitReached &&
        (!startsAt || startsAt <= now) &&
        (!expiresAt || expiresAt >= now)
      );
    }).length;

    const totalUses = discounts.reduce(
      (sum, discount) =>
        sum + Number(discount.times_used || 0),
      0
    );

    return {
      total: discounts.length,
      active,
      inactive: discounts.length - active,
      totalUses,
    };
  }, [discounts]);

  function updateForm<K extends keyof DiscountForm>(
    key: K,
    value: DiscountForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setMessage("");
  }

  function startEditing(discount: DiscountCode) {
    setEditingId(discount.id);

    setForm({
      code: discount.code,
      discountType: discount.discount_type,
      discountValue: String(
        discount.discount_value
      ),
      minimumOrderValue: String(
        discount.minimum_order_value || 0
      ),
      maximumDiscount:
        discount.maximum_discount === null
          ? ""
          : String(discount.maximum_discount),
      usageLimit:
        discount.usage_limit === null
          ? ""
          : String(discount.usage_limit),
      startsAt: toInputDateTime(
        discount.starts_at
      ),
      expiresAt: toInputDateTime(
        discount.expires_at
      ),
      active: discount.active,
    });

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const code = form.code
        .trim()
        .toUpperCase();

      if (!code) {
        throw new Error(
          "Please enter a discount code."
        );
      }

      const discountValue =
        form.discountType === "free_delivery"
          ? 100
          : Number(form.discountValue);

      if (
        !Number.isFinite(discountValue) ||
        discountValue < 0
      ) {
        throw new Error(
          "Please enter a valid discount value."
        );
      }

      if (
        form.discountType === "percentage" &&
        discountValue > 100
      ) {
        throw new Error(
          "Percentage discount cannot exceed 100%."
        );
      }

      const minimumOrderValue = Number(
        form.minimumOrderValue || 0
      );

      if (
        !Number.isFinite(minimumOrderValue) ||
        minimumOrderValue < 0
      ) {
        throw new Error(
          "Minimum order value cannot be negative."
        );
      }

      const maximumDiscount = form.maximumDiscount
        ? Number(form.maximumDiscount)
        : null;

      if (
        maximumDiscount !== null &&
        (!Number.isFinite(maximumDiscount) ||
          maximumDiscount < 0)
      ) {
        throw new Error(
          "Maximum discount cannot be negative."
        );
      }

      const usageLimit = form.usageLimit
        ? Number(form.usageLimit)
        : null;

      if (
        usageLimit !== null &&
        (!Number.isInteger(usageLimit) ||
          usageLimit < 1)
      ) {
        throw new Error(
          "Usage limit must be a whole number of at least 1."
        );
      }

      if (
        form.startsAt &&
        form.expiresAt &&
        new Date(form.expiresAt).getTime() <=
          new Date(form.startsAt).getTime()
      ) {
        throw new Error(
          "Expiry date must be after the start date."
        );
      }

      const payload = {
        code,
        discountType: form.discountType,
        discountValue,
        minimumOrderValue,
        maximumDiscount,
        usageLimit,
        startsAt: toISOStringOrNull(
          form.startsAt
        ),
        expiresAt: toISOStringOrNull(
          form.expiresAt
        ),
        active: form.active,
      };

      const url =
        editingId === null
          ? "/api/admin/discounts"
          : `/api/admin/discounts/${editingId}`;

      const response = await fetch(url, {
        method:
          editingId === null ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Could not save discount code."
        );
      }

      setMessage(
        editingId === null
          ? "Discount code created successfully."
          : "Discount code updated successfully."
      );

      setForm(emptyForm);
      setEditingId(null);

      await loadDiscounts();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save discount code."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleDiscount(
    discount: DiscountCode
  ) {
    setTogglingId(discount.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/discounts/${discount.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: discount.code,
            discountType:
              discount.discount_type,
            discountValue:
              discount.discount_value,
            minimumOrderValue:
              discount.minimum_order_value,
            maximumDiscount:
              discount.maximum_discount,
            usageLimit: discount.usage_limit,
            startsAt: discount.starts_at,
            expiresAt: discount.expires_at,
            active: !discount.active,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Could not change discount status."
        );
      }

      setDiscounts((current) =>
        current.map((item) =>
          item.id === discount.id
            ? {
                ...item,
                active: !discount.active,
              }
            : item
        )
      );

      setMessage(
        discount.active
          ? "Discount code disabled."
          : "Discount code activated."
      );
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Could not change discount status."
      );
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteDiscount(
    discount: DiscountCode
  ) {
    const confirmed = window.confirm(
      `Delete the discount code "${discount.code}" permanently?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(discount.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/discounts/${discount.id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Could not delete discount code."
        );
      }

      setDiscounts((current) =>
        current.filter(
          (item) => item.id !== discount.id
        )
      );

      if (editingId === discount.id) {
        resetForm();
      }

      setMessage(
        "Discount code deleted successfully."
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete discount code."
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black px-5 py-16 text-white">
        <p className="text-center text-gray-400">
          Loading discount codes...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
              ORVIX Admin
            </p>

            <h1 className="mt-3 text-4xl font-black sm:text-5xl">
              Discount Codes
            </h1>

            <p className="mt-3 max-w-2xl text-gray-400">
              Create, schedule, limit, edit and
              disable discount codes.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-5 py-3 font-bold transition hover:bg-white/10"
            >
              Back to Dashboard
            </Link>

            <button
              type="button"
              onClick={loadDiscounts}
              className="rounded-2xl bg-white px-5 py-3 font-bold text-black transition hover:bg-gray-200"
            >
              Refresh
            </button>
          </div>
        </header>

        {message && (
          <div className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-green-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Total codes
            </p>

            <p className="mt-3 text-4xl font-black">
              {statistics.total}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Active codes
            </p>

            <p className="mt-3 text-4xl font-black">
              {statistics.active}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Inactive or expired
            </p>

            <p className="mt-3 text-4xl font-black">
              {statistics.inactive}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Total uses
            </p>

            <p className="mt-3 text-4xl font-black">
              {statistics.totalUses}
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-gray-500">
                {editingId === null
                  ? "New discount"
                  : "Editing discount"}
              </p>

              <h2 className="mt-2 text-3xl font-black">
                {editingId === null
                  ? "Create Discount Code"
                  : "Update Discount Code"}
              </h2>
            </div>

            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-white/15 px-5 py-3 font-bold"
              >
                Cancel Editing
              </button>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-7 grid gap-5 lg:grid-cols-2"
          >
            <label className="block">
              <span className="text-sm font-semibold text-gray-300">
                Discount code
              </span>

              <input
                type="text"
                value={form.code}
                onChange={(event) =>
                  updateForm(
                    "code",
                    event.target.value.toUpperCase()
                  )
                }
                placeholder="EXAMPLE20"
                className="mt-2 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 uppercase outline-none focus:border-white"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-gray-300">
                Discount type
              </span>

              <select
                value={form.discountType}
                onChange={(event) => {
                  const nextType =
                    event.target
                      .value as DiscountType;

                  setForm((current) => ({
                    ...current,
                    discountType: nextType,
                    discountValue:
                      nextType === "free_delivery"
                        ? "100"
                        : current.discountType ===
                            "free_delivery"
                          ? ""
                          : current.discountValue,
                    maximumDiscount:
                      nextType === "percentage"
                        ? current.maximumDiscount
                        : "",
                  }));
                }}
                className="mt-2 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 outline-none focus:border-white"
              >
                <option value="free_delivery">
                  Free Delivery
                </option>

                <option value="percentage">
                  Percentage Discount
                </option>

                <option value="fixed_amount">
                  Fixed Amount
                </option>
              </select>
            </label>

            {form.discountType !==
              "free_delivery" && (
              <label className="block">
                <span className="text-sm font-semibold text-gray-300">
                  {form.discountType ===
                  "percentage"
                    ? "Discount percentage"
                    : "Discount amount in EGP"}
                </span>

                <input
                  type="number"
                  min="0"
                  max={
                    form.discountType ===
                    "percentage"
                      ? "100"
                      : undefined
                  }
                  step="0.01"
                  value={form.discountValue}
                  onChange={(event) =>
                    updateForm(
                      "discountValue",
                      event.target.value
                    )
                  }
                  placeholder={
                    form.discountType ===
                    "percentage"
                      ? "15"
                      : "300"
                  }
                  className="mt-2 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 outline-none focus:border-white"
                  required
                />
              </label>
            )}

            <label className="block">
              <span className="text-sm font-semibold text-gray-300">
                Minimum order value
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.minimumOrderValue}
                onChange={(event) =>
                  updateForm(
                    "minimumOrderValue",
                    event.target.value
                  )
                }
                placeholder="0"
                className="mt-2 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 outline-none focus:border-white"
              />
            </label>

            {form.discountType ===
              "percentage" && (
              <label className="block">
                <span className="text-sm font-semibold text-gray-300">
                  Maximum discount
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.maximumDiscount}
                  onChange={(event) =>
                    updateForm(
                      "maximumDiscount",
                      event.target.value
                    )
                  }
                  placeholder="Leave empty for no maximum"
                  className="mt-2 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 outline-none focus:border-white"
                />
              </label>
            )}

            <label className="block">
              <span className="text-sm font-semibold text-gray-300">
                Usage limit
              </span>

              <input
                type="number"
                min="1"
                step="1"
                value={form.usageLimit}
                onChange={(event) =>
                  updateForm(
                    "usageLimit",
                    event.target.value
                  )
                }
                placeholder="Leave empty for unlimited"
                className="mt-2 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 outline-none focus:border-white"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-gray-300">
                Start date and time
              </span>

              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) =>
                  updateForm(
                    "startsAt",
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 outline-none focus:border-white"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-gray-300">
                Expiry date and time
              </span>

              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(event) =>
                  updateForm(
                    "expiresAt",
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 outline-none focus:border-white"
              />
            </label>

            <label className="flex items-center justify-between rounded-2xl border border-white/15 bg-black p-4 lg:col-span-2">
              <span>
                <span className="block font-bold">
                  Active
                </span>

                <span className="mt-1 block text-sm text-gray-400">
                  Customers can use this code when it
                  is active and within its limits.
                </span>
              </span>

              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  updateForm(
                    "active",
                    event.target.checked
                  )
                }
                className="h-6 w-6"
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-white px-6 py-4 font-black text-black disabled:cursor-not-allowed disabled:opacity-50 lg:col-span-2"
            >
              {saving
                ? "Saving..."
                : editingId === null
                  ? "Create Discount Code"
                  : "Save Changes"}
            </button>
          </form>
        </section>

        <section className="mt-8 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">
              Existing Codes
            </h2>

            <p className="text-sm text-gray-500">
              {discounts.length} codes
            </p>
          </div>

          {discounts.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-gray-400">
              No discount codes have been created
              yet.
            </div>
          ) : (
            discounts.map((discount) => {
              const status =
                getDiscountStatus(discount);

              const remaining =
                discount.usage_limit === null
                  ? null
                  : Math.max(
                      discount.usage_limit -
                        discount.times_used,
                      0
                    );

              return (
                <article
                  key={discount.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-3xl font-black">
                          {discount.code}
                        </h3>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </div>

                      <p className="mt-2 text-xl font-bold text-gray-300">
                        {getDiscountTitle(discount)}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() =>
                          startEditing(discount)
                        }
                        className="rounded-2xl bg-white px-5 py-3 font-bold text-black"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={
                          togglingId === discount.id
                        }
                        onClick={() =>
                          toggleDiscount(discount)
                        }
                        className="rounded-2xl border border-white/15 px-5 py-3 font-bold disabled:opacity-50"
                      >
                        {togglingId === discount.id
                          ? "Saving..."
                          : discount.active
                            ? "Disable"
                            : "Activate"}
                      </button>

                      <button
                        type="button"
                        disabled={
                          deletingId === discount.id
                        }
                        onClick={() =>
                          deleteDiscount(discount)
                        }
                        className="rounded-2xl bg-red-600 px-5 py-3 font-bold disabled:opacity-50"
                      >
                        {deletingId === discount.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl bg-black/40 p-4">
                      <p className="text-sm text-gray-500">
                        Uses
                      </p>

                      <p className="mt-2 text-xl font-bold">
                        {discount.times_used}
                        {discount.usage_limit !== null
                          ? ` / ${discount.usage_limit}`
                          : " / Unlimited"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-black/40 p-4">
                      <p className="text-sm text-gray-500">
                        Remaining
                      </p>

                      <p className="mt-2 text-xl font-bold">
                        {remaining === null
                          ? "Unlimited"
                          : remaining}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-black/40 p-4">
                      <p className="text-sm text-gray-500">
                        Minimum order
                      </p>

                      <p className="mt-2 text-xl font-bold">
                        {Number(
                          discount.minimum_order_value ||
                            0
                        ).toLocaleString("en-GB")}{" "}
                        EGP
                      </p>
                    </div>

                    <div className="rounded-2xl bg-black/40 p-4">
                      <p className="text-sm text-gray-500">
                        Maximum discount
                      </p>

                      <p className="mt-2 text-xl font-bold">
                        {discount.maximum_discount ===
                        null
                          ? "No maximum"
                          : `${Number(
                              discount.maximum_discount
                            ).toLocaleString(
                              "en-GB"
                            )} EGP`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 p-4">
                      <p className="text-gray-500">
                        Starts
                      </p>

                      <p className="mt-2 font-semibold">
                        {formatDate(
                          discount.starts_at
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 p-4">
                      <p className="text-gray-500">
                        Expires
                      </p>

                      <p className="mt-2 font-semibold">
                        {formatDate(
                          discount.expires_at
                        )}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}