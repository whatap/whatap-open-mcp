import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WhatapApiClient } from "../api/client.js";
import { parseTimeRange } from "../utils/time.js";
import { formatMxqlResponse } from "../utils/format.js";
import { PARAM_PROJECT_CODE, PARAM_TIME_RANGE_OPTIONAL } from "../utils/descriptions.js";
import {
  classifyAndBuildError,
  appendNextSteps,
} from "../utils/response.js";

export function registerAlertTools(
  server: McpServer,
  client: WhatapApiClient
) {
  server.tool(
    "whatap_alerts",
    "Use this when asked about alerts, incidents, or events. " +
      "Tries general events first; falls back to Kubernetes events for K8s projects. " +
      "Returns time, title, message, severity, status. Works with all project types. " +
      "PREREQUISITES: projectCode from whatap_list_projects. " +
      "RELATED: Investigate causes with whatap_server_cpu, whatap_apm_error, whatap_k8s_events, whatap_db_stat.",
    {
      projectCode: z.number().describe(PARAM_PROJECT_CODE),
      timeRange: z
        .string()
        .optional()
        .default("1h")
        .describe(PARAM_TIME_RANGE_OPTIONAL),
    },
    async ({ projectCode, timeRange }) => {
      try {
        const { stime, etime } = parseTimeRange(timeRange ?? "1h");

        // Try general event category first
        const eventMql = [
          `CATEGORY event`,
          `TAGLOAD`,
          `SELECT [time, title, message, level, oname, status]`,
          `ORDER {key:[time], sort:[desc]}`,
        ].join("\n");

        const eventResult = await client.executeMxqlText(projectCode, {
          stime,
          etime,
          mql: eventMql,
          limit: 100,
        });

        if (eventResult.length > 0) {
          const text = formatMxqlResponse(eventResult, {
            title: "Alert Events",
          });
          return {
            content: [
              { type: "text" as const, text: appendNextSteps(text, "whatap_alerts") },
            ],
          };
        }

        // Fallback: try kube_event for Kubernetes projects
        const kubeEventMql = [
          `CATEGORY kube_event`,
          `TAGLOAD`,
          `SELECT [type, reason, message, namespace, name, kind, oname]`,
        ].join("\n");

        const kubeResult = await client.executeMxqlText(projectCode, {
          stime,
          etime,
          mql: kubeEventMql,
          limit: 100,
        });

        if (kubeResult.length > 0) {
          const text = formatMxqlResponse(kubeResult, {
            title: "Kubernetes Events",
          });
          return {
            content: [
              { type: "text" as const, text: appendNextSteps(text, "whatap_alerts") },
            ],
          };
        }

        // No-data case — guided message (not isError)
        const noDataLines = [
          "No alert or event data found — this is normal if there are no active alerts.",
          "",
          '**Suggestions:**',
          '- Try wider time range ("24h", "7d").',
          `- Check \`whatap_check_availability(projectCode=${projectCode})\` to see which categories have data.`,
          "- To proactively check health: `whatap_server_cpu`, `whatap_apm_error`, `whatap_k8s_pod_status`.",
        ];
        return {
          content: [
            { type: "text" as const, text: noDataLines.join("\n") },
          ],
        };
      } catch (err) {
        return classifyAndBuildError(err, {
          toolName: "whatap_alerts",
          projectCode,
          timeRange: timeRange ?? "1h",
        });
      }
    }
  );
}
