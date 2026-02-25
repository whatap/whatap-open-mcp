export interface FormatOptions {
  title?: string;
  maxRows?: number;
}

/**
 * Formats MXQL result data into an AI-friendly text summary.
 * MXQL flush response is a flat array of row objects: [{...}, {...}, ...]
 */
export function formatMxqlResponse(
  data: unknown,
  options: FormatOptions = {}
): string {
  const { title, maxRows = 100 } = options;
  const lines: string[] = [];

  if (title) {
    lines.push(`## ${title}`, "");
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return lines.concat("No data found for the specified time range.").join("\n");
    }

    // MXQL returns a flat array of row objects
    const rows = data.slice(0, maxRows) as Record<string, unknown>[];

    lines.push(formatTable(rows));
    if (data.length > maxRows) {
      lines.push("", `(Showing first ${maxRows} of ${data.length} records)`);
    }
  } else if (data && typeof data === "object") {
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

function formatTable(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";

  // Get all unique keys across rows
  const keys = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      keys.add(key);
    }
  }
  const columns = Array.from(keys);

  // Build markdown table
  const header = `| ${columns.join(" | ")} |`;
  const sep = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows
    .map(
      (row) =>
        `| ${columns.map((c) => formatValue(row[c])).join(" | ")} |`
    )
    .join("\n");

  return [header, sep, body].join("\n");
}

function formatObject(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .map(([k, v]) => `- **${k}**: ${formatValue(v)}`)
    .join("\n");
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "-";
  if (typeof v === "number") {
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
