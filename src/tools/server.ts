import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WhatapApiClient } from "../api/client.js";
import {
  buildServerCpuQuery,
  buildServerMemoryQuery,
  buildServerDiskQuery,
  buildServerNetworkQuery,
  buildServerProcessQuery,
  buildServerCpuLoadQuery,
} from "../api/mxql.js";
import { parseTimeRange } from "../utils/time.js";
import { formatMxqlResponse } from "../utils/format.js";

const serverParams = {
  projectCode: z.number().describe("Project code (pcode)"),
  timeRange: z
    .string()
    .describe('Time range, e.g. "5m", "1h", "6h", "1d", "last 30 minutes"'),
  oid: z
    .string()
    .optional()
    .describe("Agent OID to filter by (optional, omit for all servers)"),
};

function registerServerMetricTool(
  server: McpServer,
  name: string,
  description: string,
  buildQuery: (opts?: { oid?: string }) => string,
  title: string,
  client: WhatapApiClient
) {
  server.tool(name, description, serverParams, async ({ projectCode, timeRange, oid }) => {
    try {
      const { stime, etime } = parseTimeRange(timeRange);
      const mql = buildQuery(oid ? { oid } : undefined);
      const result = await client.executeMxqlText(projectCode, {
        stime,
        etime,
        mql,
        limit: 100,
      });
      const text = formatMxqlResponse(result, { title });
      return { content: [{ type: "text", text }] };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
        isError: true,
      };
    }
  });
}

export function registerServerTools(
  server: McpServer,
  client: WhatapApiClient
) {
  registerServerMetricTool(
    server,
    "whatap_server_cpu",
    "Get server CPU usage metrics (cpu, cpu_usr, cpu_sys, cpu_idle).",
    buildServerCpuQuery,
    "Server CPU Usage",
    client
  );

  registerServerMetricTool(
    server,
    "whatap_server_memory",
    "Get server memory usage metrics (memory_pused, memory_used, memory_total).",
    buildServerMemoryQuery,
    "Server Memory Usage",
    client
  );

  registerServerMetricTool(
    server,
    "whatap_server_disk",
    "Get disk I/O and usage metrics (readIops, writeIops, usedPercent, mountPoint).",
    buildServerDiskQuery,
    "Server Disk I/O & Usage",
    client
  );

  registerServerMetricTool(
    server,
    "whatap_server_network",
    "Get network I/O metrics (in, out bytes per second).",
    buildServerNetworkQuery,
    "Server Network I/O",
    client
  );

  registerServerMetricTool(
    server,
    "whatap_server_process",
    "Get process-level CPU and memory usage.",
    buildServerProcessQuery,
    "Server Processes",
    client
  );

  registerServerMetricTool(
    server,
    "whatap_server_cpu_load",
    "Get CPU load averages (1/5/15 min).",
    buildServerCpuLoadQuery,
    "Server CPU Load Averages",
    client
  );

  // Top-N servers by metric
  server.tool(
    "whatap_server_top",
    "Get top-N servers by a metric (cpu, memory, or disk usage). Useful for finding the most loaded servers.",
    {
      projectCode: z.number().describe("Project code (pcode)"),
      metric: z
        .enum(["cpu", "memory", "disk"])
        .describe("Metric to rank by: cpu, memory, or disk"),
      topN: z
        .number()
        .optional()
        .default(5)
        .describe("Number of top servers to return (default: 5)"),
      timeRange: z
        .string()
        .describe('Time range, e.g. "5m", "1h", "6h", "1d"'),
    },
    async ({ projectCode, metric, topN, timeRange }) => {
      try {
        const { stime, etime } = parseTimeRange(timeRange);
        const buildQuery =
          metric === "cpu"
            ? buildServerCpuQuery
            : metric === "memory"
              ? buildServerMemoryQuery
              : buildServerDiskQuery;
        const sortField =
          metric === "cpu"
            ? "cpu"
            : metric === "memory"
              ? "memory_pused"
              : "usedPercent";

        let mql = buildQuery();
        mql += `\nORDER {key:[${sortField}], sort:[desc]}`;

        const result = await client.executeMxqlText(projectCode, {
          stime,
          etime,
          mql,
          limit: topN ?? 5,
        });
        const text = formatMxqlResponse(result, {
          title: `Top ${topN ?? 5} Servers by ${metric.toUpperCase()}`,
        });
        return { content: [{ type: "text", text }] };
      } catch (err) {
        return {
          content: [
            { type: "text", text: `Error: ${(err as Error).message}` },
          ],
          isError: true,
        };
      }
    }
  );
}
