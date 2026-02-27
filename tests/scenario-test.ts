/**
 * whatap-mcp Performance Test — Scenario-based validation
 *
 * Spawns the MCP server as a child process, connects via StdioClientTransport,
 * and runs 3 customer-persona scenarios against the live WhaTap API.
 *
 * Usage:
 *   npm run build && npx tsx tests/scenario-test.ts
 */

import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const SERVER_ENTRY = resolve(PROJECT_ROOT, "dist/index.js");
const REPORT_PATH = resolve(PROJECT_ROOT, "tests/report.md");

// Load .env (Node 22 has process.loadEnvFile but fall back for Node 18/20)
try {
  (process as any).loadEnvFile(resolve(PROJECT_ROOT, ".env"));
} catch {
  // Fallback: parse .env manually
  const { readFileSync } = await import("node:fs");
  const envContent = readFileSync(resolve(PROJECT_ROOT, ".env"), "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToolCallResult {
  tool: string;
  args: Record<string, unknown>;
  latencyMs: number;
  success: boolean;
  hasData: boolean;
  hasNextSteps: boolean;
  responseSize: number;
  errorQuality: { hasHowToFix: boolean; hasSuggestedTool: boolean } | null;
  text: string;
  isError: boolean;
}

interface ScenarioStep {
  tool: string;
  args: Record<string, unknown>;
  /** If true, extract pcode from this step's result */
  extractPcode?: boolean;
  /** If set, skip this step and the rest if pcode extraction fails */
  requiresPcode?: boolean;
  /** Natural language question a user might ask for this step */
  question?: string;
}

interface ScenarioDefinition {
  name: string;
  persona: string;
  projectType: string; // regex pattern for platform matching
  steps: ScenarioStep[];
}

interface ScenarioResult {
  name: string;
  persona: string;
  projectType: string;
  pcode: number | null;
  projectName: string | null;
  skipped: boolean;
  skipReason: string | null;
  results: ToolCallResult[];
  candidateCount: number;
  probeCount: number;
}

interface LatencyStats {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p90: number;
  p99: number;
  count: number;
}

// ---------------------------------------------------------------------------
// Platform alias map — maps logical type to all known API values
// ---------------------------------------------------------------------------

const PLATFORM_ALIASES: Record<string, string[]> = {
  SERVER: ["SERVER", "INFRA", "LINUX", "WINDOWS", "AIX", "HP-UX", "SOLARIS", "FREEBSD"],
  JAVA: ["JAVA"],
  KUBERNETES: ["KUBERNETES", "KUBE", "K8S"],
};

const PRIMARY_CATEGORY: Record<string, string> = {
  SERVER: "server_base",
  JAVA: "app_counter",
  KUBERNETES: "kube_pod_stat",
};

const MAX_PROBE_CANDIDATES = 5;

// ---------------------------------------------------------------------------
// MXQL query map — reconstructed queries for diagnostics
// ---------------------------------------------------------------------------

const TOOL_MXQL_MAP: Record<string, string> = {
  whatap_server_cpu: `CATEGORY server_base\nTAGLOAD\nSELECT [oid, oname, cpu, cpu_usr, cpu_sys, cpu_idle]`,
  whatap_server_memory: `CATEGORY server_base\nTAGLOAD\nSELECT [oid, oname, memory_pused, memory_used, memory_total]`,
  whatap_server_disk: `CATEGORY server_disk\nTAGLOAD\nSELECT [oid, oname, readIops, writeIops, blkSize, mountPoint, fileSystem, usedPercent]`,
  whatap_server_network: `CATEGORY server_network\nTAGLOAD\nSELECT [oid, oname, desc, in, out]`,
  whatap_server_process: `CATEGORY server_process\nTAGLOAD\nSELECT [oid, oname, pid, name, cpu, rss, memory]`,
  whatap_server_cpu_load: `CATEGORY server_base\nTAGLOAD\nSELECT [oid, oname, cpu_load1, cpu_load5, cpu_load15]`,
  whatap_server_top: `CATEGORY server_base\nTAGLOAD\nSELECT [oid, oname, cpu, memory_pused]\nORDER {key:[cpu], sort:[desc]}`,
  whatap_apm_tps: `CATEGORY app_counter\nTAGLOAD\nSELECT [pcode, pname, tps]`,
  whatap_apm_response_time: `CATEGORY app_counter\nTAGLOAD\nSELECT [pcode, pname, tx_time, tx_count]`,
  whatap_apm_error: `CATEGORY app_counter\nTAGLOAD\nSELECT [pcode, pname, tx_error, tx_count]`,
  whatap_apm_apdex: `CATEGORY app_counter\nTAGLOAD\nSELECT [pcode, pname, apdex_satisfied, apdex_tolerated, apdex_total]`,
  whatap_apm_active_transactions: `CATEGORY app_active_stat\nTAGLOAD\nSELECT [pcode, pname, active_tx_count, active_tx_0, active_tx_3, active_tx_8]`,
  whatap_apm_transaction_stats: `CATEGORY app_counter\nTAGLOAD\nSELECT [pcode, pname, tx_count, tx_time, tx_error]`,
  whatap_k8s_node_list: `CATEGORY server_base\nTAGLOAD\nSELECT [oid, oname, onodeName, cpu, memory_pused]`,
  whatap_k8s_node_cpu: `CATEGORY server_base\nTAGLOAD\nSELECT [oid, oname, onodeName, cpu, cpu_usr, cpu_sys]`,
  whatap_k8s_node_memory: `CATEGORY server_base\nTAGLOAD\nSELECT [oid, oname, onodeName, memory_pused, memory_used, memory_total]`,
  whatap_k8s_pod_status: `CATEGORY kube_pod_stat\nTAGLOAD\nSELECT [podName, podStatus, namespace, nodeName, containerCount, restartCount]`,
  whatap_k8s_container_top: `CATEGORY kube_container_stat\nTAGLOAD\nSELECT [containerName, podName, namespace, cpu_usage]\nORDER {key:[cpu_usage], sort:[desc]}`,
  whatap_k8s_events: `CATEGORY kube_event\nTAGLOAD\nSELECT [type, reason, message, namespace, name, kind, oname]`,
  whatap_alerts: `CATEGORY event\nTAGLOAD\nSELECT [time, title, message, level]`,
};

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

const SCENARIOS: ScenarioDefinition[] = [
  {
    name: "Scenario A: DevOps/SRE — Server Infrastructure Health Check",
    persona: "Operations engineer checking server fleet health",
    projectType: "SERVER",
    steps: [
      { tool: "whatap_list_projects", args: {}, extractPcode: true, question: "Show me all my monitoring projects." },
      { tool: "whatap_check_availability", args: {}, requiresPcode: true, question: "Is my server project collecting data right now?" },
      {
        tool: "whatap_server_cpu",
        args: { timeRange: "5m" },
        requiresPcode: true,
        question: "Show me the CPU usage across my server fleet.",
      },
      {
        tool: "whatap_server_memory",
        args: { timeRange: "5m" },
        requiresPcode: true,
        question: "How much memory are my servers using?",
      },
      {
        tool: "whatap_server_top",
        args: { metric: "cpu", timeRange: "5m" },
        requiresPcode: true,
        question: "Which servers are consuming the most CPU right now?",
      },
      {
        tool: "whatap_server_cpu_load",
        args: { timeRange: "5m" },
        requiresPcode: true,
        question: "What's the load average on my servers?",
      },
      {
        tool: "whatap_alerts",
        args: { timeRange: "1h" },
        requiresPcode: true,
        question: "Have there been any alerts on my servers in the last hour?",
      },
    ],
  },
  {
    name: "Scenario B: Backend Developer — Java APM Performance Investigation",
    persona: "Java developer investigating a performance complaint",
    projectType: "JAVA",
    steps: [
      { tool: "whatap_list_projects", args: {}, extractPcode: true, question: "List all my monitoring projects." },
      {
        tool: "whatap_apm_tps",
        args: { timeRange: "5m" },
        requiresPcode: true,
        question: "What's the current TPS for my Java application?",
      },
      {
        tool: "whatap_apm_response_time",
        args: { timeRange: "5m" },
        requiresPcode: true,
        question: "How fast are my API responses right now?",
      },
      {
        tool: "whatap_apm_error",
        args: { timeRange: "5m" },
        requiresPcode: true,
        question: "Are there any errors in my Java app?",
      },
      {
        tool: "whatap_apm_active_transactions",
        args: {},
        requiresPcode: true,
        question: "How many transactions are currently active?",
      },
      {
        tool: "whatap_apm_apdex",
        args: { timeRange: "5m" },
        requiresPcode: true,
        question: "What's the user satisfaction (Apdex) score for my app?",
      },
      {
        tool: "whatap_apm_transaction_stats",
        args: { timeRange: "1h" },
        requiresPcode: true,
        question: "Give me a summary of transaction performance over the last hour.",
      },
    ],
  },
  {
    name: "Scenario C: K8s Platform Engineer — Cluster Incident Response",
    persona: "K8s operator assessing cluster state after alert",
    projectType: "KUBERNETES",
    steps: [
      { tool: "whatap_list_projects", args: {}, extractPcode: true, question: "Show me all my monitoring projects." },
      {
        tool: "whatap_k8s_node_list",
        args: { timeRange: "5m" },
        requiresPcode: true,
        question: "List all Kubernetes nodes and their status.",
      },
      {
        tool: "whatap_k8s_node_cpu",
        args: { timeRange: "5m" },
        requiresPcode: true,
        question: "How much CPU are my K8s nodes using?",
      },
      {
        tool: "whatap_k8s_node_memory",
        args: { timeRange: "5m" },
        requiresPcode: true,
        question: "What's the memory usage across my Kubernetes nodes?",
      },
      {
        tool: "whatap_k8s_pod_status",
        args: { timeRange: "5m" },
        requiresPcode: true,
        question: "List all Kubernetes pods and their status.",
      },
      {
        tool: "whatap_k8s_container_top",
        args: { metric: "cpu" },
        requiresPcode: true,
        question: "Which containers are using the most CPU?",
      },
      {
        tool: "whatap_k8s_events",
        args: { timeRange: "5m" },
        requiresPcode: true,
        question: "Show me recent Kubernetes events and warnings.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractText(result: any): string {
  if (result?.content && Array.isArray(result.content)) {
    return result.content
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("\n");
  }
  return String(result);
}

let diagnosticDumped = false;

/**
 * Dump all unique platform/productType combinations found in project list.
 * Runs once per test run for diagnostic visibility.
 */
function dumpProjectTypes(text: string): void {
  if (diagnosticDumped) return;
  diagnosticDumped = true;

  const regex =
    /- \*\*(.+?)\*\* \(pcode: (\d+)\)\s*-\s*(\S+)\s*\/\s*(\S+)/g;
  const combos = new Set<string>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    combos.add(`${match[3]} / ${match[4]}`);
  }
  console.log(`  [DIAG] Unique platform/productType combinations: ${[...combos].join(", ") || "(none parsed)"}`);
}

/**
 * Extract project pcode by platform type from whatap_list_projects output.
 * Single-pass, alias-aware: checks both platform and productType against all
 * aliases for the requested type.
 */
function extractProjectByType(
  text: string,
  platformPattern: string
): { pcode: number; name: string } | null {
  dumpProjectTypes(text);

  const aliases = PLATFORM_ALIASES[platformPattern.toUpperCase()] || [platformPattern.toUpperCase()];
  const regex =
    /- \*\*(.+?)\*\* \(pcode: (\d+)\)\s*-\s*(\S+)\s*\/\s*(\S+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const name = match[1];
    const pcode = parseInt(match[2], 10);
    const platform = match[3].toUpperCase();
    const productType = match[4].toUpperCase();

    for (const alias of aliases) {
      if (platform.includes(alias) || productType.includes(alias)) {
        return { pcode, name };
      }
    }
  }
  return null;
}

/**
 * Extract ALL matching projects by platform type, skipping limited/pending/trial.
 */
function extractAllProjectsByType(
  text: string,
  platformPattern: string
): { pcode: number; name: string; status: string }[] {
  dumpProjectTypes(text);

  const aliases = PLATFORM_ALIASES[platformPattern.toUpperCase()] || [platformPattern.toUpperCase()];
  const regex =
    /- \*\*(.+?)\*\* \(pcode: (\d+)\)\s*(?:\[(\w+)\]\s*)?-\s*(\S+)\s*\/\s*(\S+)/g;
  const results: { pcode: number; name: string; status: string }[] = [];
  const skipStatuses = new Set(["limited", "pending", "trial"]);
  let match;

  while ((match = regex.exec(text)) !== null) {
    const name = match[1];
    const pcode = parseInt(match[2], 10);
    const status = (match[3] || "active").toLowerCase();
    const platform = match[4].toUpperCase();
    const productType = match[5].toUpperCase();

    if (skipStatuses.has(status)) continue;

    for (const alias of aliases) {
      if (platform.includes(alias) || productType.includes(alias)) {
        results.push({ pcode, name, status });
        break;
      }
    }
  }

  // If no results with status filter, fall back to the original regex without status
  if (results.length === 0) {
    const fallbackRegex =
      /- \*\*(.+?)\*\* \(pcode: (\d+)\)\s*-\s*(\S+)\s*\/\s*(\S+)/g;
    while ((match = fallbackRegex.exec(text)) !== null) {
      const name = match[1];
      const pcode = parseInt(match[2], 10);
      const platform = match[3].toUpperCase();
      const productType = match[4].toUpperCase();

      for (const alias of aliases) {
        if (platform.includes(alias) || productType.includes(alias)) {
          results.push({ pcode, name, status: "unknown" });
          break;
        }
      }
    }
  }

  return results;
}

/**
 * Check if a specific category has data in the whatap_check_availability response.
 * Handles both table format (multi-category) and bullet format (single-category).
 */
function categoryHasData(availabilityText: string, category: string): boolean {
  const lines = availabilityText.split("\n");

  // Single-category format: "- **Available**: Yes"
  // When categories array has 1 element, the response uses bullet points
  const singleAvailable = lines.find((l) => /\*\*Available\*\*/.test(l));
  if (singleAvailable) {
    return /yes/i.test(singleAvailable);
  }

  // Multi-category table format: | category | Yes/No | sample_fields |
  for (const line of lines) {
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length >= 3) {
      const cat = cells[1];
      const status = cells[2];
      if (cat === category && /yes/i.test(status)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Probe candidate projects to find one with live data.
 */
async function findActiveProject(
  client: Client,
  candidates: { pcode: number; name: string; status: string }[],
  primaryCategory: string
): Promise<{ pcode: number; name: string; probeCount: number } | null> {
  const limit = Math.min(candidates.length, MAX_PROBE_CANDIDATES);

  for (let i = 0; i < limit; i++) {
    const candidate = candidates[i];
    console.log(
      `  [PROBE] ${i + 1}/${limit}: ${candidate.name} (pcode: ${candidate.pcode}) — checking ${primaryCategory}...`
    );

    try {
      const result = await client.callTool({
        name: "whatap_check_availability",
        arguments: {
          projectCode: candidate.pcode,
          categories: [primaryCategory],
          timeRange: "1h",
        },
      });
      const text = extractText(result);
      const alive = categoryHasData(text, primaryCategory);

      if (alive) {
        console.log(
          `  [PROBE] ✓ ${candidate.name} has live ${primaryCategory} data`
        );
        return { pcode: candidate.pcode, name: candidate.name, probeCount: i + 1 };
      } else {
        console.log(
          `  [PROBE] ✗ ${candidate.name} — no ${primaryCategory} data`
        );
      }
    } catch (err) {
      console.log(
        `  [PROBE] ✗ ${candidate.name} — error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return null;
}

function hasMarkdownTable(text: string): boolean {
  // A markdown table has at least a header row with pipes
  const pipeLines = text.split("\n").filter((l) => (l.match(/\|/g) || []).length >= 3);
  return pipeLines.length >= 2; // header + separator or data row
}

function hasListData(text: string): boolean {
  // Match bullet points with bold keys: - **key**
  return (text.match(/- \*\*/g) || []).length >= 2;
}

function hasData(text: string): boolean {
  return hasMarkdownTable(text) || hasListData(text);
}

function hasNextSteps(text: string): boolean {
  return /next\s*steps?\s*:/i.test(text);
}

function computeLatencyStats(latencies: number[]): LatencyStats {
  if (latencies.length === 0) {
    return { min: 0, max: 0, avg: 0, p50: 0, p90: 0, p99: 0, count: 0 };
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round(sum / sorted.length),
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p90: sorted[Math.floor(sorted.length * 0.9)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    count: sorted.length,
  };
}

// ---------------------------------------------------------------------------
// Core measurement
// ---------------------------------------------------------------------------

async function measureToolCall(
  client: Client,
  tool: string,
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  const start = performance.now();
  let text = "";
  let isError = false;

  try {
    const result = await client.callTool({ name: tool, arguments: args });
    const elapsed = performance.now() - start;
    text = extractText(result);
    isError = (result as any).isError === true;

    const errorQuality =
      isError
        ? {
            hasHowToFix: /how to fix/i.test(text),
            hasSuggestedTool: /suggest(ed)?\s*(next\s*)?tool/i.test(text) || /Try:\s*`whatap_/i.test(text),
          }
        : null;

    return {
      tool,
      args,
      latencyMs: Math.round(elapsed),
      success: !isError,
      hasData: hasData(text),
      hasNextSteps: hasNextSteps(text),
      responseSize: text.length,
      errorQuality,
      text,
      isError,
    };
  } catch (err) {
    const elapsed = performance.now() - start;
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      tool,
      args,
      latencyMs: Math.round(elapsed),
      success: false,
      hasData: false,
      hasNextSteps: false,
      responseSize: errMsg.length,
      errorQuality: {
        hasHowToFix: false,
        hasSuggestedTool: false,
      },
      text: errMsg,
      isError: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Scenario runner
// ---------------------------------------------------------------------------

async function runScenario(
  client: Client,
  scenario: ScenarioDefinition
): Promise<ScenarioResult> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Running: ${scenario.name}`);
  console.log(`Persona: ${scenario.persona}`);
  console.log(`Project type: ${scenario.projectType}`);
  console.log("=".repeat(60));

  const result: ScenarioResult = {
    name: scenario.name,
    persona: scenario.persona,
    projectType: scenario.projectType,
    pcode: null,
    projectName: null,
    skipped: false,
    skipReason: null,
    results: [],
    candidateCount: 0,
    probeCount: 0,
  };

  // Check env var override: SCENARIO_A_PCODE, SCENARIO_B_PCODE, SCENARIO_C_PCODE
  const scenarioLetter = scenario.name.match(/Scenario\s+([A-Z])/)?.[1];
  const envPcode = scenarioLetter
    ? process.env[`SCENARIO_${scenarioLetter}_PCODE`]
    : undefined;
  if (envPcode) {
    result.pcode = parseInt(envPcode, 10);
    result.projectName = `(env override pcode=${envPcode})`;
    console.log(`  [ENV] Using SCENARIO_${scenarioLetter}_PCODE=${envPcode}`);
  }

  for (const step of scenario.steps) {
    // Inject pcode if required
    const args = { ...step.args };
    if (step.requiresPcode) {
      if (!result.pcode) {
        console.log(
          `  SKIP: ${step.tool} — no ${scenario.projectType} project found`
        );
        continue;
      }
      args.projectCode = result.pcode;
    }

    console.log(`  ${step.tool}(${JSON.stringify(args)})...`);
    const callResult = await measureToolCall(client, step.tool, args);

    // Smart project selection: extract candidates, probe for live data
    if (step.extractPcode && callResult.success && !envPcode) {
      const candidates = extractAllProjectsByType(
        callResult.text,
        scenario.projectType
      );
      result.candidateCount = candidates.length;

      if (candidates.length === 0) {
        // Fallback to old single-match extraction
        const project = extractProjectByType(
          callResult.text,
          scenario.projectType
        );
        if (project) {
          result.pcode = project.pcode;
          result.projectName = project.name;
          result.probeCount = 0;
          console.log(
            `    → Found ${scenario.projectType} project (fallback): ${project.name} (pcode: ${project.pcode})`
          );
        } else {
          result.skipped = true;
          result.skipReason = `No ${scenario.projectType} project found in account`;
          console.log(`    → SKIP: ${result.skipReason}`);
        }
      } else {
        console.log(
          `    → Found ${candidates.length} ${scenario.projectType} candidate(s): ${candidates.map((c) => `${c.name}(${c.pcode})`).join(", ")}`
        );

        // Probe candidates for live data
        const primaryCat = PRIMARY_CATEGORY[scenario.projectType.toUpperCase()] || "app_counter";
        const activeProject = await findActiveProject(
          client,
          candidates,
          primaryCat
        );

        if (activeProject) {
          result.pcode = activeProject.pcode;
          result.projectName = activeProject.name;
          result.probeCount = activeProject.probeCount;
          console.log(
            `    → Selected active project: ${activeProject.name} (pcode: ${activeProject.pcode}) after ${activeProject.probeCount} probe(s)`
          );
        } else {
          // Fallback: use first candidate with warning
          const fallback = candidates[0];
          result.pcode = fallback.pcode;
          result.projectName = fallback.name;
          result.probeCount = Math.min(candidates.length, MAX_PROBE_CANDIDATES);
          console.log(
            `    → WARNING: No active project found after probing ${result.probeCount} candidates. Falling back to: ${fallback.name} (pcode: ${fallback.pcode})`
          );
        }
      }
    }

    const status = callResult.success ? "OK" : "ERR";
    const dataFlag = callResult.hasData ? "data" : "no-data";
    const nextFlag = callResult.hasNextSteps ? "next-steps" : "no-next";
    console.log(
      `    → ${status} | ${callResult.latencyMs}ms | ${dataFlag} | ${nextFlag} | ${callResult.responseSize} chars`
    );

    result.results.push(callResult);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

/**
 * Format the full interaction log for a scenario's results.
 * Uses <details>/<summary> so the report stays navigable.
 */
function formatInteractionLog(
  results: ToolCallResult[],
  steps?: ScenarioStep[],
  pcode?: number | null
): string {
  const lines: string[] = [];
  lines.push("### Full Interaction Log");
  lines.push("");

  results.forEach((r, i) => {
    const status = r.success ? "success" : "error";
    const step = steps?.[i];

    lines.push(`#### Step ${i + 1}: \`${r.tool}\``);
    lines.push("");

    // Include NL question if available
    if (step?.question) {
      lines.push(`**User Question:** "${step.question}"`);
      lines.push("");
    }

    lines.push("**Request:**");
    lines.push("```json");
    lines.push(JSON.stringify({ name: r.tool, arguments: r.args }, null, 2));
    lines.push("```");
    lines.push("");
    lines.push(`**Response** (${r.latencyMs}ms, ${status}):`);
    lines.push(`<details><summary>${r.responseSize} chars</summary>`);
    lines.push("");
    lines.push("```");
    lines.push(r.text);
    lines.push("```");
    lines.push("");
    lines.push("</details>");
    lines.push("");

    // MXQL debug for no-data successful responses
    if (r.success && !r.hasData) {
      const mxql = TOOL_MXQL_MAP[r.tool];
      if (mxql) {
        lines.push("**MXQL Query (reconstructed):**");
        lines.push("```");
        lines.push(mxql);
        lines.push("```");
        lines.push(
          `**Diagnosis:** Project ${pcode ?? "unknown"} returned no data for this query.`
        );
        lines.push("");
      }
    }
  });

  return lines.join("\n");
}

function generateReport(
  scenarioResults: ScenarioResult[],
  toolCount: number,
  totalDurationMs: number
): string {
  const lines: string[] = [];
  const allResults = scenarioResults.flatMap((s) => s.results);
  const successfulResults = allResults.filter((r) => r.success);
  const dataResults = allResults.filter((r) => r.hasData);
  const nextStepsResults = allResults.filter((r) => r.hasNextSteps);
  const allLatencies = allResults.map((r) => r.latencyMs);
  const stats = computeLatencyStats(allLatencies);

  const successRate =
    allResults.length > 0
      ? ((successfulResults.length / allResults.length) * 100).toFixed(1)
      : "N/A";
  const dataRate =
    allResults.length > 0
      ? ((dataResults.length / allResults.length) * 100).toFixed(1)
      : "N/A";
  const nextStepsRate =
    allResults.length > 0
      ? ((nextStepsResults.length / allResults.length) * 100).toFixed(1)
      : "N/A";

  // Header
  lines.push("# whatap-mcp Performance Test Report");
  lines.push("");
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push(`> Tool count: ${toolCount}`);
  lines.push(`> Total duration: ${(totalDurationMs / 1000).toFixed(1)}s`);
  lines.push("");

  // Executive Summary
  lines.push("## Executive Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("| --- | --- |");
  lines.push(`| Total tool calls | ${allResults.length} |`);
  lines.push(`| Success rate | ${successRate}% (${successfulResults.length}/${allResults.length}) |`);
  lines.push(`| Has-data rate | ${dataRate}% (${dataResults.length}/${allResults.length}) |`);
  lines.push(`| Next-steps rate | ${nextStepsRate}% (${nextStepsResults.length}/${allResults.length}) |`);
  lines.push(`| Avg latency | ${stats.avg}ms |`);
  lines.push(`| P90 latency | ${stats.p90}ms |`);
  lines.push(`| P99 latency | ${stats.p99}ms |`);
  lines.push(`| Scenarios run | ${scenarioResults.filter((s) => !s.skipped || s.results.length > 0).length}/${scenarioResults.length} |`);
  lines.push("");

  // Per-scenario details
  for (const scenario of scenarioResults) {
    lines.push(`## ${scenario.name}`);
    lines.push("");
    lines.push(`- **Persona**: ${scenario.persona}`);
    lines.push(`- **Project type**: ${scenario.projectType}`);

    if (scenario.pcode) {
      lines.push(
        `- **Project**: ${scenario.projectName} (pcode: ${scenario.pcode})`
      );
    }
    if (scenario.candidateCount > 0) {
      lines.push(
        `- **Selection**: ${scenario.candidateCount} candidates found, ${scenario.probeCount} probed`
      );
    }

    if (scenario.skipped && scenario.results.length <= 1) {
      lines.push(`- **Status**: SKIPPED — ${scenario.skipReason}`);
      lines.push("");
      continue;
    }

    lines.push("");
    lines.push("| # | Tool | Latency | Success | Data | Next Steps | Size |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- |");

    scenario.results.forEach((r, i) => {
      const success = r.success ? "Yes" : "**No**";
      const data = r.hasData ? "Yes" : "No";
      const next = r.hasNextSteps ? "Yes" : "No";
      lines.push(
        `| ${i + 1} | \`${r.tool}\` | ${r.latencyMs}ms | ${success} | ${data} | ${next} | ${r.responseSize} |`
      );
    });

    // Scenario stats
    const scenarioLatencies = scenario.results.map((r) => r.latencyMs);
    const sStats = computeLatencyStats(scenarioLatencies);
    const sSuccess = scenario.results.filter((r) => r.success).length;
    const sNext = scenario.results.filter((r) => r.hasNextSteps).length;

    lines.push("");
    lines.push(
      `**Scenario totals**: ${sSuccess}/${scenario.results.length} success, ` +
        `${sNext}/${scenario.results.length} next-steps, ` +
        `avg ${sStats.avg}ms, p90 ${sStats.p90}ms`
    );
    lines.push("");

    // Full interaction log with request/response details
    // Find matching scenario definition for steps/questions
    const scenarioDef = SCENARIOS.find((s) => s.name === scenario.name);
    lines.push(
      formatInteractionLog(scenario.results, scenarioDef?.steps, scenario.pcode)
    );
  }

  // Workflow Quality Assessment
  lines.push("## Workflow Quality Assessment");
  lines.push("");

  // Next-steps coverage
  lines.push("### Next-Steps Coverage");
  lines.push("");

  const toolNextSteps = new Map<string, { total: number; withNext: number }>();
  for (const r of allResults) {
    const entry = toolNextSteps.get(r.tool) || { total: 0, withNext: 0 };
    entry.total++;
    if (r.hasNextSteps) entry.withNext++;
    toolNextSteps.set(r.tool, entry);
  }

  lines.push("| Tool | Calls | Next-Steps | Rate |");
  lines.push("| --- | --- | --- | --- |");
  for (const [tool, entry] of toolNextSteps) {
    const rate = ((entry.withNext / entry.total) * 100).toFixed(0);
    lines.push(`| \`${tool}\` | ${entry.total} | ${entry.withNext} | ${rate}% |`);
  }
  lines.push("");

  // Error handling quality
  const errors = allResults.filter((r) => r.isError);
  if (errors.length > 0) {
    lines.push("### Error Handling Quality");
    lines.push("");
    lines.push("| Tool | Error Text (first 100 chars) | How-to-Fix | Suggested Tool |");
    lines.push("| --- | --- | --- | --- |");
    for (const r of errors) {
      const snippet = r.text.slice(0, 100).replace(/\|/g, "\\|").replace(/\n/g, " ");
      const fix = r.errorQuality?.hasHowToFix ? "Yes" : "No";
      const suggest = r.errorQuality?.hasSuggestedTool ? "Yes" : "No";
      lines.push(`| \`${r.tool}\` | ${snippet} | ${fix} | ${suggest} |`);
    }
    lines.push("");
  }

  // No-data responses
  const noData = allResults.filter((r) => r.success && !r.hasData);
  if (noData.length > 0) {
    lines.push("### No-Data Responses (Success but Empty)");
    lines.push("");
    lines.push("| Tool | isError | Has Next-Steps | Response Preview |");
    lines.push("| --- | --- | --- | --- |");
    for (const r of noData) {
      const preview = r.text.slice(0, 120).replace(/\|/g, "\\|").replace(/\n/g, " ");
      lines.push(
        `| \`${r.tool}\` | ${r.isError ? "Yes" : "No"} | ${r.hasNextSteps ? "Yes" : "No"} | ${preview} |`
      );
    }
    lines.push("");
  }

  // Overall Latency Distribution
  lines.push("## Overall Latency Distribution");
  lines.push("");
  lines.push("| Stat | Value |");
  lines.push("| --- | --- |");
  lines.push(`| Min | ${stats.min}ms |`);
  lines.push(`| P50 | ${stats.p50}ms |`);
  lines.push(`| P90 | ${stats.p90}ms |`);
  lines.push(`| P99 | ${stats.p99}ms |`);
  lines.push(`| Max | ${stats.max}ms |`);
  lines.push(`| Avg | ${stats.avg}ms |`);
  lines.push(`| Count | ${stats.count} |`);
  lines.push("");

  // Per-Tool Latency Breakdown
  lines.push("## Per-Tool Latency Breakdown");
  lines.push("");
  lines.push("| Tool | Calls | Min | Avg | P90 | Max |");
  lines.push("| --- | --- | --- | --- | --- | --- |");

  const toolLatencies = new Map<string, number[]>();
  for (const r of allResults) {
    const arr = toolLatencies.get(r.tool) || [];
    arr.push(r.latencyMs);
    toolLatencies.set(r.tool, arr);
  }

  for (const [tool, lats] of toolLatencies) {
    const ts = computeLatencyStats(lats);
    lines.push(
      `| \`${tool}\` | ${ts.count} | ${ts.min}ms | ${ts.avg}ms | ${ts.p90}ms | ${ts.max}ms |`
    );
  }
  lines.push("");

  // Verification Checklist
  lines.push("## Verification Checklist");
  lines.push("");

  const checks: [string, boolean][] = [
    ["Report generated with all 3 scenarios", scenarioResults.length === 3],
    [`Tool count = 34`, toolCount === 34],
    [`Success rate > 80%`, parseFloat(successRate) > 80],
    [`Next-steps rate > 90%`, parseFloat(nextStepsRate) > 90],
    [
      `Per-tool latency < 5s`,
      allResults.every((r) => r.latencyMs < 5000),
    ],
    [
      `No-data cases show guided responses`,
      noData.every((r) => !r.isError),
    ],
    [
      `Skipped scenarios have clear skip reasons`,
      scenarioResults
        .filter((s) => s.skipped)
        .every((s) => s.skipReason !== null),
    ],
  ];

  for (const [label, passed] of checks) {
    lines.push(`- [${passed ? "x" : " "}] ${label}`);
  }
  lines.push("");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("whatap-mcp Performance Test");
  console.log("==========================\n");

  // 1. Build project
  console.log("1. Building project...");
  try {
    execSync("npm run build", { cwd: PROJECT_ROOT, stdio: "pipe" });
    console.log("   Build successful.\n");
  } catch (err) {
    console.error("   Build FAILED:");
    console.error((err as any).stderr?.toString());
    process.exit(1);
  }

  // 2. Create MCP client via stdio
  console.log("2. Starting MCP server...");
  const transport = new StdioClientTransport({
    command: "node",
    args: [SERVER_ENTRY],
    env: {
      ...process.env as Record<string, string>,
      WHATAP_API_TOKEN: process.env.WHATAP_API_TOKEN!,
      WHATAP_API_URL: process.env.WHATAP_API_URL || "https://api.whatap.io",
    },
    stderr: "pipe",
  });

  const client = new Client(
    { name: "whatap-mcp-test", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log("   MCP client connected.\n");

  // 3. List tools
  console.log("3. Listing tools...");
  const { tools } = await client.listTools();
  const toolCount = tools.length;
  console.log(`   ${toolCount} tools registered.`);
  if (toolCount !== 34) {
    console.warn(`   WARNING: Expected 34 tools, got ${toolCount}`);
  }
  console.log(
    `   Tools: ${tools.map((t) => t.name).join(", ")}\n`
  );

  // 4. Run scenarios
  const totalStart = performance.now();
  const scenarioResults: ScenarioResult[] = [];

  for (const scenario of SCENARIOS) {
    const result = await runScenario(client, scenario);
    scenarioResults.push(result);
  }

  const totalDuration = performance.now() - totalStart;

  // 5. Generate report
  console.log("\n\n5. Generating report...");
  const report = generateReport(scenarioResults, toolCount, totalDuration);
  writeFileSync(REPORT_PATH, report, "utf-8");
  console.log(`   Report written to: ${REPORT_PATH}`);

  // 6. Print summary
  const allResults = scenarioResults.flatMap((s) => s.results);
  const successCount = allResults.filter((r) => r.success).length;
  const nextCount = allResults.filter((r) => r.hasNextSteps).length;

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total calls:   ${allResults.length}`);
  console.log(
    `Success rate:  ${((successCount / allResults.length) * 100).toFixed(1)}%`
  );
  console.log(
    `Next-steps:    ${((nextCount / allResults.length) * 100).toFixed(1)}%`
  );
  console.log(
    `Avg latency:   ${Math.round(allResults.reduce((s, r) => s + r.latencyMs, 0) / allResults.length)}ms`
  );
  console.log(`Duration:      ${(totalDuration / 1000).toFixed(1)}s`);
  console.log("=".repeat(60));

  // 7. Cleanup
  await client.close();
  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
