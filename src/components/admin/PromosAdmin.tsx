"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/lib/convex-api";
import { PageHeader } from "@/components/admin/PageHeader";
import { Field, TextArea } from "@/components/admin/shared/Fields";
import { DateTimePicker } from "@/components/admin/shared/DateTimePicker";
import { Empty, Skeleton } from "@/components/admin/ProjectsAdmin";
import { SlideToConfirm } from "@/components/ui/SlideToConfirm";
import type { Doc, Id } from "@convex/_generated/dataModel";

/**
 * Promotions.
 *
 * Created paused, always. A site-wide discount going live because a form was
 * submitted is exactly the accident this prevents — activating is a separate,
 * deliberate gesture.
 */

const TIERS = ["launch", "growth", "app", "care"];

export function PromosAdmin() {
  const promos = useQuery(api.promos.listAll, {});
  const create = useMutation(api.promos.create);
  const update = useMutation(api.promos.update);
  const archive = useMutation(api.promos.archive);

  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<Id<"promos"> | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promotions"
        description="Status is derived on every read, so a promo stops when it should."
        action={
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-canvas transition-opacity duration-fast hover:opacity-90"
          >
            New promotion
          </button>
        }
      />

      {promos === undefined ? (
        <Skeleton />
      ) : promos.length === 0 ? (
        <Empty
          title="No promotions"
          body="Create one to run a site-wide discount or issue a code."
        />
      ) : (
        <ul className="space-y-2">
          {promos.map((promo) => (
            <li key={promo._id} className="admin-card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* The derived label leads. See displayName(). */}
                    <span className="text-sm text-primary">
                      {displayName(promo)}
                    </span>
                    <StatusBadge status={promo.status} />
                    {promo.code ? (
                      <code className="font-mono text-xs text-secondary">
                        {promo.code}
                      </code>
                    ) : (
                      <span className="badge">automatic</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-secondary">
                    {/* "0 / 1 redeemed" as one value. The count and the limit
                        used to be assembled from three separate expressions
                        and a bare "Redemptions" label sat elsewhere with no
                        figure beside it at all. */}
                    {promo.redemptionCount}
                    {promo.maxRedemptions ? ` / ${promo.maxRedemptions}` : ""}
                    {" redeemed"}
                    {promo.endsAt
                      ? ` · ends ${new Date(promo.endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                      : ""}
                  </p>
                  {/* The typed name, demoted to what it actually is: a note to
                      myself about why this promo exists. */}
                  {internalNote(promo) ? (
                    <p
                      className="admin-meta mt-1 truncate"
                      title={promo.name}
                    >
                      {internalNote(promo)}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded(expanded === promo._id ? null : promo._id)
                    }
                    className="text-xs text-secondary transition-colors duration-fast hover:text-primary"
                  >
                    {expanded === promo._id ? "Hide" : "Redemptions"}
                  </button>
                  {promo.paused ? (
                    <div className="w-48">
                      <SlideToConfirm
                        purpose="activate-promo"
                        ariaLabel={`Slide to activate ${promo.name}`}
                        onConfirm={async () => {
                          await update({ id: promo._id, paused: false });
                        }}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        void update({ id: promo._id, paused: true })
                      }
                      className="hairline rounded-full px-3 py-1 text-xs text-primary"
                    >
                      Pause
                    </button>
                  )}
                </div>
              </div>

              {expanded === promo._id ? (
                <Redemptions promoId={promo._id} />
              ) : null}

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => void archive({ id: promo._id })}
                  className="text-xs text-secondary transition-colors duration-fast hover:text-[color:var(--text-notice)]"
                >
                  {promo.redemptionCount > 0
                    ? "Archive (redemption history is kept)"
                    : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {creating ? (
        <CreateDialog
          onClose={() => setCreating(false)}
          onCreate={async (draft) => {
            await create(draft);
            setCreating(false);
          }}
        />
      ) : null}
    </div>
  );
}

function describe(promo: Doc<"promos">): string {
  if (promo.discountType === "percentage") return `${promo.discountValue}% off`;
  if (promo.discountType === "fixed") return `$${promo.discountValue} off`;
  return `set to $${promo.discountValue}`;
}

/**
 * What to call a promo on screen.
 *
 * DERIVED from the discount, never from the free-text name. The two used to
 * be shown together and drifted apart the moment either changed: a promo
 * typed as "20% off 10 days" sat directly above a computed "14% off". Both
 * lines were on screen, one of them was wrong, and nothing in the UI said
 * which. The discount field is the one the checkout actually charges, so it
 * is the one that gets to name the promo.
 *
 * The typed name survives as an internal note beside it — it is often a
 * reminder of WHY a promo exists ("Black Friday", "for Sarah"), which the
 * derived label cannot express and which is worth keeping.
 */
function displayName(promo: Doc<"promos">): string {
  /*
   * Referral promos are auto-generated and their stored name is
   * "Referral {ref}:{visitor}" — two opaque ids concatenated, which rendered
   * in the list as "Referral ncs785vycdaq:d6yv9k2tv2ru". The name is load
   * bearing (it is the idempotency key, looked up via the by_name index) so
   * it cannot change server-side without breaking claim dedupe; it is
   * relabelled here instead.
   */
  if (promo.name.startsWith("Referral ")) {
    return `Referral — ${describe(promo)}`;
  }
  return describe(promo);
}

/** The typed name, shown only when it adds something the label does not. */
function internalNote(promo: Doc<"promos">): string | null {
  if (promo.name.startsWith("Referral ")) return null;
  return promo.name.trim() || null;
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "badge-hot"
      : status === "scheduled"
        ? "badge-warm"
        : "badge-cold";
  return <span className={`badge ${tone}`}>{status}</span>;
}

function Redemptions({ promoId }: { promoId: Id<"promos"> }) {
  const rows = useQuery(api.promos.redemptions, { promoId });

  if (rows === undefined) {
    return <p className="mt-4 text-xs text-secondary">Loading…</p>;
  }
  if (rows.length === 0) {
    return <p className="mt-4 text-xs text-secondary">Not used yet.</p>;
  }

  const cost = rows.reduce(
    (sum, r) => sum + (r.originalPrice - r.discountedPrice),
    0,
  );

  return (
    <div className="mt-4">
      <p className="text-xs text-secondary">
        {rows.length} redeemed · ${cost.toLocaleString()} given away
      </p>
      <ul className="mt-2 space-y-1">
        {rows.map((r) => (
          <li
            key={r._id}
            className="flex justify-between gap-3 text-xs text-secondary"
          >
            <span className="truncate">{r.email}</span>
            <span className="shrink-0 tabular-nums">
              ${r.originalPrice} → ${r.discountedPrice}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const EMPTY = {
  name: "",
  kind: "code" as "code" | "automatic",
  code: "",
  discountType: "percentage" as "percentage" | "fixed" | "override",
  discountValue: 10,
  appliesTo: [] as string[],
  startsAt: "",
  endsAt: "",
  maxRedemptions: "",
  bannerText: "",
  showCountdown: false,
};

function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CreateDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (d: {
    name: string;
    kind: "code" | "automatic";
    code?: string;
    discountType: "percentage" | "fixed" | "override";
    discountValue: number;
    appliesTo: string[];
    startsAt: number;
    endsAt?: number;
    maxRedemptions?: number;
    bannerText?: string;
    showCountdown: boolean;
  }) => Promise<void>;
}) {
  // Lazy initialiser: the clock is read once, when the dialog opens, rather
  // than on every render — render has to stay pure.
  const [draft, setDraft] = useState(() => ({
    ...EMPTY,
    startsAt: toLocalInput(Date.now()),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const valid =
    draft.name.trim() !== "" &&
    (draft.kind === "automatic" || draft.code.trim() !== "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cancel"
        onClick={onClose}
        className="absolute inset-0 bg-[color:var(--bg-canvas)]/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New promotion"
        className="glass-depth glass-near glass-panel relative max-h-[85dvh] w-full max-w-md overflow-y-auto p-6"
      >
        <h2 className="text-lg text-primary">New promotion</h2>
        <p className="mt-1 text-xs text-secondary">
          Created paused. Activating is a separate, deliberate step.
        </p>

        <div className="mt-5 space-y-4">
          <Field
            label="Internal name"
            value={draft.name}
            onChange={(v) => set("name", v)}
            help="Only you see this."
          />

          <div>
            <span className="text-sm text-secondary">Type</span>
            <div className="mt-2 flex gap-2">
              {(["code", "automatic"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set("kind", k)}
                  aria-pressed={draft.kind === k}
                  className={`hairline rounded-full px-3.5 py-1.5 text-xs ${
                    draft.kind === k
                      ? "bg-surface-2 text-primary"
                      : "text-secondary"
                  }`}
                >
                  {k === "code" ? "Needs a code" : "Applies to everyone"}
                </button>
              ))}
            </div>
          </div>

          {draft.kind === "code" ? (
            <Field
              label="Code"
              value={draft.code}
              onChange={(v) => set("code", v.toUpperCase())}
              help="Matched case-insensitively; stored uppercase."
            />
          ) : (
            <>
              <TextArea
                label="Banner text"
                rows={2}
                value={draft.bannerText}
                onChange={(v) => set("bannerText", v)}
                help="Shown site-wide above the nav."
              />
              <label className="flex items-center gap-2.5 text-sm text-secondary">
                <input
                  type="checkbox"
                  checked={draft.showCountdown}
                  onChange={(e) => set("showCountdown", e.target.checked)}
                  className="size-4 rounded"
                />
                Show a countdown
              </label>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="promo-type" className="text-sm text-secondary">
                Discount
              </label>
              <select
                id="promo-type"
                value={draft.discountType}
                onChange={(e) =>
                  set(
                    "discountType",
                    e.target.value as typeof draft.discountType,
                  )
                }
                className="hairline mt-2 w-full rounded-lg bg-surface-1 px-3.5 py-2.5 text-sm text-primary"
              >
                <option value="percentage">Percentage off</option>
                <option value="fixed">Fixed amount off</option>
                <option value="override">Set price to</option>
              </select>
            </div>
            <Field
              label="Value"
              type="number"
              value={String(draft.discountValue)}
              onChange={(v) => set("discountValue", Number(v) || 0)}
            />
          </div>

          <div>
            <span className="text-sm text-secondary">Applies to</span>
            <p className="mt-1 text-xs text-secondary">
              None selected means every tier except enterprise, which is
              negotiated in the proposal.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TIERS.map((tier) => {
                const on = draft.appliesTo.includes(tier);
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() =>
                      set(
                        "appliesTo",
                        on
                          ? draft.appliesTo.filter((t) => t !== tier)
                          : [...draft.appliesTo, tier],
                      )
                    }
                    aria-pressed={on}
                    className={`hairline rounded-full px-3 py-1 text-xs ${
                      on ? "bg-surface-2 text-primary" : "text-secondary"
                    }`}
                  >
                    {tier}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DateTimePicker
              id="promo-start"
              label="Starts"
              value={draft.startsAt}
              onChange={(v) => set("startsAt", v)}
            />
            <DateTimePicker
              id="promo-end"
              label="Ends (optional)"
              value={draft.endsAt}
              onChange={(v) => set("endsAt", v)}
              help="Leave unset for open-ended."
            />
          </div>

          <Field
            label="Maximum redemptions (optional)"
            type="number"
            value={draft.maxRedemptions}
            onChange={(v) => set("maxRedemptions", v)}
            help="Leave blank for unlimited."
          />
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-secondary hover:text-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid || saving}
            onClick={async () => {
              setSaving(true);
              setError(null);
              try {
                await onCreate({
                  name: draft.name.trim(),
                  kind: draft.kind,
                  code: draft.kind === "code" ? draft.code.trim() : undefined,
                  discountType: draft.discountType,
                  discountValue: draft.discountValue,
                  appliesTo: draft.appliesTo,
                  startsAt: new Date(draft.startsAt).getTime(),
                  endsAt: draft.endsAt
                    ? new Date(draft.endsAt).getTime()
                    : undefined,
                  maxRedemptions: draft.maxRedemptions
                    ? Number(draft.maxRedemptions)
                    : undefined,
                  bannerText: draft.bannerText.trim() || undefined,
                  showCountdown: draft.showCountdown,
                });
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Could not create that.",
                );
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas disabled:opacity-40"
          >
            {saving ? "Creating…" : "Create paused"}
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-xs text-[color:var(--text-notice)]">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
