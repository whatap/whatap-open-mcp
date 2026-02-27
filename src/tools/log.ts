import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WhatapApiClient } from "../api/client.js";
import { buildLogSearchQuery, buildLogStatsQuery } from "../api/mxql.js";
import { parseTimeRange } from "../utils/time.js";
import { formatMxqlResponse } from "../utils/format.js";
import { PARAM_PROJECT_CODE, PARAM_TIME_RANGE } from "../utils/descriptions.js";
import {
  classifyAndBuildError,
  appendNextSteps,
  buildNoDataResponse,
} from "../utils/response.js";

export function registerLogTools(
  server: McpServer,
  client: WhatapApiClient
) {
  server.tool(
    "whatap_log_search",
    "Use this to search logs for keywords, errors, or patterns. " +
      "Returns matching entries with timestamp, content, agent name, category. " +
      "Works with APM and SERVER projects. " +
      "PREREQUISITES: projectCode from whatap_list_projects. " +
      "RELATED: whatap_log_stats (volume trends), whatap_alerts (correlated alerts).",
    {
      projectCode: z.number().describe(PARAM_PROJECT_CODE),
      keyword: z.string().describe("Keyword to search for in log content"),
      timeRange: z.string().describe(PARAM_TIME_RANGE),
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
        if (Array.isArray(result) && result.length === 0) {
          return buildNoDataResponse({
            toolName: "whatap_log_search",
            projectCode,
            timeRange,
          });
        }
        const text = formatMxqlResponse(result, {
          title: `Log Search: "${keyword}"`,
          maxRows: limit ?? 50,
        });
        return {
          content: [
            { type: "text" as const, text: appendNextSteps(text, "whatap_log_search") },
          ],
        };
      } catch (err) {
        return classifyAndBuildError(err, {
          toolName: "whatap_log_search",
          projectCode,
          timeRange,
        });
      }
    }
  );

  server.tool(
    "whatap_log_stats",
    "Use this for log volume and rate trends over time. " +
      "Returns counts per time bucket and category. " +
      "Works with APM and SERVER projects. " +
      "PREREQUISITES: projectCode from whatap_list_projects. " +
      "RELATED: whatap_log_search(keyword) to drill into specific content.",
    {
      projectCode: z.number().describe(PARAM_PROJECT_CODE),
      timeRange: z.string().describe(PARAM_TIME_RANGE),
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
        if (Array.isArray(result) && result.length === 0) {
          return buildNoDataResponse({
            toolName: "whatap_log_stats",
            projectCode,
            timeRange,
          });
        }
        const text = formatMxqlResponse(result, {
          title: "Log Volume Statistics",
        });
        return {
          content: [
            { type: "text" as const, text: appendNextSteps(text, "whatap_log_stats") },
          ],
        };
      } catch (err) {
        return classifyAndBuildError(err, {
          toolName: "whatap_log_stats",
          projectCode,
          timeRange,
        });
      }
    }
  );
}
