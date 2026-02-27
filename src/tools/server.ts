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
import {
  PARAM_PROJECT_CODE,
  PARAM_TIME_RANGE,
  PARAM_OID_SERVER,
} from "../utils/descriptions.js";
import {
  classifyAndBuildError,
  appendNextSteps,
  buildNoDataResponse,
} from "../utils/response.js";

const serverParams = {
  projectCode: z.number().describe(PARAM_PROJECT_CODE),
  timeRange: z.string().describe(PARAM_TIME_RANGE),
  oid: z.string().optional().describe(PARAM_OID_SERVER),
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
      if (Array.isArray(result) && result.length === 0) {
        return buildNoDataResponse({ toolName: name, projectCode, timeRange });
      }
      const text = formatMxqlResponse(result, { title });
      return { content: [{ type: "text" as const, text: appendNextSteps(text, name) }] };
    } catch (err) {
      return classifyAndBuildError(err, { toolName: name, projectCode, timeRange });
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
    "Use this when asked about server CPU usage or CPU problems. " +
      "Returns: total cpu%, user-space (cpu_usr), system (cpu_sys), idle (cpu_idle) per server. " +
      "Works with SERVER and KUBERNETES projects. " +
      "PREREQUISITES: projectCode from whatap_list_projects. Optional oid from whatap_list_agents. " +
      "RELATED: whatap_server_memory, whatap_server_cpu_load, whatap_server_top(metric='cpu').",
    buildServerCpuQuery,
    "Server CPU Usage",
    client
  );

  registerServerMetricTool(
    server,
    "whatap_server_memory",
    "Use this when asked about server memory usage or memory problems. " +
      "Returns: memory usage% (memory_pused), used bytes, total bytes per server. " +
      "Works with SERVER and KUBERNETES projects. " +
      "PREREQUISITES: projectCode from whatap_list_projects. Optional oid from whatap_list_agents. " +
      "RELATED: whatap_server_cpu, whatap_server_process, whatap_server_top(metric='memory').",
    buildServerMemoryQuery,
    "Server Memory Usage",
    client
  );

  registerServerMetricTool(
    server,
    "whatap_server_disk",
    "Use this when asked about disk I/O or disk usage. " +
      "Returns: read/write IOPS, usage% (usedPercent), mount point, filesystem per server. " +
      "Works with SERVER and KUBERNETES projects. " +
      "PREREQUISITES: projectCode from whatap_list_projects. Optional oid from whatap_list_agents. " +
      "RELATED: whatap_server_top(metric='disk').",
    buildServerDiskQuery,
    "Server Disk I/O & Usage",
    client
  );

  registerServerMetricTool(
    server,
    "whatap_server_network",
    "Use this when asked about network I/O or bandwidth. " +
      "Returns: bytes in/out per second per network interface per server. " +
      "Works with SERVER and KUBERNETES projects. " +
      "PREREQUISITES: projectCode from whatap_list_projects. Optional oid from whatap_list_agents. " +
      "RELATED: whatap_server_cpu, whatap_server_memory for full server health.",
    buildServerNetworkQuery,
    "Server Network I/O",
    client
  );

  registerServerMetricTool(
    server,
    "whatap_server_process",
    "Use this when asked which processes consume CPU or memory. " +
      "Returns: PID, name, CPU%, memory%, RSS per process per server. " +
      "Works with SERVER and KUBERNETES projects. " +
      "PREREQUISITES: projectCode from whatap_list_projects. Optional oid from whatap_list_agents. " +
      "RELATED: whatap_server_cpu (overall CPU), whatap_server_memory (overall memory).",
    buildServerProcessQuery,
    "Server Processes",
    client
  );

  registerServerMetricTool(
    server,
    "whatap_server_cpu_load",
    "Use this when asked about CPU load averages (1/5/15 minute). " +
      "High load relative to CPU count indicates saturation. " +
      "Works with SERVER and KUBERNETES projects. " +
      "PREREQUISITES: projectCode from whatap_list_projects. Optional oid from whatap_list_agents. " +
      "RELATED: whatap_server_cpu (CPU breakdown), whatap_server_process (top processes).",
    buildServerCpuLoadQuery,
    "Server CPU Load Averages",
    client
  );

  // Top-N servers by metric
  server.tool(
    "whatap_server_top",
    "Use this to find the most loaded servers, ranked by CPU, memory, or disk usage. " +
      "Works with SERVER and KUBERNETES projects. " +
      "PREREQUISITES: projectCode from whatap_list_projects. " +
      "NEXT: Use oid of a top server with whatap_server_cpu(oid=...) for detailed drill-down.",
    {
      projectCode: z.number().describe(PARAM_PROJECT_CODE),
      metric: z
        .enum(["cpu", "memory", "disk"])
        .describe("Metric to rank by: cpu, memory, or disk"),
      topN: z
        .number()
        .optional()
        .default(5)
        .describe("Number of top servers to return (default: 5)"),
      timeRange: z.string().describe(PARAM_TIME_RANGE),
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
        if (Array.isArray(result) && result.length === 0) {
          return buildNoDataResponse({ toolName: "whatap_server_top", projectCode, timeRange });
        }
        const text = formatMxqlResponse(result, {
          title: `Top ${topN ?? 5} Servers by ${metric.toUpperCase()}`,
        });
        return { content: [{ type: "text" as const, text: appendNextSteps(text, "whatap_server_top") }] };
      } catch (err) {
        return classifyAndBuildError(err, {
          toolName: "whatap_server_top",
          projectCode,
          timeRange,
        });
      }
    }
  );
}
