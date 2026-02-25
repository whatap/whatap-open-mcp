import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WhatapApiClient } from "../api/client.js";
import { parseTimeRange } from "../utils/time.js";
import { formatMxqlResponse } from "../utils/format.js";

export function registerAlertTools(
  server: McpServer,
  client: WhatapApiClient
) {
  server.tool(
    "whatap_alerts",
    "Get active or recent alert events for a project. Tries both general events and Kubernetes events.",
    {
      projectCode: z.number().describe("Project code (pcode)"),
      timeRange: z
        .string()
        .optional()
        .default("1h")
        .describe(
          'Time range for recent alerts (default: "1h"). e.g. "5m", "1h", "6h", "1d"'
        ),
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
          return { content: [{ type: "text", text }] };
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
          return { content: [{ type: "text", text }] };
        }

        return {
          content: [
            {
              type: "text",
              text: "No alert or event data found for the specified time range.",
            },
          ],
        };
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
