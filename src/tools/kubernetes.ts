import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WhatapApiClient } from "../api/client.js";
import {
  buildK8sNodeListQuery,
  buildK8sNodeCpuQuery,
  buildK8sNodeMemoryQuery,
  buildK8sPodStatusQuery,
  buildK8sContainerTopQuery,
  buildK8sEventsQuery,
} from "../api/mxql.js";
import { parseTimeRange } from "../utils/time.js";
import { formatMxqlResponse } from "../utils/format.js";

const k8sParams = {
  projectCode: z.number().describe("Project code (pcode)"),
  timeRange: z
    .string()
    .describe('Time range, e.g. "5m", "1h", "6h", "1d", "last 30 minutes"'),
};

function registerK8sMetricTool(
  server: McpServer,
  name: string,
  description: string,
  buildQuery: () => string,
  title: string,
  client: WhatapApiClient
) {
  server.tool(name, description, k8sParams, async ({ projectCode, timeRange }) => {
    try {
      const { stime, etime } = parseTimeRange(timeRange);
      const mql = buildQuery();
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

export function registerKubernetesTools(
  server: McpServer,
  client: WhatapApiClient
) {
  registerK8sMetricTool(
    server,
    "whatap_k8s_node_list",
    "List Kubernetes nodes with CPU and memory overview.",
    buildK8sNodeListQuery,
    "Kubernetes Nodes",
    client
  );

  registerK8sMetricTool(
    server,
    "whatap_k8s_node_cpu",
    "Get Kubernetes node CPU usage.",
    buildK8sNodeCpuQuery,
    "Kubernetes Node CPU",
    client
  );

  registerK8sMetricTool(
    server,
    "whatap_k8s_node_memory",
    "Get Kubernetes node memory usage.",
    buildK8sNodeMemoryQuery,
    "Kubernetes Node Memory",
    client
  );

  registerK8sMetricTool(
    server,
    "whatap_k8s_pod_status",
    "Get Kubernetes pod status and statistics.",
    buildK8sPodStatusQuery,
    "Kubernetes Pod Status",
    client
  );

  // Container top - has extra metric param
  server.tool(
    "whatap_k8s_container_top",
    "Get top containers by CPU or memory usage.",
    {
      projectCode: z.number().describe("Project code (pcode)"),
      metric: z
        .enum(["cpu", "memory"])
        .describe("Metric to rank by: cpu or memory"),
      topN: z
        .number()
        .optional()
        .default(10)
        .describe("Number of top containers to return (default: 10)"),
    },
    async ({ projectCode, metric, topN }) => {
      try {
        const etime = Date.now();
        const stime = etime - 300_000; // last 5 minutes
        const mql = buildK8sContainerTopQuery(metric);
        const result = await client.executeMxqlText(projectCode, {
          stime,
          etime,
          mql,
          limit: topN ?? 10,
        });
        const text = formatMxqlResponse(result, {
          title: `Top ${topN ?? 10} Containers by ${metric.toUpperCase()}`,
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

  registerK8sMetricTool(
    server,
    "whatap_k8s_events",
    "Get recent Kubernetes events (warnings, errors, etc.).",
    buildK8sEventsQuery,
    "Kubernetes Events",
    client
  );
}
