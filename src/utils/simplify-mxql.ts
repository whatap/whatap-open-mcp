// src/utils/simplify-mxql.ts
// Prepares a raw MXQL body for display in whatap_describe_query.
//
// Some directives are plumbing the caller does not need to reason about, so the
// displayed body drops them. The original filter did that line by line, which
// broke on multi-line directives: for
//
//   RENAME [[tx_time_sum, timeSum]
//          ,[tx_count, count]
//          ,[tx_error, error]
//   ]
//
// it removed only the `RENAME [[...]` line and left the continuation lines and
// the closing bracket behind, so 39 of 815 paths rendered syntactically broken
// MXQL. Readers reasonably concluded the collector's .mql was malformed — the
// display had invented the defect. Stripping is now directive-aware: a directive
// is consumed whole, continuation lines included.

/**
 * Directives removed from the displayed body.
 *
 * CREATE is deliberately NOT in this list. It introduces derived output fields
 * (`CREATE { key: timeAvg, expr: "tx_time_sum/tx_count" }`), which is exactly
 * the kind of thing a caller needs in order to understand the result.
 */
const HIDDEN_DIRECTIVES = ["INJECT", "RENAME", "FIRST-ONLY", "APPEND"];

/** Net bracket/brace depth contributed by a line, ignoring quoted text. */
function depthDelta(line: string): number {
  let depth = 0;
  let quote: string | null = null;

  for (const c of line) {
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      continue;
    }
    if (c === "[" || c === "{") depth++;
    else if (c === "]" || c === "}") depth--;
  }
  return depth;
}

/**
 * Drop hidden directives (whole, including continuation lines) and blank lines.
 *
 * A directive that opens more brackets than it closes continues onto the
 * following lines; those are consumed until the depth returns to zero.
 */
export function simplifyRawMxql(raw: string): string {
  if (!raw) return raw;

  const out: string[] = [];
  const lines = raw.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    const hidden = HIDDEN_DIRECTIVES.some((d) => trimmed.startsWith(d));
    if (!hidden) {
      out.push(lines[i]);
      continue;
    }

    // Consume the directive and every line it spans.
    let depth = depthDelta(lines[i]);
    while (depth > 0 && i + 1 < lines.length) {
      i++;
      depth += depthDelta(lines[i]);
    }
  }

  return out.join("\n").trim();
}
