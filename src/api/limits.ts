// src/api/limits.ts
// Server-side limits of /open-mcp/api/flush/mxql/{text,path} (OPENMX included),
// measured 2026-10-11. The Open API v1 spec only says "at most 31 days", so the
// exact boundaries below come from probing, not from the spec. If the server
// changes them, these checks reject requests the server would accept (or the
// reverse) — re-measure before editing.

import { LocalArgumentError } from "../utils/errors.js";

/**
 * etime - stime must be strictly less than this. 32 days - 1 ms was accepted,
 * exactly 32 days rejected with "The search period is too long. The maximum
 * search period is one month." A fixed length, not a calendar month: a window
 * across February behaves the same.
 */
export const MAX_WINDOW_MS = 32 * 86_400_000;

/** limit 100,000 accepted, 100,001 rejected with "max limit is 100,000". */
export const MAX_LIMIT = 100_000;

/** Accepts a whole number from 1 to MAX_LIMIT. */
export function checkLimit(limit: number): void {
  if (!Number.isInteger(limit)) {
    throw new LocalArgumentError(`limit must be a whole number, got ${limit}.`);
  }
  if (limit < 1) {
    throw new LocalArgumentError(
      `limit must be between 1 and ${MAX_LIMIT.toLocaleString("en-US")}, got ${limit}.`
    );
  }
  if (limit > MAX_LIMIT) {
    throw new LocalArgumentError(
      `limit ${limit.toLocaleString("en-US")} exceeds the WhaTap API maximum of ` +
        `${MAX_LIMIT.toLocaleString("en-US")}. ` +
        "Use a smaller limit, or split the window with stime/etime and query each part."
    );
  }
}
