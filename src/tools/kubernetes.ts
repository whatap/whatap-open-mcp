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
import { PARAM_PROJECT_CODE, PARAM_TIME_RANGE } from "../utils/descriptions.js";
import {
  classifyAndBuildError,
  appendNextSteps,
  buildNoDataResponse,
} from "../utils/response.js";

const k8sParams = {
  projectCode: z.number().describe(PARAM_PROJECT_CODE),
  timeRange: z.string().describe(PARAM_TIME_RANGE),
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

export function registerKubernetesTools(
  server: McpServer,
  client: WhatapApiClient
) {
  registerK8sMetricTool(
    server,
    "whatap_k8s_node_list",
    "Use this for Kubernetes cluster node overview with CPU and memory. " +
      "Works only with KUBERNETES projects. " +
      "PREREQUISITES: projectCode from whatap_list_projects (must be K8s project). " +
      "RELATED: whatap_k8s_node_cpu, whatap_k8s_node_memory, whatap_k8s_pod_status.",
    buildK8sNodeListQuery,
    "Kubernetes Nodes",
    client
  );

  registerK8sMetricTool(
    server,
    "whatap_k8s_node_cpu",
    "Use this for detailed Kubernetes node CPU (total, user, system). " +
      "Works only with KUBERNETES projects. " +
      "PREREQUISITES: projectCode from whatap_list_projects (must be K8s project). " +
      "RELATED: whatap_k8s_node_memory, whatap_k8s_container_top(metric='cpu').",
    buildK8sNodeCpuQuery,
    "Kubernetes Node CPU",
    client
  );

  registerK8sMetricTool(
    server,
    "whatap_k8s_node_memory",
    "Use this for detailed Kubernetes node memory (usage%, used, total). " +
      "Works only with KUBERNETES projects. " +
      "PREREQUISITES: projectCode from whatap_list_projects (must be K8s project). " +
      "RELATED: whatap_k8s_node_cpu, whatap_k8s_container_top(metric='memory').",
    buildK8sNodeMemoryQuery,
    "Kubernetes Node Memory",
    client
  );

  registerK8sMetricTool(
    server,
    "whatap_k8s_pod_status",
    "Use this for Kubernetes pod health: status, namespace, node, restarts. " +
      "Works only with KUBERNETES projects. " +
      "PREREQUISITES: projectCode from whatap_list_projects (must be K8s project). " +
      "RELATED: whatap_k8s_events (warnings/errors), whatap_k8s_container_top (resource usage).",
    buildK8sPodStatusQuery,
    "Kubernetes Pod Status",
    client
  );

  // Container top - has extra metric param
  server.tool(
    "whatap_k8s_container_top",
    "Use this to find the most resource-hungry containers, ranked by CPU or memory. " +
      "Works only with KUBERNETES projects. " +
      "PREREQUISITES: projectCode from whatap_list_projects (must be K8s project). " +
      "RELATED: whatap_k8s_pod_status, whatap_k8s_events.",
    {
      projectCode: z.number().describe(PARAM_PROJECT_CODE),
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
        if (Array.isArray(result) && result.length === 0) {
          return buildNoDataResponse({
            toolName: "whatap_k8s_container_top",
            projectCode,
          });
        }
        const text = formatMxqlResponse(result, {
          title: `Top ${topN ?? 10} Containers by ${metric.toUpperCase()}`,
        });
        return {
          content: [
            { type: "text" as const, text: appendNextSteps(text, "whatap_k8s_container_top") },
          ],
        };
      } catch (err) {
        return classifyAndBuildError(err, {
          toolName: "whatap_k8s_container_top",
          projectCode,
        });
      }
    }
  );

  registerK8sMetricTool(
    server,
    "whatap_k8s_events",
    "Use this for Kubernetes cluster events (Normal/Warning), reasons, and messages. " +
      "Works only with KUBERNETES projects. " +
      "PREREQUISITES: projectCode from whatap_list_projects (must be K8s project). " +
      "RELATED: whatap_k8s_pod_status (current state), whatap_alerts (platform alerts).",
    buildK8sEventsQuery,
    "Kubernetes Events",
    client
  );
}
