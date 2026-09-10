// src/utils/response.ts
// Central response utilities for errors, next-steps, and no-data cases.

// ---------- Types ----------

type McpTextContent = { type: "text"; text: string };
type McpResponse = { content: McpTextContent[]; isError?: true };

interface ErrorOpts {
  message: string;
  hint?: string;
  suggestTool?: string;
  suggestToolArgs?: string;
  retryable?: boolean;
}

// ---------- Error Builder ----------

export function buildErrorResponse(opts: ErrorOpts): McpResponse {
  const lines: string[] = [];
  lines.push(`**Error**: ${opts.message}`);
  if (opts.hint) {
    lines.push("", `**How to fix**: ${opts.hint}`);
  }
  if (opts.suggestTool) {
    lines.push(
      "",
      `**Suggested next tool**: Call \`${opts.suggestTool}\`${
        opts.suggestToolArgs ? ` ${opts.suggestToolArgs}` : ""
      }`
    );
  }
  if (opts.retryable === true) {
    lines.push("", "This error may be transient — retrying may work.");
  } else if (opts.retryable === false) {
    lines.push("", "Do NOT retry with the same parameters.");
  }
  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
    isError: true,
  };
}

// ---------- Error Classifier ----------

export function classifyAndBuildError(
  err: unknown,
  context: {
    toolName: string;
    projectCode?: number;
    category?: string;
    timeRange?: string;
  }
): McpResponse {
  const msg = (err as Error).message ?? String(err);

  // No API token → wrong projectCode
  if (msg.includes("No API token found for project")) {
    return buildErrorResponse({
      message: msg,
      hint: `Project ${context.projectCode} not found or not accessible with your token.`,
      suggestTool: "whatap_list_projects",
      suggestToolArgs:
        "— it returns all accessible projects with their pcodes",
      retryable: false,
    });
  }

  // Rate limit
  if (
    msg.includes("429") ||
    msg.toLowerCase().includes("rate limit") ||
    msg.includes("Too Many Requests")
  ) {
    return buildErrorResponse({
      message: msg,
      hint: "WhaTap API rate limit hit. Wait a few seconds, then retry with a narrower time range.",
      retryable: true,
    });
  }

  // Auth failure
  if (msg.includes("401") || msg.includes("403")) {
    return buildErrorResponse({
      message: msg,
      hint: "Authentication failed. Verify WHATAP_API_TOKEN is valid.",
      suggestTool: "whatap_list_projects",
      suggestToolArgs: "to verify which projects your token can access",
      retryable: false,
    });
  }

  // Timeout
  if (msg.includes("timeout") || msg.includes("AbortError")) {
    return buildErrorResponse({
      message: `Request timed out for ${context.toolName}.`,
      hint: 'Try a shorter time range (e.g., "5m" instead of "1d").',
      retryable: true,
    });
  }

  // Default
  return buildErrorResponse({
    message: `${context.toolName} failed: ${msg}`,
    hint: context.projectCode
      ? `Verify project code ${context.projectCode} is correct.`
      : undefined,
    suggestTool: "whatap_list_projects",
    suggestToolArgs: "to get valid project codes",
  });
}

// ---------- Next Steps ----------

const NEXT_STEPS: Record<string, string[]> = {
  whatap_list_projects: [
    "**Next**: `whatap_data_availability(projectCode)` to see available data for a project.",
  ],
  whatap_project_info: [
    "**Next**: `whatap_list_agents(projectCode)` to see active agents.",
  ],
  whatap_list_agents: [
    "**Next**: `whatap_data_availability(projectCode)` to see available queries.",
  ],
  whatap_data_availability: [
    "**Next**: `whatap_describe_query(path)` for details, or `whatap_query_data(projectCode, path)` to query directly.",
  ],
  whatap_describe_query: [
    "**Next**: `whatap_query_data(projectCode, path)` to execute.",
  ],
  whatap_query_data: [
    "**Explore**: `whatap_data_availability(search=keyword)` to find related queries.",
  ],
  whatap_apm_anomaly: [
    "**Next**: `whatap_query_data(projectCode, path=\"v2/app/tps_oid\")` to drill into agent data.",
  ],
  whatap_service_topology: [
    "**Next**: `whatap_apm_anomaly(projectCode)` to detect performance issues.",
  ],
};

export function appendNextSteps(text: string, toolName: string): string {
  const steps = NEXT_STEPS[toolName];
  if (!steps || steps.length === 0) return text;
  return text + "\n\n---\n" + steps.join("\n");
}

// ---------- No-Data Response ----------

// Category → typical project platform mapping for diagnosis
const CATEGORY_PLATFORMS: Record<string, string> = {
  app_counter: "APM (JAVA, NODEJS, PYTHON, etc.)",
  app_active_stat: "APM",
  app_context_stat: "APM",
  server_base: "Server/Infrastructure",
  server_disk: "Server/Infrastructure",
  server_network: "Server/Infrastructure",
  server_process: "Server/Infrastructure",
  kube_pod_stat: "Kubernetes",
  kube_node: "Kubernetes",
  kube_event: "Kubernetes",
  container: "Kubernetes/Container",
  db_real_counter: "Database",
  db_counter: "Database",
  db_active_session: "Database",
  logsink_stats: "Log monitoring",
};

/** How a query reached the server, for echoing back on an empty result. */
export interface QueryEcho {
  /** Which API endpoint carried the request. */
  endpoint: "mxql/text" | "mxql/path" | "openmx/text";
  /** The exact value of the `mql` field in the POST body. */
  sentMql: string;
  /**
   * True when `sentMql` is a path reference the server expands server-side.
   * In that case `sentMql` is NOT the executed query text.
   */
  serverExpanded?: boolean;
  /** Catalog text for the same path — shown only when serverExpanded. */
  catalogRawMxql?: string;
  param?: Record<string, string>;
  stime: number;
  etime: number;
  limit?: number;
  pageKey?: string;
  /** Rows before / after metadata+error filtering. */
  rawRowCount?: number;
  dataRowCount?: number;
}

const MXQL_ECHO_MAX_CHARS = 1200;

function fenceMxql(src: string): string {
  const compact = src.replace(/\n{3,}/g, "\n\n").trim();
  const shown =
    compact.length <= MXQL_ECHO_MAX_CHARS
      ? compact
      : compact.slice(0, MXQL_ECHO_MAX_CHARS) +
        `\n… (truncated; ${compact.length} chars total)`;
  return "```mxql\n" + shown + "\n```";
}

function fmtWindow(stime: number, etime: number): string {
  const iso = (ms: number) =>
    new Date(ms).toISOString().replace("T", " ").slice(0, 19);
  const kst = (ms: number) =>
    new Date(ms + 9 * 3_600_000).toISOString().replace("T", " ").slice(0, 19);
  return (
    `${stime} → ${etime}\n` +
    `  UTC: ${iso(stime)} → ${iso(etime)}\n` +
    `  KST: ${kst(stime)} → ${kst(etime)}`
  );
}

/** Render the "what was executed" block shared by empty and error responses. */
export function renderEcho(e: QueryEcho, projectCode?: number, timeRange?: string): string[] {
  const lines: string[] = ["**What was executed**", ""];
  lines.push(`- Endpoint: \`${e.endpoint}\``);
  if (projectCode != null) {
    lines.push(
      `- Project: ${projectCode}` + (timeRange ? ` | timeRange: "${timeRange}"` : "")
    );
  }
  lines.push(`- Window (epoch ms): ${fmtWindow(e.stime, e.etime)}`);
  if (e.limit != null) lines.push(`- limit: ${e.limit}`);
  if (e.pageKey) lines.push(`- pageKey: ${e.pageKey}`);
  lines.push(
    `- param: ${
      e.param && Object.keys(e.param).length > 0 ? JSON.stringify(e.param) : "(none)"
    }`
  );
  if (e.rawRowCount != null) {
    lines.push(
      `- Rows: ${e.rawRowCount} returned, ${e.dataRowCount ?? 0} after metadata filtering`
    );
  }
  lines.push("");

  if (e.serverExpanded) {
    lines.push(
      `Sent \`mql\`: \`${e.sentMql}\` — a path reference. ` +
        "The server expands the .mql file, so the executed text is not visible to this client."
    );
    if (e.catalogRawMxql) {
      lines.push(
        "",
        "Catalog source for this path (server-expanded, not the executed text):",
        fenceMxql(e.catalogRawMxql)
      );
    }
  } else {
    lines.push("Executed MXQL (sent verbatim to the server):", fenceMxql(e.sentMql));
  }
  return lines;
}

/**
 * Response for state A: the query executed, the server reported no error, and
 * zero data rows came back.
 *
 * This must NOT assert a cause. A previous version listed "time range too
 * narrow", "no data collected" and "no active agents" as causes; all three were
 * false for the reported case, and because an LLM consumes this text those
 * guesses propagated into analyses as fact.
 */
export function buildNoDataResponse(opts: {
  toolName: string;
  projectCode: number;
  timeRange?: string;
  category?: string;
  echo?: QueryEcho;
}): McpResponse {
  const e = opts.echo;
  const lines: string[] = [
    "**No rows returned.**",
    e
      ? "The request reached the server and came back without an error and without rows."
      : "The request completed without rows. (Execution details were not captured for this call site.)",
    "",
  ];

  if (e) {
    lines.push(...renderEcho(e, opts.projectCode, opts.timeRange), "");
  }

  lines.push("**What this tells you**", "");
  lines.push(
    "- Known: this query, over this window, returned zero rows.",
    "- Not known: whether the metric is collected at all, whether agents are running, " +
      "and whether the query is well-formed for this project.",
    '- **Do not report this as "not measured", "not collected", or "no agents".** ' +
      "This response is not evidence for any of those."
  );
  if (e && !e.serverExpanded && /<%[\s\S]*?%>/.test(e.sentMql)) {
    lines.push(
      "- The MXQL above still contains unresolved `<% … %>` template markers. " +
        "It could not have matched anything. Treat this result as **query not executed as " +
        "intended**, not as absent data."
    );
  }
  if (opts.category) {
    const expectedPlatform = CATEGORY_PLATFORMS[opts.category];
    if (expectedPlatform) {
      lines.push(
        `- Context: \`${opts.category}\` is typically populated by ${expectedPlatform} projects. ` +
          "This is a catalog convention, not a measurement of this project."
      );
    }
  }
  lines.push("");

  lines.push("**To narrow it down**", "");
  lines.push(
    `- \`whatap_data_availability(projectCode=${opts.projectCode})\` — probes live categories.`
  );
  if (opts.timeRange) {
    lines.push(`- Re-run with a wider timeRange (current: "${opts.timeRange}").`);
  }
  lines.push(
    `- \`whatap_list_agents(projectCode=${opts.projectCode})\` — confirms agents are reporting.`
  );
  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}

// ---------- Server-reported Error Rows ----------

// Field names WhaTap/Yard responses have been observed to use for in-body errors.
// Verified live 2026-09-10: /flush/mxql/text returns HTTP 200 with
// [{"error":"A JSONObject text must begin with '{' ..."}] for invalid MXQL.
// "message" is deliberately excluded — it is a plausible column name in log data.
const ERROR_ROW_KEYS = ["error", "err", "errorMessage", "error_message", "msg"] as const;

/**
 * Extract a server-supplied error message from an MXQL/PromQL response.
 * The server can return HTTP 200 with an error row inside the array, at any
 * position and alongside other rows. Returns null when no error row is present.
 */
export function extractServerError(result: unknown): string | null {
  if (!Array.isArray(result)) return null;
  for (const row of result) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    for (const key of ERROR_ROW_KEYS) {
      if (!(key in r)) continue;
      const v = r[key];
      if (v == null || v === "" || v === false) continue;
      return typeof v === "string" ? v : JSON.stringify(v);
    }
  }
  return null;
}

/**
 * Response for state B: the server executed (or refused) the query and said why.
 * Shows the server's own message verbatim and never inspects its content —
 * any error row is an error.
 */
export function buildServerErrorResponse(opts: {
  toolName: string;
  serverMessage: string;
  projectCode?: number;
  path?: string;
  timeRange?: string;
  echo?: QueryEcho;
}): McpResponse {
  const lines: string[] = [
    "**Query failed on the WhaTap server.**",
    "",
    `**Server message**: ${opts.serverMessage}`,
    "",
    "This is a query execution failure, **not** an absence of data. " +
      "Do not conclude that the project has no data for this time range.",
  ];
  const ctx: string[] = [];
  if (opts.path) ctx.push(`- **Path**: \`${opts.path}\``);
  if (opts.projectCode != null) ctx.push(`- **Project**: ${opts.projectCode}`);
  if (opts.timeRange) ctx.push(`- **Time range**: ${opts.timeRange}`);
  if (ctx.length > 0) lines.push("", "**Context:**", ...ctx);
  if (opts.echo) {
    lines.push("", ...renderEcho(opts.echo, opts.projectCode, opts.timeRange));
  }
  lines.push("", "Do NOT retry with the same parameters.");
  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
    isError: true,
  };
}
