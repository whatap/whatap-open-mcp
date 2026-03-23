// src/tools/mesh.ts
// Two composite tools that execute multiple MXQL path queries in parallel,
// then analyze and format the combined results.

import { z } from "../mcp/schema.js";
import type { McpServer } from "../mcp/server.js";
import type { WhatapApiClient } from "../api/client.js";
import type { MxqlResult, MxqlRow } from "../api/types.js";
import { parseTimeRange } from "../utils/time.js";
import {
  PARAM_PROJECT_CODE,
  PARAM_TIME_RANGE_OPTIONAL,
  PARAM_SENSITIVITY,
} from "../utils/descriptions.js";
import {
  classifyAndBuildError,
  appendNextSteps,
} from "../utils/response.js";

// ─── Helpers ───────────────────────────────────────────────────

/** Filter out metadata rows (_head_, error) from MXQL path responses. */
function cleanMxqlRows(data: MxqlResult): Record<string, unknown>[] {
  return data.filter(
    (row) => !row["_head_"] && !row["error"]
  ) as Record<string, unknown>[];
}

/** Group rows by a key derived from each row. */
function groupBy<T>(rows: T[], keyFn: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyFn(row);
    const arr = map.get(key);
    if (arr) arr.push(row);
    else map.set(key, [row]);
  }
  return map;
}

/** Compute basic statistics for a numeric array. */
function computeStats(values: number[]): {
  mean: number;
  stddev: number;
  max: number;
  min: number;
} {
  if (values.length === 0) return { mean: 0, stddev: 0, max: 0, min: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);
  return {
    mean,
    stddev,
    max: Math.max(...values),
    min: Math.min(...values),
  };
}

/** Format milliseconds to human-readable string. */
function fmtMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

/** Safely extract a numeric value from an MXQL row field. */
function num(row: Record<string, unknown>, field: string): number {
  const v = row[field];
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

/** Safely extract a string value from an MXQL row field. */
function str(row: Record<string, unknown>, field: string): string {
  const v = row[field];
  return v != null ? String(v) : "";
}

// ─── Sensitivity thresholds ────────────────────────────────────

const SENSITIVITY_FACTOR: Record<string, number> = {
  low: 3.0,
  medium: 2.0,
  high: 1.5,
};

const ERROR_RATE_THRESHOLD: Record<string, number> = {
  low: 0.10,
  medium: 0.05,
  high: 0.02,
};

const ACTIVE_TX_8_THRESHOLD: Record<string, number> = {
  low: 20,
  medium: 10,
  high: 5,
};

// ─── APM Anomaly Analysis ──────────────────────────────────────

interface AnomalyFlag {
  type: string;
  description: string;
  score: number;
}

interface AgentSummary {
  oid: string;
  oname: string;
  tpsAvg: number;
  tpsMax: number;
  respTimeAvg: number;
  respTimeMax: number;
  totalErrors: number;
  activeTx8: number;
  anomalies: AnomalyFlag[];
  totalScore: number;
}

function analyzeApmAnomalies(
  tpsRows: Record<string, unknown>[],
  respRows: Record<string, unknown>[],
  errRows: Record<string, unknown>[],
  actTxRows: Record<string, unknown>[],
  sensitivity: string
): AgentSummary[] {
  const factor = SENSITIVITY_FACTOR[sensitivity] ?? 2.0;
  const errThreshold = ERROR_RATE_THRESHOLD[sensitivity] ?? 0.05;
  const actTxThreshold = ACTIVE_TX_8_THRESHOLD[sensitivity] ?? 10;

  // Group all datasets by oid
  const oidKey = (r: Record<string, unknown>) => String(r["oid"] ?? "unknown");
  const tpsByOid = groupBy(tpsRows, oidKey);
  const respByOid = groupBy(respRows, oidKey);
  const errByOid = groupBy(errRows, oidKey);
  const actTxByOid = groupBy(actTxRows, oidKey);

  // Collect all unique oids
  const allOids = new Set([
    ...tpsByOid.keys(),
    ...respByOid.keys(),
    ...errByOid.keys(),
    ...actTxByOid.keys(),
  ]);

  const summaries: AgentSummary[] = [];

  for (const oid of allOids) {
    if (oid === "unknown") continue;

    const tps = tpsByOid.get(oid) ?? [];
    const resp = respByOid.get(oid) ?? [];
    const err = errByOid.get(oid) ?? [];
    const actTx = actTxByOid.get(oid) ?? [];

    // Resolve oname from any available dataset
    const oname =
      str(tps[0] ?? resp[0] ?? err[0] ?? actTx[0] ?? {}, "oname") || oid;

    // TPS stats
    const tpsValues = tps.map((r) => num(r, "tps"));
    const tpsStats = computeStats(tpsValues);

    // Response time stats
    const respValues = resp.map((r) => num(r, "resp_time"));
    const respStats = computeStats(respValues);

    // Error totals
    const errValues = err.map((r) => num(r, "tx_error"));
    const totalErrors = errValues.reduce((a, b) => a + b, 0);

    // Active TX > 8s
    const activeTx8Values = actTx.map((r) => num(r, "active_tx_8"));
    const maxActiveTx8 =
      activeTx8Values.length > 0 ? Math.max(...activeTx8Values) : 0;

    // Detect anomalies
    const anomalies: AnomalyFlag[] = [];

    // Latency spike
    if (
      respStats.stddev > 0 &&
      respStats.max > respStats.mean + factor * respStats.stddev
    ) {
      const sigma = (respStats.max - respStats.mean) / respStats.stddev;
      anomalies.push({
        type: "Latency spike",
        description: `peak ${fmtMs(respStats.max)} (avg ${fmtMs(respStats.mean)}, +${sigma.toFixed(1)}σ)`,
        score: sigma,
      });
    }

    // Error surge
    const expectedTxCount = tpsValues.reduce((a, b) => a + b, 0);
    const errorRate = expectedTxCount > 0 ? totalErrors / expectedTxCount : 0;
    if (totalErrors > 0 && errorRate > errThreshold) {
      anomalies.push({
        type: "Error surge",
        description: `${(errorRate * 100).toFixed(1)}% error rate (${totalErrors} errors in period)`,
        score: errorRate * 100,
      });
    }

    // Active TX tsunami
    if (maxActiveTx8 > actTxThreshold) {
      anomalies.push({
        type: "Active TX tsunami",
        description: `${maxActiveTx8} transactions > 8s`,
        score: maxActiveTx8,
      });
    }

    // TPS drop
    if (tpsValues.length >= 2 && tpsStats.stddev > 0) {
      const latest = tpsValues[tpsValues.length - 1];
      if (latest < tpsStats.mean - factor * tpsStats.stddev) {
        const sigma = (tpsStats.mean - latest) / tpsStats.stddev;
        anomalies.push({
          type: "TPS drop",
          description: `current ${latest.toFixed(1)} TPS (avg ${tpsStats.mean.toFixed(1)} TPS)`,
          score: sigma,
        });
      }
    }

    const totalScore = anomalies.reduce((a, f) => a + f.score, 0);

    summaries.push({
      oid,
      oname,
      tpsAvg: tpsStats.mean,
      tpsMax: tpsStats.max,
      respTimeAvg: respStats.mean,
      respTimeMax: respStats.max,
      totalErrors,
      activeTx8: maxActiveTx8,
      anomalies,
      totalScore,
    });
  }

  // Sort by anomaly score descending
  summaries.sort((a, b) => b.totalScore - a.totalScore);
  return summaries;
}

// ─── Topology Analysis ─────────────────────────────────────────

interface TopoEdge {
  source: string;
  target: string;
  avgLatency: number;
  totLatency: number;
  callCount: number;
}

interface TopoBottleneck {
  edge: TopoEdge;
  severity: "HIGH" | "MEDIUM";
}

function buildTopology(rows: Record<string, unknown>[]): {
  edges: TopoEdge[];
  bottlenecks: TopoBottleneck[];
  serviceNames: Set<string>;
} {
  const edges: TopoEdge[] = [];
  const serviceNames = new Set<string>();

  for (const row of rows) {
    const nameField = str(row, "_name_");
    if (!nameField) continue;

    // Parse "source->target" pattern
    const parts = nameField.split("->");
    if (parts.length !== 2) continue;

    const source = parts[0].trim();
    const target = parts[1].trim();
    if (!source || !target) continue;

    serviceNames.add(source);
    serviceNames.add(target);

    edges.push({
      source,
      target,
      avgLatency: num(row, "avg_latency"),
      totLatency: num(row, "tot_latency"),
      callCount: num(row, "tcp_row_count"),
    });
  }

  // Sort by avg latency descending
  edges.sort((a, b) => b.avgLatency - a.avgLatency);

  // Detect bottlenecks
  const bottlenecks: TopoBottleneck[] = [];
  for (const edge of edges) {
    if (edge.avgLatency > 1000) {
      bottlenecks.push({ edge, severity: "HIGH" });
    } else if (edge.avgLatency > 500) {
      bottlenecks.push({ edge, severity: "MEDIUM" });
    }
  }

  return { edges, bottlenecks, serviceNames };
}

// ─── Tool Registration ─────────────────────────────────────────

export function registerMeshTools(
  server: McpServer,
  client: WhatapApiClient
): void {
  // ── Tool 1: whatap_apm_anomaly ──

  server.tool(
    "whatap_apm_anomaly",
    "Multi-query APM anomaly detection. Executes 4 MXQL queries in parallel " +
      "(TPS, response time, errors, active transactions per agent), then applies " +
      "statistical analysis to detect latency spikes, error surges, TPS drops, and " +
      "transaction pileups.\n\n" +
      "PREREQUISITES: projectCode from whatap_list_projects (must be an APM project).\n\n" +
      "Example: whatap_apm_anomaly(projectCode=12345, timeRange=\"5m\", sensitivity=\"medium\")",
    {
      projectCode: z.number().describe(PARAM_PROJECT_CODE),
      timeRange: z
        .string()
        .default("5m")
        .describe(PARAM_TIME_RANGE_OPTIONAL),
      sensitivity: z
        .enum(["low", "medium", "high"])
        .default("medium")
        .describe(PARAM_SENSITIVITY),
    },
    async ({ projectCode, timeRange, sensitivity }) => {
      try {
        const { stime, etime } = parseTimeRange(timeRange);
        const base = { stime, etime, limit: 200 };

        // Execute 4 MXQL path queries in parallel
        const [tpsData, respData, errData, actTxData] = await Promise.all([
          client.executeMxqlPath(projectCode, {
            ...base,
            mql: "/v2/app/tps_oid",
          }),
          client.executeMxqlPath(projectCode, {
            ...base,
            mql: "/v2/app/resp_time_oid",
          }),
          client.executeMxqlPath(projectCode, {
            ...base,
            mql: "/v2/app/tx_error_oid",
          }),
          client.executeMxqlPath(projectCode, {
            ...base,
            mql: "/v2/app/act_tx/act_tx_oid",
          }),
        ]);

        const tpsRows = cleanMxqlRows(tpsData);
        const respRows = cleanMxqlRows(respData);
        const errRows = cleanMxqlRows(errData);
        const actTxRows = cleanMxqlRows(actTxData);

        const totalRows =
          tpsRows.length + respRows.length + errRows.length + actTxRows.length;

        if (totalRows === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text:
                  `## APM Anomaly Detection — Project ${projectCode}\n\n` +
                  "**No APM data found.** This project may not be an APM project, " +
                  "or there are no active agents sending data in the specified time range.\n\n" +
                  "**Suggestions:**\n" +
                  `- Verify project type: \`whatap_project_info(projectCode=${projectCode})\`\n` +
                  `- Check data availability: \`whatap_data_availability(projectCode=${projectCode})\`\n` +
                  `- Try a wider time range: \`whatap_apm_anomaly(projectCode=${projectCode}, timeRange="1h")\``,
              },
            ],
          };
        }

        // Analyze
        const summaries = analyzeApmAnomalies(
          tpsRows,
          respRows,
          errRows,
          actTxRows,
          sensitivity
        );

        const anomalyAgents = summaries.filter((s) => s.anomalies.length > 0);

        // Format output
        const lines: string[] = [
          `## APM Anomaly Detection — Project ${projectCode}`,
          "",
          `**Period**: last ${timeRange} | **Sensitivity**: ${sensitivity} | **Agents analyzed**: ${summaries.length}`,
          "",
        ];

        // Anomalies section
        if (anomalyAgents.length > 0) {
          lines.push(`### Anomalies Detected (${anomalyAgents.length})`, "");
          for (const agent of anomalyAgents) {
            lines.push(
              `**${agent.oname}** (oid: ${agent.oid}) — Score: ${agent.totalScore.toFixed(1)}`
            );
            for (const a of agent.anomalies) {
              lines.push(`- ${a.type}: ${a.description}`);
            }
            lines.push("");
          }
        } else {
          lines.push(
            "### No Anomalies Detected",
            "",
            `All ${summaries.length} agents are operating within normal parameters (${sensitivity} sensitivity).`,
            ""
          );
        }

        // Agent summary table
        lines.push(
          "### Agent Summary",
          "",
          "| Agent | TPS (avg) | Resp Time (avg/max) | Errors | Active TX (>8s) |",
          "| --- | --- | --- | --- | --- |"
        );
        for (const s of summaries) {
          const respCol =
            s.respTimeAvg > 0
              ? `${fmtMs(s.respTimeAvg)} / ${fmtMs(s.respTimeMax)}`
              : "—";
          lines.push(
            `| ${s.oname} | ${s.tpsAvg.toFixed(1)} | ${respCol} | ${s.totalErrors} | ${s.activeTx8} |`
          );
        }

        const text = appendNextSteps(lines.join("\n"), "whatap_apm_anomaly");
        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        return classifyAndBuildError(err, {
          toolName: "whatap_apm_anomaly",
          projectCode,
          timeRange,
        });
      }
    }
  );

  // ── Tool 2: whatap_service_topology ──

  server.tool(
    "whatap_service_topology",
    "Service connectivity map with bottleneck detection using NPM (Network Performance Monitoring) data. " +
      "Queries caller→callee edges with latency from the NPM topology endpoint, then builds a service graph " +
      "and identifies high-latency bottlenecks.\n\n" +
      "PREREQUISITES: projectCode from whatap_list_projects (project must have NPM agent installed).\n\n" +
      "Example: whatap_service_topology(projectCode=12345, timeRange=\"1h\")",
    {
      projectCode: z.number().describe(PARAM_PROJECT_CODE),
      timeRange: z
        .string()
        .default("1h")
        .describe(PARAM_TIME_RANGE_OPTIONAL),
    },
    async ({ projectCode, timeRange }) => {
      try {
        const { stime, etime } = parseTimeRange(timeRange);

        const topoData = await client.executeMxqlPath(projectCode, {
          stime,
          etime,
          mql: "/npm/all/topology/app_name_latency",
          limit: 500,
        });

        const rows = cleanMxqlRows(topoData);

        if (rows.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text:
                  `## Service Topology — Project ${projectCode}\n\n` +
                  "**No NPM topology data found.** This could mean:\n" +
                  "- The project does not have an NPM agent installed.\n" +
                  "- No network traffic was captured in the specified time range.\n\n" +
                  "**Suggestions:**\n" +
                  `- Verify project type: \`whatap_project_info(projectCode=${projectCode})\`\n` +
                  `- Check data availability: \`whatap_data_availability(projectCode=${projectCode})\`\n` +
                  `- Try a wider time range: \`whatap_service_topology(projectCode=${projectCode}, timeRange="6h")\`\n` +
                  `- For APM anomaly detection (no NPM needed): \`whatap_apm_anomaly(projectCode=${projectCode})\``,
              },
            ],
          };
        }

        const { edges, bottlenecks, serviceNames } = buildTopology(rows);
        const totalCalls = edges.reduce((a, e) => a + e.callCount, 0);

        const lines: string[] = [
          `## Service Topology — Project ${projectCode}`,
          "",
          `**Period**: last ${timeRange} | **Services**: ${serviceNames.size} | **Connections**: ${edges.length} | **Total Calls**: ${totalCalls.toLocaleString()}`,
          "",
        ];

        // Bottlenecks
        if (bottlenecks.length > 0) {
          lines.push("### Bottlenecks", "");
          for (const b of bottlenecks) {
            lines.push(
              `- **${b.severity}**: ${b.edge.source} → ${b.edge.target} — avg ${fmtMs(b.edge.avgLatency)} (${b.edge.callCount.toLocaleString()} calls)`
            );
          }
          lines.push("");
        } else {
          lines.push(
            "### No Bottlenecks Detected",
            "",
            "All service connections are within normal latency thresholds (<500ms avg).",
            ""
          );
        }

        // Service connections table
        lines.push(
          "### Service Connections",
          "",
          "| Source → Target | Calls | Avg Latency | Total Time |",
          "| --- | --- | --- | --- |"
        );
        for (const e of edges) {
          lines.push(
            `| ${e.source} → ${e.target} | ${e.callCount.toLocaleString()} | ${fmtMs(e.avgLatency)} | ${fmtMs(e.totLatency)} |`
          );
        }

        // Top services by traffic
        const outboundCounts = new Map<string, number>();
        const inboundCounts = new Map<string, number>();
        for (const e of edges) {
          outboundCounts.set(
            e.source,
            (outboundCounts.get(e.source) ?? 0) + e.callCount
          );
          inboundCounts.set(
            e.target,
            (inboundCounts.get(e.target) ?? 0) + e.callCount
          );
        }

        const topServices = [...outboundCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);

        if (topServices.length > 0) {
          lines.push("", "### Top Services by Outbound Traffic", "");
          let rank = 1;
          for (const [name, count] of topServices) {
            lines.push(
              `${rank}. ${name} — ${count.toLocaleString()} outbound calls`
            );
            rank++;
          }
        }

        const text = appendNextSteps(
          lines.join("\n"),
          "whatap_service_topology"
        );
        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        return classifyAndBuildError(err, {
          toolName: "whatap_service_topology",
          projectCode,
          timeRange,
        });
      }
    }
  );
}
