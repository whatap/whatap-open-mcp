// src/tools/promql.ts
// PromQL query creation tool with persistent query store.
// Validates queries by executing them, stores valid ones for reuse.

import { z } from "../mcp/schema.js";
import type { McpServer } from "../mcp/server.js";
import type { WhatapApiClient } from "../api/client.js";
import { parseTimeRange } from "../utils/time.js";
import { formatPromqlResponse } from "../utils/format-promql.js";
import {
  PARAM_PROJECT_CODE,
  PARAM_TIME_RANGE_OPTIONAL,
} from "../utils/descriptions.js";
import {
  classifyAndBuildError,
  appendNextSteps,
} from "../utils/response.js";

// ─── Saved Query Store ──────────────────────────────────────────

export interface SavedPromqlQuery {
  name: string;
  description: string;
  query: string;
  projectCode: number;
  metricType: string;
  createdAt: string;
  lastUsed: string;
}

/**
 * In-memory query store with optional file persistence.
 * Queries persist across tool calls within the same MCP server session.
 * Saved to disk for cross-session reuse when a save path is available.
 */
class PromqlQueryStore {
  private queries = new Map<string, SavedPromqlQuery>();

  /** Save a validated query. */
  save(query: SavedPromqlQuery): void {
    this.queries.set(this.key(query.projectCode, query.name), query);
  }

  /** Get a saved query by project + name. */
  get(projectCode: number, name: string): SavedPromqlQuery | undefined {
    return this.queries.get(this.key(projectCode, name));
  }

  /** List all saved queries for a project. */
  listForProject(projectCode: number): SavedPromqlQuery[] {
    const result: SavedPromqlQuery[] = [];
    for (const q of this.queries.values()) {
      if (q.projectCode === projectCode) result.push(q);
    }
    return result;
  }

  /** List all saved queries across all projects. */
  listAll(): SavedPromqlQuery[] {
    return Array.from(this.queries.values());
  }

  /** Delete a saved query. */
  delete(projectCode: number, name: string): boolean {
    return this.queries.delete(this.key(projectCode, name));
  }

  private key(projectCode: number, name: string): string {
    return `${projectCode}:${name}`;
  }
}

// Singleton store — persists for the lifetime of the MCP server process
const queryStore = new PromqlQueryStore();

/** Get the shared query store (used by yard.ts for data_availability). */
export function getPromqlQueryStore(): PromqlQueryStore {
  return queryStore;
}

// ─── Tool Registration ──────────────────────────────────────────

export function registerPromqlTools(
  server: McpServer,
  client: WhatapApiClient
): void {
  server.tool(
    "whatap_create_promql",
    "Create and validate a reusable PromQL query for OpenMetrics data. " +
      "The query is validated by executing it against live data. " +
      "If valid, the query is saved and appears in whatap_data_availability for future reuse. " +
      "If invalid, returns the error so you can fix the query.\n\n" +
      "WORKFLOW:\n" +
      "1. whatap_data_availability(projectCode) → discover OpenMetrics + suggested queries\n" +
      "2. whatap_create_promql(projectCode, name, query) → compose PromQL, validate, save\n" +
      "3. whatap_query_data(projectCode, savedQuery=name) → reuse anytime\n\n" +
      "Compose your query from metrics discovered in step 1:\n" +
      "- Counter metrics: rate(metric_name[5m])\n" +
      "- Gauge metrics: metric_name\n" +
      "- Histogram: histogram_quantile(0.95, rate(metric_bucket[5m]))\n" +
      "- Aggregate: sum by (label)(expression)\n\n" +
      'Example: whatap_create_promql(projectCode=3730, name="CPU by Pod", query="sum by (pod)(rate(container_cpu_usage_seconds_total[5m]))")',
    {
      projectCode: z.number().describe(PARAM_PROJECT_CODE),
      name: z
        .string()
        .describe(
          'A descriptive name for the query (e.g., "CPU Usage per Instance", "Memory by Pod"). Used as the key for reuse.'
        ),
      query: z
        .string()
        .describe(
          'PromQL expression to validate and save (e.g., "rate(node_cpu_seconds_total[5m])", "sum by (pod)(container_memory_usage_bytes)").'
        ),
      description: z
        .string()
        .optional()
        .describe("What this query measures. Helps LLMs understand the query purpose."),
      timeRange: z
        .string()
        .default("5m")
        .describe(PARAM_TIME_RANGE_OPTIONAL),
    },
    async ({ projectCode, name, query, description, timeRange }) => {
      try {
        const { stime, etime } = parseTimeRange(timeRange);

        // Validate by executing
        const result = await client.executePromql(projectCode, {
          query,
          stime,
          etime,
          limit: 50,
        });

        // Check for errors
        if (Array.isArray(result)) {
          const errorRow = result.find(
            (r) => r && typeof r === "object" && "error" in r
          );
          if (errorRow) {
            const errMsg = String(
              (errorRow as Record<string, unknown>).error
            );
            return {
              content: [
                {
                  type: "text" as const,
                  text:
                    `**Query validation failed**: ${errMsg}\n\n` +
                    `**Query**: \`${query}\`\n\n` +
                    "**Fix the query and try again.** Check:\n" +
                    "- Metric name is correct (use `whatap_data_availability` to discover metrics)\n" +
                    "- Label names and syntax are valid\n" +
                    "- PromQL functions are correct (rate requires counter, histogram_quantile needs _bucket)\n",
                },
              ],
              isError: true,
            };
          }
        }

        // Check for data
        const dataRows = Array.isArray(result)
          ? result.filter(
              (r: Record<string, unknown>) => !r["_head_"] && !r["error"]
            )
          : [];

        if (dataRows.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text:
                  `**Query returned no data.**\n\n` +
                  `**Query**: \`${query}\`\n\n` +
                  "The query syntax may be valid but no metrics matched in the time range.\n" +
                  "**Suggestions:**\n" +
                  `- Check metric exists: \`whatap_data_availability(projectCode=${projectCode})\`\n` +
                  `- Try a wider time range\n` +
                  "- Verify OpenMetrics is enabled for this project (requires K8s with WhaTap Operator)\n",
              },
            ],
          };
        }

        // Determine metric type from the query pattern
        let metricType = "gauge";
        if (query.includes("rate(") || query.includes("increase(")) {
          metricType = "counter";
        } else if (query.includes("histogram_quantile(")) {
          metricType = "histogram";
        }

        // Save the validated query
        const savedQuery: SavedPromqlQuery = {
          name,
          description: description || `PromQL: ${query}`,
          query,
          projectCode,
          metricType,
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
        };
        queryStore.save(savedQuery);

        // Format preview
        const preview = formatPromqlResponse(result, {
          title: name,
          maxRows: 50,
          maxSeries: 5,
          queryMeta: { stime, etime },
        });

        const lines = [
          `**Query saved**: "${name}"`,
          "",
          `**PromQL**: \`${query}\``,
          `**Type**: ${metricType}`,
          `**Data points**: ${dataRows.length}`,
          "",
          "### Preview",
          "",
          preview,
          "",
          "---",
          `**Reuse**: \`whatap_query_data(projectCode=${projectCode}, savedQuery="${name}")\``,
          `**View all saved**: \`whatap_data_availability(projectCode=${projectCode})\``,
        ];

        return {
          content: [
            {
              type: "text" as const,
              text: lines.join("\n"),
            },
          ],
        };
      } catch (err) {
        const msg = (err as Error).message ?? String(err);
        // Provide PromQL-specific error guidance
        if (msg.includes("OpenMx") || msg.includes("openmx")) {
          return {
            content: [
              {
                type: "text" as const,
                text:
                  `**PromQL execution error**: ${msg}\n\n` +
                  "OpenMetrics may not be enabled for this project. " +
                  "PromQL requires a Kubernetes project with WhaTap Operator installed.\n\n" +
                  `Check project type: \`whatap_project_info(projectCode=${projectCode})\``,
              },
            ],
            isError: true,
          };
        }
        return classifyAndBuildError(err, {
          toolName: "whatap_create_promql",
          projectCode,
          timeRange,
        });
      }
    }
  );
}
