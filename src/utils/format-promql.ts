// src/utils/format-promql.ts
// Formatter for PromQL/OpenMetrics results.
// Groups rows by label set and presents as labeled time series.

export interface PromqlFormatOptions {
  title?: string;
  maxRows?: number;
  maxSeries?: number;
  queryMeta?: { stime: number; etime: number };
}

/** Known label columns to exclude from metric grouping key. */
const META_KEYS = new Set([
  "time", "value", "_head_", "_id_", "_name_", "_type_", "_rows_", "error",
]);

/** Format PromQL results grouped by label set. */
export function formatPromqlResponse(
  data: unknown,
  options: PromqlFormatOptions = {}
): string {
  const { title, maxRows = 500, maxSeries = 20, queryMeta } = options;
  const lines: string[] = [];

  if (title) {
    lines.push(`## PromQL: ${title}`, "");
  }

  if (!Array.isArray(data) || data.length === 0) {
    return lines.concat("No OpenMetrics data found for the specified time range.").join("\n");
  }

  const allRows = data as Record<string, unknown>[];

  // Filter metadata rows
  const dataRows = allRows.filter(
    (row) => !row["_head_"] && !row["error"]
  );

  if (dataRows.length === 0) {
    return lines.concat("No OpenMetrics data found for the specified time range.").join("\n");
  }

  // Detect label columns (everything except time, value, and meta)
  const labelKeys = new Set<string>();
  for (const row of dataRows.slice(0, 50)) {
    for (const key of Object.keys(row)) {
      if (!META_KEYS.has(key)) labelKeys.add(key);
    }
  }

  // Determine result type
  const hasTime = dataRows.some((r) => "time" in r);
  const hasValue = dataRows.some((r) => "value" in r);

  // Group by label set
  const groups = new Map<string, Record<string, unknown>[]>();
  const groupLabels = new Map<string, Record<string, string>>();

  for (const row of dataRows.slice(0, maxRows)) {
    const labels: Record<string, string> = {};
    for (const key of labelKeys) {
      if (key !== "value" && key !== "time" && row[key] != null) {
        labels[key] = String(row[key]);
      }
    }
    const key = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(",");

    if (!groups.has(key)) {
      groups.set(key, []);
      groupLabels.set(key, labels);
    }
    groups.get(key)!.push(row);
  }

  const resultType = hasTime && groups.size > 0 ? "matrix" : hasValue ? "vector" : "scalar";

  // Header
  lines.push(
    `**Result**: ${resultType} | **Series**: ${groups.size} | **Rows**: ${dataRows.length}${dataRows.length >= maxRows ? "+" : ""}`
  );
  if (queryMeta) {
    lines.push(
      `**Period**: ${fmtTime(queryMeta.stime)} → ${fmtTime(queryMeta.etime)}`
    );
  }
  lines.push("");

  // Render each series
  let seriesIdx = 0;
  const allValues: number[] = [];

  for (const [key, rows] of groups) {
    if (seriesIdx >= maxSeries) {
      lines.push(
        `(+${groups.size - maxSeries} more series truncated)`,
        ""
      );
      break;
    }

    const labels = groupLabels.get(key)!;
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(", ");

    lines.push(`### {${labelStr || "no labels"}}`, "");

    if (hasTime && hasValue) {
      // Time series table
      lines.push("| time | value |", "| --- | --- |");
      const shown = rows.slice(0, 20);
      for (const row of shown) {
        const t = typeof row.time === "number" && row.time > 1_000_000_000_000
          ? fmtTime(row.time as number)
          : String(row.time ?? "-");
        const v = typeof row.value === "number"
          ? fmtNum(row.value as number)
          : String(row.value ?? "-");
        lines.push(`| ${t} | ${v} |`);
        if (typeof row.value === "number") allValues.push(row.value as number);
      }
      if (rows.length > 20) {
        lines.push(`| ... | (${rows.length - 20} more rows) |`);
      }
    } else {
      // Instant vector or other format
      const colKeys = Array.from(
        new Set(rows.flatMap((r) => Object.keys(r)))
      ).filter((k) => !META_KEYS.has(k));
      if (colKeys.length > 0) {
        lines.push(`| ${colKeys.join(" | ")} |`);
        lines.push(`| ${colKeys.map(() => "---").join(" | ")} |`);
        for (const row of rows.slice(0, 20)) {
          lines.push(
            `| ${colKeys.map((k) => fmtCell(row[k])).join(" | ")} |`
          );
        }
      }
    }
    lines.push("");
    seriesIdx++;
  }

  // Summary stats
  if (allValues.length >= 2) {
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const avg = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    lines.push(
      `**Summary** (${groups.size} series, ${dataRows.length} points): ` +
        `value ${fmtNum(min)}–${fmtNum(max)}, avg ${fmtNum(avg)}`
    );
  }

  return lines.join("\n");
}

/** Format OpenMetrics list (from OPENMX ls) */
export function formatOpenMetricsList(
  data: unknown,
  projectCode: number
): { lines: string[]; metrics: Array<{ name: string; type: string; suggested: string }> } {
  const lines: string[] = [];
  const metrics: Array<{ name: string; type: string; suggested: string }> = [];

  if (!Array.isArray(data) || data.length === 0) {
    return { lines, metrics };
  }

  const rows = (data as Record<string, unknown>[]).filter(
    (r) => !r["_head_"] && !r["error"] && r["metric"]
  );

  if (rows.length === 0) {
    return { lines, metrics };
  }

  // Deduplicate by metric name
  const seen = new Set<string>();
  for (const row of rows) {
    const name = String(row["metric"] ?? "");
    if (!name || seen.has(name)) continue;
    seen.add(name);

    const type = String(row["type"] ?? "gauge").toLowerCase();
    const suggested = suggestPromql(name, type);
    metrics.push({ name, type, suggested });
  }

  lines.push(`### Available OpenMetrics (${metrics.length})`, "");
  for (const m of metrics.slice(0, 30)) {
    lines.push(`- \`${m.name}\` (${m.type}) → suggested: \`${m.suggested}\``);
  }
  if (metrics.length > 30) {
    lines.push(`  (+${metrics.length - 30} more — use \`whatap_data_availability(search="keyword")\` to filter)`);
  }
  lines.push("");

  // Workflow hint
  lines.push(
    `**PromQL Workflow**: To create a reusable query from the metrics above:`,
    "",
    `\`whatap_create_promql(projectCode=${projectCode}, name="descriptive name", query="<suggested query>")\``,
    "",
    `Validated queries are saved permanently — reuse with \`whatap_query_data(savedQuery="name")\`.`,
    `Common patterns: counter→\`rate(m[5m])\`, gauge→\`m\`, histogram→\`histogram_quantile(0.95, rate(m_bucket[5m]))\``,
    ""
  );

  return { lines, metrics };
}

/** Generate suggested PromQL based on metric type. */
function suggestPromql(name: string, type: string): string {
  switch (type) {
    case "counter":
      return `rate(${name}[5m])`;
    case "histogram":
      return `histogram_quantile(0.95, rate(${name}_bucket[5m]))`;
    case "summary":
      return name;
    default: // gauge, untyped
      return name;
  }
}

function fmtTime(ms: number): string {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function fmtNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  if (Math.abs(n) < 0.01) return n.toExponential(2);
  return n.toFixed(2);
}

function fmtCell(v: unknown): string {
  if (v === null || v === undefined) return "-";
  if (typeof v === "number") return fmtNum(v);
  return String(v);
}
