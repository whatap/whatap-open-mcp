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
  // Entry points
  whatap_list_projects: [
    "Use a pcode with `whatap_check_availability(projectCode)` to see which data categories have data.",
    "Or jump to a domain tool: `whatap_server_cpu`, `whatap_apm_tps`, `whatap_k8s_pod_status`, etc.",
  ],
  whatap_project_info: [
    "Call `whatap_list_agents(projectCode)` to see servers/instances.",
    "Call `whatap_check_availability(projectCode)` to discover available data.",
  ],
  whatap_list_agents: [
    "Use an oid to filter domain tools: `whatap_server_cpu(oid=...)`, `whatap_db_stat(oid=...)`.",
  ],

  // Catalog
  whatap_list_categories: [
    "Call `whatap_describe_fields(category)` to see available fields and example queries.",
  ],
  whatap_describe_fields: [
    "Query this category: `whatap_query_category(projectCode, category, fields, timeRange)`.",
    "Or use `whatap_mxql_query` for raw MXQL with full control.",
  ],
  whatap_check_availability: [
    "Query available categories with `whatap_query_category(projectCode, category, fields, timeRange)`.",
    "Or use domain-specific tools for available categories.",
  ],
  whatap_query_category: [
    "Discover more categories: `whatap_list_categories`.",
    "For simpler queries, try domain tools: `whatap_server_cpu`, `whatap_apm_tps`, etc.",
  ],

  // Server
  whatap_server_cpu: [
    "Related: `whatap_server_memory`, `whatap_server_cpu_load`, `whatap_server_top(metric='cpu')`.",
  ],
  whatap_server_memory: [
    "Related: `whatap_server_cpu`, `whatap_server_process`, `whatap_server_top(metric='memory')`.",
  ],
  whatap_server_disk: [
    "Related: `whatap_server_top(metric='disk')`, `whatap_server_process`.",
  ],
  whatap_server_network: [
    "Correlate with `whatap_server_cpu` and `whatap_server_memory` for full health picture.",
  ],
  whatap_server_process: [
    "Correlate with `whatap_server_cpu` (overall CPU) and `whatap_server_memory` (overall memory).",
  ],
  whatap_server_cpu_load: [
    "If load is high: `whatap_server_cpu` for CPU breakdown, `whatap_server_process` for top processes.",
  ],
  whatap_server_top: [
    "Drill down: use the oid of a top server with `whatap_server_cpu(oid=...)` for details.",
  ],

  // APM
  whatap_apm_tps: [
    "Correlate: `whatap_apm_response_time` (latency), `whatap_apm_error` (error rates), `whatap_apm_active_transactions` (saturation).",
  ],
  whatap_apm_response_time: [
    "Correlate: `whatap_apm_tps` (throughput), `whatap_apm_apdex` (user satisfaction), `whatap_apm_error`.",
  ],
  whatap_apm_error: [
    "Correlate: `whatap_apm_tps`, `whatap_apm_response_time`, `whatap_apm_transaction_stats`.",
  ],
  whatap_apm_apdex: [
    "Investigate poor scores: `whatap_apm_response_time` (latency), `whatap_apm_error` (errors).",
  ],
  whatap_apm_active_transactions: [
    "If many active: `whatap_apm_response_time` (slow responses), `whatap_server_cpu` (resource pressure).",
  ],
  whatap_apm_transaction_stats: [
    "Drill down: `whatap_apm_error`, `whatap_apm_response_time`.",
  ],

  // Kubernetes
  whatap_k8s_node_list: [
    "Drill down: `whatap_k8s_node_cpu`, `whatap_k8s_node_memory`, `whatap_k8s_pod_status`.",
  ],
  whatap_k8s_node_cpu: [
    "Related: `whatap_k8s_node_memory`, `whatap_k8s_container_top(metric='cpu')`.",
  ],
  whatap_k8s_node_memory: [
    "Related: `whatap_k8s_node_cpu`, `whatap_k8s_container_top(metric='memory')`.",
  ],
  whatap_k8s_pod_status: [
    "Investigate: `whatap_k8s_events` (warnings/errors), `whatap_k8s_container_top` (resource usage).",
  ],
  whatap_k8s_container_top: [
    "Related: `whatap_k8s_pod_status` (pod health), `whatap_k8s_events` (cluster events).",
  ],
  whatap_k8s_events: [
    "Correlate: `whatap_k8s_pod_status` (pod state), `whatap_alerts` (platform alerts).",
  ],

  // Database
  whatap_db_instance_list: [
    "Use oid to filter: `whatap_db_stat(oid=...)`, `whatap_db_active_sessions(oid=...)`.",
  ],
  whatap_db_stat: [
    "Drill down: `whatap_db_active_sessions` (session details), `whatap_db_wait_analysis` (Oracle waits).",
  ],
  whatap_db_active_sessions: [
    "Related: `whatap_db_wait_analysis` (Oracle), `whatap_db_stat` (aggregate metrics).",
  ],
  whatap_db_wait_analysis: [
    "Related: `whatap_db_active_sessions`, `whatap_db_stat`.",
  ],

  // Log
  whatap_log_search: [
    "Volume trends: `whatap_log_stats`. Correlate: `whatap_alerts`.",
  ],
  whatap_log_stats: [
    "Search content: `whatap_log_search(keyword)` for specific log entries.",
  ],

  // Alert
  whatap_alerts: [
    "Investigate causes: `whatap_server_cpu`, `whatap_apm_error`, `whatap_k8s_events`, `whatap_db_stat`.",
  ],

  // MXQL
  whatap_mxql_query: [
    "Discover categories: `whatap_list_categories`. Discover fields: `whatap_describe_fields(category)`.",
  ],
};

export function appendNextSteps(text: string, toolName: string): string {
  const steps = NEXT_STEPS[toolName];
  if (!steps || steps.length === 0) return text;
  return (
    text +
    "\n\n---\n**Next steps:**\n" +
    steps.map((s) => `- ${s}`).join("\n")
  );
}

// ---------- No-Data Response ----------

export function buildNoDataResponse(opts: {
  toolName: string;
  projectCode: number;
  timeRange?: string;
  category?: string;
}): McpResponse {
  const lines: string[] = [
    "No data found for the specified parameters.",
    "",
    "**Possible causes:**",
    '- Time range may be too narrow — try "1h" or "6h".',
  ];
  if (opts.category) {
    lines.push(
      `- Category "${opts.category}" may not apply to this project type.`
    );
  }
  lines.push("- Project may not have active agents sending data.");
  lines.push(
    "",
    "**Suggested next steps:**",
    `- \`whatap_check_availability(projectCode=${opts.projectCode})\` to see which categories have data.`,
    `- \`whatap_list_agents(projectCode=${opts.projectCode})\` to verify agents are active.`
  );
  if (opts.timeRange) {
    lines.push(`- Try a wider time range than "${opts.timeRange}".`);
  }
  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}
