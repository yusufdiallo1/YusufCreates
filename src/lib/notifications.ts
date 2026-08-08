import "server-only";
import type { ReactElement } from "react";
import { IntakeNudge } from "@emails/IntakeNudge";
import { SiteIncident } from "@emails/SiteIncident";
import { ExpiryWarning } from "@emails/ExpiryWarning";
import { LighthouseDrop } from "@emails/LighthouseDrop";
import { MonthlyReport } from "@emails/MonthlyReport";
import { ADMIN_PATH } from "@/lib/constants";
import type { PushPayload } from "@/lib/push";

/**
 * Turns an outbox row into a message.
 *
 * The one place that knows how a notification `kind` becomes a subject line, a
 * template and a recipient. Convex enqueues a kind and a payload and knows
 * nothing about React Email; this knows nothing about why the row exists.
 *
 * The payload is `unknown` because it crossed a database and a network to get
 * here — it is whatever was written at enqueue time, which may be an older
 * shape after a deploy. So every handler reads defensively and a bad payload
 * throws, which the dispatcher catches and records as a failed attempt rather
 * than taking the rest of the batch down with it.
 *
 * Push is attached ONLY to admin-bound alerts. A client wants a considered
 * email explaining what is happening; they do not want their phone buzzing
 * about a blip that resolved before they read it.
 */

export type RenderedNotification = {
  to: string | null;
  subject: string;
  react: ReactElement;
  template: string;
  replyTo?: string;
  /** Present only for alerts addressed to me. */
  push?: PushPayload;
};

type Context = {
  siteUrl: string;
  adminEmail: string | null;
};

/** Narrow an unknown payload to an object without lying about its contents. */
function asRecord(payload: unknown): Record<string, unknown> {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Notification payload is not an object.");
  }
  return payload as Record<string, unknown>;
}

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;
const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** Host without scheme or trailing slash, for subject lines. */
function host(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function renderNotification(
  kind: string,
  payload: unknown,
  ctx: Context,
): RenderedNotification | null {
  const p = asRecord(payload);

  switch (kind) {
    /* ------------------------------------------------------------ intake --- */

    case "intake_nudge": {
      const outstanding = strList(p.outstanding);

      /*
       * An empty list means the intake was completed between the sweep
       * deciding to nudge and this running. Sending "I still need: nothing"
       * is worse than sending nothing, so the row is dropped.
       */
      if (outstanding.length === 0) return null;

      const day = num(p.day) ?? 3;
      return {
        to: str(p.to) || null,
        subject:
          day >= 7
            ? `Still waiting on a few things for ${str(p.projectName, "your project")}`
            : `A few things outstanding on ${str(p.projectName, "your project")}`,
        template: `IntakeNudge-day${day}`,
        replyTo: ctx.adminEmail ?? undefined,
        react: IntakeNudge({
          name: str(p.name),
          projectName: str(p.projectName, "your project"),
          outstanding,
          intakeUrl: str(p.intakeUrl),
          day,
        }),
      };
    }

    /* --------------------------------------------------------- incidents --- */

    case "incident_open_admin": {
      const url = str(p.siteUrl);
      return {
        to: ctx.adminEmail,
        subject: `DOWN — ${host(url)}`,
        template: "SiteIncident-admin-open",
        react: SiteIncident({
          audience: "admin",
          siteUrl: url,
          openedAt: num(p.openedAt) ?? Date.now(),
          cause: str(p.cause, "No response"),
        }),
        push: {
          title: `${host(url)} is down`,
          body: str(p.cause, "No response from the server."),
          url: `${ADMIN_PATH}/monitoring`,
          // Keyed by site so a flapping check replaces its own alert rather
          // than filling the lock screen with identical copies.
          tag: `site-${host(url)}`,
        },
      };
    }

    case "incident_closed_admin": {
      const url = str(p.siteUrl);
      const mins = num(p.durationMinutes);
      return {
        to: ctx.adminEmail,
        subject: `Back up — ${host(url)}`,
        template: "SiteIncident-admin-closed",
        react: SiteIncident({
          audience: "admin",
          siteUrl: url,
          openedAt: num(p.openedAt) ?? Date.now(),
          cause: str(p.cause, "No response"),
          closed: true,
          durationMinutes: mins,
        }),
        push: {
          title: `${host(url)} is back`,
          body: mins !== undefined ? `Down for ${mins} minutes.` : "Recovered.",
          url: `${ADMIN_PATH}/monitoring`,
          tag: `site-${host(url)}`,
        },
      };
    }

    case "incident_open_client": {
      const url = str(p.siteUrl);
      return {
        to: str(p.to) || null,
        subject: `${host(url)} is down — I'm on it`,
        template: "SiteIncident-client-open",
        replyTo: ctx.adminEmail ?? undefined,
        react: SiteIncident({
          audience: "client",
          name: str(p.name),
          siteUrl: url,
          openedAt: num(p.openedAt) ?? Date.now(),
          cause: str(p.cause, "No response"),
        }),
      };
    }

    case "incident_closed_client": {
      const url = str(p.siteUrl);
      return {
        to: str(p.to) || null,
        subject: `${host(url)} is back online`,
        template: "SiteIncident-client-closed",
        replyTo: ctx.adminEmail ?? undefined,
        react: SiteIncident({
          audience: "client",
          name: str(p.name),
          siteUrl: url,
          openedAt: num(p.openedAt) ?? Date.now(),
          cause: str(p.cause, "No response"),
          closed: true,
          durationMinutes: num(p.durationMinutes),
          resolutionNote: str(p.resolutionNote) || undefined,
        }),
      };
    }

    /* ------------------------------------------------------------ expiry --- */

    case "expiry_admin":
    case "expiry_client": {
      const audience = kind === "expiry_admin" ? "admin" : "client";
      const url = str(p.siteUrl);
      const which = p.kind === "domain" ? "domain" : "ssl";
      const daysLeft = num(p.daysLeft) ?? 0;
      const thing = which === "domain" ? "Domain" : "SSL certificate";

      return {
        to: audience === "admin" ? ctx.adminEmail : str(p.to) || null,
        subject: `${thing} expires in ${daysLeft} days — ${host(url)}`,
        template: `ExpiryWarning-${audience}-${which}`,
        replyTo: audience === "client" ? (ctx.adminEmail ?? undefined) : undefined,
        react: ExpiryWarning({
          audience,
          name: str(p.name),
          kind: which,
          siteUrl: url,
          expiresAt: num(p.expiresAt) ?? Date.now(),
          daysLeft,
          registrarHint: str(p.registrarHint) || undefined,
        }),
        push:
          audience === "admin"
            ? {
                title: `${thing} expiring — ${host(url)}`,
                body: `${daysLeft} days left.`,
                url: `${ADMIN_PATH}/monitoring`,
                tag: `expiry-${host(url)}-${which}`,
              }
            : undefined,
      };
    }

    /* -------------------------------------------------------- lighthouse --- */

    case "lighthouse_drop": {
      const url = str(p.siteUrl);
      const previous = num(p.previous) ?? 0;
      const current = num(p.current) ?? 0;
      return {
        to: ctx.adminEmail,
        subject: `Performance down ${previous - current} — ${host(url)}`,
        template: "LighthouseDrop",
        react: LighthouseDrop({
          siteUrl: url,
          previous,
          current,
          lcp: num(p.lcp),
          cls: num(p.cls),
        }),
        push: {
          title: `${host(url)} got slower`,
          body: `Performance ${previous} → ${current}.`,
          url: `${ADMIN_PATH}/monitoring`,
          tag: `lh-${host(url)}`,
        },
      };
    }

    /* ------------------------------------------------------ monthly report --- */

    case "monthly_report": {
      const url = str(p.siteUrl);
      const month = str(p.month, "Last month");
      return {
        to: str(p.to) || null,
        subject: `${host(url)} — your ${month} report`,
        template: "MonthlyReport",
        replyTo: ctx.adminEmail ?? undefined,
        react: MonthlyReport({
          name: str(p.name),
          month,
          siteUrl: url,
          uptimePercent: num(p.uptimePercent) ?? 100,
          incidents: Array.isArray(p.incidents)
            ? (p.incidents as unknown[]).map((raw) => {
                const i = asRecord(raw);
                return {
                  openedAt: num(i.openedAt) ?? 0,
                  durationMinutes: num(i.durationMinutes) ?? 0,
                  resolutionNote: str(i.resolutionNote) || undefined,
                };
              })
            : [],
          performance: num(p.performance),
          performancePrevious: num(p.performancePrevious),
          accessibility: num(p.accessibility),
          seo: num(p.seo),
          sslExpiresAt: num(p.sslExpiresAt),
          domainExpiresAt: num(p.domainExpiresAt),
          fixed: strList(p.fixed),
          upcoming: strList(p.upcoming),
          dashboardUrl: str(p.dashboardUrl, `${ctx.siteUrl}/portal`),
        }),
      };
    }

    default:
      return null;
  }
}
