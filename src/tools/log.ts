import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WhatapApiClient } from "../api/client.js";
import { buildLogSearchQuery, buildLogStatsQuery } from "../api/mxql.js";
import { parseTimeRange } from "../utils/time.js";
import { formatMxqlResponse } from "../utils/format.js";

export function registerLogTools(
  server: McpServer,
  client: WhatapApiClient
) {
  server.tool(
    "whatap_log_search",
    "Search logs with a keyword filter. Returns matching log entries with timestamps.",
    {
      projectCode: z.number().describe("Project code (pcode)"),
      keyword: z.string().describe("Keyword to search for in log content"),
      timeRange: z
        .string()
        .describe('Time range, e.g. "5m", "1h", "6h", "1d"'),
      limit: z
        .number()
        .optional()
        .default(50)
        .describe("Maximum number of log entries to return (default: 50)"),
    },
    async ({ projectCode, keyword, timeRange, limit }) => {
      try {
        const { stime, etime } = parseTimeRange(timeRange);
        const mql = buildLogSearchQuery(keyword);
        const result = await client.executeMxqlText(projectCode, {
          stime,
          etime,
          mql,
          limit: limit ?? 50,
        });
        const text = formatMxqlResponse(result, {
          title: `Log Search: "${keyword}"`,
          maxRows: limit ?? 50,
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

  server.tool(
    "whatap_log_stats",
    "Get log volume and rate statistics over a time period.",
    {
      projectCode: z.number().describe("Project code (pcode)"),
      timeRange: z
        .string()
        .describe('Time range, e.g. "5m", "1h", "6h", "1d"'),
    },
    async ({ projectCode, timeRange }) => {
      try {
        const { stime, etime } = parseTimeRange(timeRange);
        const mql = buildLogStatsQuery();
        const result = await client.executeMxqlText(projectCode, {
          stime,
          etime,
          mql,
          limit: 100,
        });
        const text = formatMxqlResponse(result, {
          title: "Log Volume Statistics",
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
