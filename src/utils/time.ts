import { LocalArgumentError } from "./errors.js";
import { MAX_WINDOW_MS } from "../api/limits.js";

export interface TimeRange {
  stime: number;
  etime: number;
}

/** A timeRange / stime / etime argument the caller can fix; no request was sent. */
export class TimeArgumentError extends LocalArgumentError {}

const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

/**
 * Parses a duration string ("5m", "1h", "last 7 days") into milliseconds.
 */
export function parseDuration(range: string): number {
  const trimmed = range.trim().toLowerCase();

  // Short form: "5m", "1h", "7d", "30s", "2w"
  const shortMatch = trimmed.match(/^(\d+)\s*([smhdw])$/);
  if (shortMatch) {
    return parseInt(shortMatch[1], 10) * UNIT_MS[shortMatch[2]];
  }

  // Long form: "last 30 minutes", "last 1 hour", "last 7 days"
  const longMatch = trimmed.match(
    /^(?:last\s+)?(\d+)\s+(second|minute|hour|day|week)s?$/
  );
  if (longMatch) {
    const amount = parseInt(longMatch[1], 10);
    const unit = longMatch[2];
    const unitKey =
      unit === "second"
        ? "s"
        : unit === "minute"
          ? "m"
          : unit === "hour"
            ? "h"
            : unit === "day"
              ? "d"
              : "w";
    return amount * UNIT_MS[unitKey];
  }

  throw new TimeArgumentError(
    `Invalid time range format: "${range}". ` +
      `Use formats like "5m", "1h", "7d", or "last 30 minutes".`
  );
}

/**
 * Parses a human-readable time range string into start/end timestamps (ms).
 *
 * Supported formats:
 *   "5m", "30m", "1h", "6h", "1d", "7d", "30d"
 *   "last 1 hour", "last 30 minutes", "last 7 days"
 */
export function parseTimeRange(range: string): TimeRange {
  const etime = Date.now();
  return { stime: etime - parseDuration(range), etime };
}

function fmtSpan(ms: number): string {
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`].filter(Boolean).join(" ") || `${ms}ms`;
}

/** Rejects a window the WhaTap API would refuse; see MAX_WINDOW_MS. */
function checkWindowSpan(stime: number, etime: number): void {
  const span = etime - stime;
  if (span < MAX_WINDOW_MS) return;
  const firstEnd = stime + MAX_WINDOW_MS - 86_400_000;
  throw new TimeArgumentError(
    `Time window is ${fmtSpan(span)}; the WhaTap API rejects a window of 32 days or more ` +
      `("The maximum search period is one month"). ` +
      `Split it with stime/etime into parts under 32 days, ` +
      `e.g. stime="${iso(stime)}", etime="${iso(firstEnd)}", then continue from there.`
  );
}

// ISO 8601 with a mandatory offset: "2026-05-14T09:00:00+09:00", "2026-05-14 09:00Z"
const ISO_WITH_OFFSET =
  /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}:?\d{2})$/i;
const ISO_WITHOUT_OFFSET = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?)?$/;

/**
 * Parses an absolute time point into epoch ms.
 *
 * Accepts epoch milliseconds (13 digits), epoch seconds (10 digits), or
 * ISO 8601 with an explicit offset. An ISO string without an offset is
 * rejected: the MCP process's local zone is not the user's, and guessing
 * shifts the window by hours without any visible error.
 */
export function parseTimePoint(value: string, name = "time"): number {
  const v = value.trim();

  if (/^\d{13}$/.test(v)) return parseInt(v, 10);
  if (/^\d{10}$/.test(v)) return parseInt(v, 10) * 1000;

  const iso = v.match(ISO_WITH_OFFSET);
  if (iso) {
    let offset = iso[3].toUpperCase();
    if (offset !== "Z" && !offset.includes(":")) {
      offset = `${offset.slice(0, 3)}:${offset.slice(3)}`;
    }
    const ms = Date.parse(`${iso[1]}T${iso[2]}${offset}`);
    if (!Number.isNaN(ms)) return ms;
  }

  if (ISO_WITHOUT_OFFSET.test(v)) {
    throw new TimeArgumentError(
      `${name} "${value}" has no timezone offset. ` +
        `Add one, e.g. "${v.includes("T") || v.includes(" ") ? v.replace(" ", "T") : `${v}T00:00:00`}+09:00" for KST or "...Z" for UTC.`
    );
  }

  throw new TimeArgumentError(
    `Invalid ${name}: "${value}". Use epoch milliseconds (e.g. "1778716800000") ` +
      `or ISO 8601 with offset (e.g. "2026-05-14T09:00:00+09:00").`
  );
}

export interface TimeWindow extends TimeRange {
  /** Human-readable description of the window, for echoes and error hints. */
  label: string;
  /** True when stime or etime was given explicitly. */
  absolute: boolean;
}

function iso(ms: number): string {
  return new Date(ms).toISOString().replace(".000Z", "Z");
}

/**
 * Resolves the query window from timeRange and optional absolute bounds.
 *
 *   neither        → [now - timeRange, now]
 *   stime only     → [stime, stime + timeRange]
 *   etime only     → [etime - timeRange, etime]
 *   stime + etime  → [stime, etime]; timeRange is ignored
 */
export function resolveTimeWindow(opts: {
  timeRange: string;
  stime?: string;
  etime?: string;
}): TimeWindow {
  const hasS = opts.stime !== undefined && opts.stime.trim() !== "";
  const hasE = opts.etime !== undefined && opts.etime.trim() !== "";

  if (!hasS && !hasE) {
    const { stime, etime } = parseTimeRange(opts.timeRange);
    checkWindowSpan(stime, etime);
    return { stime, etime, label: opts.timeRange, absolute: false };
  }

  let stime: number;
  let etime: number;
  if (hasS && hasE) {
    stime = parseTimePoint(opts.stime!, "stime");
    etime = parseTimePoint(opts.etime!, "etime");
  } else if (hasS) {
    stime = parseTimePoint(opts.stime!, "stime");
    etime = stime + parseDuration(opts.timeRange);
  } else {
    etime = parseTimePoint(opts.etime!, "etime");
    stime = etime - parseDuration(opts.timeRange);
  }

  if (stime >= etime) {
    throw new TimeArgumentError(
      `Invalid time window: stime (${iso(stime)}) must be before etime (${iso(etime)}).`
    );
  }

  checkWindowSpan(stime, etime);
  return { stime, etime, label: `${iso(stime)} → ${iso(etime)}`, absolute: true };
}

/**
 * Describes the window the caller asked for, without parsing it. For error
 * paths, where resolveTimeWindow may itself be what failed.
 */
export function requestedWindow(
  timeRange: string,
  stime?: string,
  etime?: string
): string {
  if (!stime && !etime) return timeRange;
  return `stime=${stime ?? "-"}, etime=${etime ?? "-"}, timeRange=${timeRange}`;
}
