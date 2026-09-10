import type { ResultSemantics } from "./semantic.js";
import { formatSemanticHeader } from "./semantic.js";
import {
  buildFieldGuide,
  buildThresholdAlerts,
  buildSummaryGuidance,
} from "./field-guide.js";

export interface FormatOptions {
  title?: string;
  maxRows?: number;
  queryMeta?: {
    stime: number;
    etime: number;
  };
  semantics?: ResultSemantics;
  fieldGuide?: { category: string };
}

/**
 * Formats MXQL result data into an AI-friendly text summary.
 * Extracts _head_ row for unit annotations, converts timestamps,
 * suppresses redundant columns, and appends summary statistics.
 */
export function formatMxqlResponse(
  data: unknown,
  options: FormatOptions = {}
): string {
  const { title, maxRows = 100, queryMeta, semantics } = options;
  const lines: string[] = [];

  if (title) {
    lines.push(`## ${title}`, "");
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return lines
        .concat(
          "No rows returned. The server reported no error — this is not evidence " +
            "that the data is uncollected or that the time range is wrong."
        )
        .join("\n");
    }

    const allRows = data as Record<string, unknown>[];

    // Extract _head_ row for unit annotations
    // Supports two API formats:
    //   Format A: {"_head_": {"cpu": "P", ...}}  — types nested in _head_ value
    //   Format B: {"_head_": true, "cpu": "P", ...}  — types as sibling fields
    const headRow = allRows.find((row) => row["_head_"]);
    const headerTypes: Record<string, string> = {};
    if (headRow) {
      const hv = headRow["_head_"];
      if (typeof hv === "object" && hv !== null) {
        // Format A
        Object.assign(headerTypes, hv as Record<string, string>);
      } else {
        // Format B: extract sibling fields with known type codes
        for (const [key, value] of Object.entries(headRow)) {
          if (
            key !== "_head_" &&
            typeof value === "string" &&
            KNOWN_HEADER_TYPES.has(value)
          ) {
            headerTypes[key] = value;
          }
        }
      }
    }

    // Filter metadata/error rows
    const dataRows = allRows.filter(
      (row) => !row["_head_"] && !row["error"]
    );
    if (dataRows.length === 0) {
      return lines
        .concat(
          "No rows returned. The server reported no error — this is not evidence " +
            "that the data is uncollected or that the time range is wrong."
        )
        .join("\n");
    }

    const limited = dataRows.slice(0, maxRows);
    // Treat result as potentially truncated if rows >= limit
    // (API applies limit server-side, so exact match means there may be more)
    const truncated = dataRows.length >= maxRows;

    // Semantic header (result type, grain, row counts)
    if (semantics) {
      lines.push(
        formatSemanticHeader(semantics, {
          displayed: limited.length,
          total: dataRows.length,
        })
      );
    }

    // Period
    if (queryMeta) {
      lines.push(
        `**Period**: ${fmtTime(queryMeta.stime)} → ${fmtTime(queryMeta.etime)}`
      );
    }

    if (semantics || queryMeta) lines.push("");

    // Truncation caution (context-aware when semantics available)
    if (truncated && semantics) {
      if (semantics.resultType === "timeseries") {
        lines.push(
          `> Result may be truncated (showing ${limited.length} rows). Do not infer global ranking from displayed rows.`,
          ""
        );
      } else if (semantics.resultType !== "ranking") {
        lines.push(
          `> Result may be truncated (showing ${limited.length} rows).`,
          ""
        );
      }
    }

    // Data table
    lines.push(formatTable(limited, headerTypes));

    // Explain the entity columns, but only the ones the table actually shows
    const entityNote = entityColumnNote(limited, resolveColumns(limited));
    if (entityNote) lines.push("", entityNote);

    // Legacy truncation notice (only when no semantics)
    if (truncated && !semantics) {
      lines.push(
        "",
        `(Showing ${limited.length} rows — result may be truncated)`
      );
    }

    // Summary statistics (labeled as sample when truncated)
    const rowCounts = truncated
      ? { displayed: limited.length, total: dataRows.length }
      : undefined;
    const stats = computeSummaryStats(limited, headerTypes, rowCounts);
    if (stats) {
      lines.push("", stats);
    }

    // Category-based field enrichment
    if (options.fieldGuide?.category) {
      const cat = options.fieldGuide.category;

      // Extract column names (same logic as formatTable)
      const colKeys = new Set<string>();
      for (const row of limited) {
        for (const key of Object.keys(row)) {
          if (!NON_METRIC_COLS.has(key)) colKeys.add(key);
        }
      }
      let cols = Array.from(colKeys);
      if (cols.includes("oname") && cols.includes("oid")) {
        cols = cols.filter((c) => c !== "oid");
      }

      // Field Guide table
      const guide = buildFieldGuide(cat, cols);
      if (guide) lines.push("", guide);

      // Threshold alerts (from visible rows)
      const fieldStats: Record<string, { max: number; avg: number }> = {};
      for (const col of cols) {
        const values = limited
          .map((r) => r[col])
          .filter((v): v is number => typeof v === "number");
        if (values.length >= 2 && new Set(values).size > 1) {
          fieldStats[col] = {
            max: Math.max(...values),
            avg: values.reduce((a, b) => a + b, 0) / values.length,
          };
        }
      }
      const alerts = buildThresholdAlerts(cat, fieldStats);
      if (alerts.length > 0) {
        lines.push("", "### Threshold Alerts", "");
        lines.push(...alerts);
      }

      // Summary guidance
      const guidance = buildSummaryGuidance(cat, cols);
      if (guidance) lines.push("", guidance);
    }
  } else if (data && typeof data === "object") {
    if (queryMeta) {
      lines.push(
        `**Period**: ${fmtTime(queryMeta.stime)} → ${fmtTime(queryMeta.etime)}`,
        ""
      );
    }
    lines.push(formatObject(data as Record<string, unknown>));
  } else {
    lines.push(String(data));
  }

  return lines.join("\n");
}

/**
 * Formats a list of projects into readable text.
 * Uses actual API field names: projectCode, projectName
 */
export function formatProjectList(
  projects: Array<Record<string, unknown>>
): string {
  if (projects.length === 0) return "No projects found.";

  const lines = [`## Projects (${projects.length} total)`, ""];
  for (const p of projects) {
    const status = p.status ?? "active";
    lines.push(
      `- **${p.projectName}** (pcode: ${p.projectCode}) - ${p.platform ?? "unknown"} / ${p.productType ?? "unknown"} [${status}]`
    );
  }
  return lines.join("\n");
}

/**
 * Formats an agent list.
 * Uses actual API field names: oname, active, host_ip
 */
export function formatAgentList(
  agents: Array<Record<string, unknown>>
): string {
  if (agents.length === 0) return "No agents found in this project.";

  const lines = [`## Agents (${agents.length} total)`, ""];
  for (const a of agents) {
    const status = a.active ? "active" : "inactive";
    lines.push(
      `- **${a.oname}** - ${status}${a.host_ip ? ` / IP: ${a.host_ip}` : ""}${a.oid ? ` (oid: ${a.oid})` : ""}`
    );
  }
  return lines.join("\n");
}

// --- internal helpers ---

const UNIT_SUFFIX: Record<string, string> = {
  P: "%",
  ms: "ms",
  B: "bytes",
};

/**
 * Columns hidden from the rendered table: dashboard bookkeeping with no meaning
 * to a reader. `_id_`/`_name_` are intentionally absent — see formatTable().
 */
const TABLE_HIDDEN_COLS = new Set(["_head_", "_type_", "_rows_"]);

/**
 * Entity-identity columns produced by the catalog queries. `_name_` is the
 * display name (from `oname`, `pname` or `onodeName`); `_id_` is the query's
 * series key, which may be a raw oid or a composite such as `pcode_oname`.
 * They identify a row, so they are never treated as metrics.
 */
const ENTITY_COLS: string[] = ["_name_", "_id_"];

/** Columns that are identifiers or bookkeeping, never metrics to summarize. */
const NON_METRIC_COLS = new Set([...TABLE_HIDDEN_COLS, ...ENTITY_COLS]);



/**
 * Explains `_id_`/`_name_` to the caller. Without this the columns read as
 * internal noise, and an LLM has no way to know `_name_` is the agent name.
 */
function entityColumnNote(
  rows: Record<string, unknown>[],
  shown: string[]
): string | null {
  const has = (c: string) => shown.includes(c);
  if (!ENTITY_COLS.some(has)) return null;
  const parts: string[] = [];
  if (has("_name_")) {
    parts.push(
      "`_name_` is the entity display name for the row (agent `oname`, or the " +
        "project/node name for project- and node-level queries)"
    );
  }
  if (has("_id_")) {
    parts.push(
      "`_id_` is this query's series key — sometimes the raw `oid`, sometimes a " +
        "composite such as `pcode_oname`, so compare it only within one query"
    );
  }
  return (
    "*Entity columns*: " +
    parts.join("; ") +
    ". The query moved these out of `oid`/`oname`, so they are the row's only identity."
  );
}

// Valid MXQL HEADER type codes for Format B _head_ extraction
const KNOWN_HEADER_TYPES = new Set(["P", "F", "I", "B", "ms", "0", "S", "#"]);

/**
 * Decide which columns a result table shows, in order.
 *
 * Shared so the entity-column note cannot disagree with the table it explains.
 */
function resolveColumns(rows: Record<string, unknown>[]): string[] {
  if (rows.length === 0) return [];

  // Get all unique keys, excluding columns that carry no information for a reader.
  // `_id_`/`_name_` are NOT in this set: many catalog queries move the entity
  // identity into them (`CREATE {key:_name_, from:oname}` followed by
  // `DELETE [oid,oname]`), so for those paths they are the only identity the
  // response carries. Hiding them made per-agent queries return unattributable
  // numbers — e.g. mxql/app/gc_oid returned 9 rows per timestamp, one per agent,
  // with nothing to tell them apart.
  const keys = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!TABLE_HIDDEN_COLS.has(key)) keys.add(key);
    }
  }

  let columns = Array.from(keys);

  // Drop oid when oname exists (oid is a raw numeric ID)
  if (columns.includes("oname") && columns.includes("oid")) {
    columns = columns.filter((c) => c !== "oid");
  }

  // Most catalog queries keep `oid`/`oname` and *also* set `_id_`/`_name_` for the
  // dashboard, so showing both would duplicate a column. Drop an entity column
  // only when another column already carries the identical value in every row —
  // never when it is the sole identity (the case this whole change exists for).
  for (const ec of ENTITY_COLS) {
    if (!columns.includes(ec)) continue;
    const val = (row: Record<string, unknown>, k: string) => {
      const v = row[k];
      return v === null || v === undefined ? "" : String(v);
    };
    const informative = rows.some((r) => val(r, ec) !== "");
    const duplicated = columns.some(
      (other) =>
        other !== ec &&
        !ENTITY_COLS.includes(other) &&
        rows.every((r) => val(r, other) === val(r, ec))
    );
    if (!informative || duplicated) {
      columns = columns.filter((c) => c !== ec);
    }
  }

  // Identity reads better next to time than appended after 20 metric columns.
  // Deliberately NOT renamed to `oname`/`name`: `_name_` collides with a real
  // `name` column in 16 catalog paths (process name, pod name, container name)
  // and `_id_` with a real `id` in 3, and a rename would silently overwrite one
  // of them. Keeping the wire keys makes a collision impossible.
  const identityCols = ENTITY_COLS.filter((c) => columns.includes(c));
  if (identityCols.length > 0) {
    const rest = columns.filter((c) => !identityCols.includes(c));
    const timeIdx = rest.indexOf("time");
    columns =
      timeIdx >= 0
        ? [...rest.slice(0, timeIdx + 1), ...identityCols, ...rest.slice(timeIdx + 1)]
        : [...identityCols, ...rest];
  }

  return columns;
}

function formatTable(
  rows: Record<string, unknown>[],
  headerTypes: Record<string, string> = {}
): string {
  if (rows.length === 0) return "";

  const columns = resolveColumns(rows);

  // Annotate column headers with units from _head_
  const displayColumns = columns.map((col) => {
    const suffix = UNIT_SUFFIX[headerTypes[col]];
    return suffix ? `${col} (${suffix})` : col;
  });

  // Build markdown table
  const header = `| ${displayColumns.join(" | ")} |`;
  const sep = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows
    .map(
      (row) =>
        `| ${columns.map((c) => formatValue(row[c], c)).join(" | ")} |`
    )
    .join("\n");

  return [header, sep, body].join("\n");
}

function formatObject(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .map(([k, v]) => `- **${k}**: ${formatValue(v)}`)
    .join("\n");
}

function formatValue(v: unknown, field?: string): string {
  if (v === null || v === undefined) return "-";
  if (typeof v === "number") {
    // Convert Unix ms timestamps to readable format
    if (field === "time" && v > 1_000_000_000_000) {
      return fmtTime(v);
    }
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function fmtTime(ms: number): string {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function fmtNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

function computeSummaryStats(
  rows: Record<string, unknown>[],
  headerTypes: Record<string, string>,
  rowCounts?: { displayed: number; total: number }
): string | null {
  if (rows.length < 3) return null;

  const META_COLS = NON_METRIC_COLS;
  const SKIP_COLS = new Set(["time", "oid", "pcode"]);

  // Collect all columns
  const allCols = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      allCols.add(key);
    }
  }

  // Prioritize columns with header types, then other numeric columns
  const typedCols: string[] = [];
  const numericCols: string[] = [];

  for (const col of allCols) {
    if (META_COLS.has(col) || SKIP_COLS.has(col)) continue;
    if (headerTypes[col]) {
      typedCols.push(col);
    } else {
      numericCols.push(col);
    }
  }

  const candidates = [...typedCols, ...numericCols];
  const parts: string[] = [];

  for (const col of candidates) {
    if (parts.length >= 5) break;

    const values = rows
      .map((r) => r[col])
      .filter((v): v is number => typeof v === "number");

    if (values.length < 2) continue;
    // Skip ID-like columns (all same value)
    if (new Set(values).size === 1) continue;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    const suffix = UNIT_SUFFIX[headerTypes[col]] ?? "";
    const u = suffix ? ` ${suffix}` : "";

    parts.push(
      `**${col}** (${fmtNum(min)}–${fmtNum(max)}${u}, avg ${fmtNum(avg)}${u})`
    );
  }

  if (parts.length === 0) return null;
  const label =
    rowCounts && rowCounts.displayed < rowCounts.total
      ? `${rowCounts.displayed} of ${rowCounts.total} rows, sample only`
      : `${rows.length} rows`;
  return `**Summary** (${label}): ${parts.join(" | ")}`;
}
