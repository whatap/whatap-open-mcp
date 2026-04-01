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

export function buildNoDataResponse(opts: {
  toolName: string;
  projectCode: number;
  timeRange?: string;
  category?: string;
}): McpResponse {
  const lines: string[] = ["**No data found.**", ""];

  // List possible causes without picking one confidently
  lines.push("**Possible causes:**");
  if (opts.category) {
    const expectedPlatform = CATEGORY_PLATFORMS[opts.category];
    if (expectedPlatform) {
      lines.push(
        `- Project type mismatch — \`${opts.category}\` is typically used by ${expectedPlatform} projects.`
      );
    }
  }
  lines.push(
    "- Time range may be too narrow or no data was collected in this window.",
    "- No active agents sending data for this category."
  );
  lines.push("");

  lines.push("**Recovery steps:**");
  lines.push(
    `- \`whatap_data_availability(projectCode=${opts.projectCode})\` to see which categories have active data.`
  );
  if (opts.timeRange) {
    lines.push(`- Try a wider time range (current: "${opts.timeRange}").`);
  }
  lines.push(
    `- \`whatap_list_agents(projectCode=${opts.projectCode})\` to verify agents are running.`
  );
  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}
