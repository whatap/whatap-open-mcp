import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WhatapApiClient } from "../api/client.js";
import { parseTimeRange } from "../utils/time.js";
import { formatMxqlResponse } from "../utils/format.js";
import { PARAM_PROJECT_CODE, PARAM_TIME_RANGE } from "../utils/descriptions.js";
import {
  classifyAndBuildError,
  appendNextSteps,
  buildNoDataResponse,
} from "../utils/response.js";

export function registerMxqlTools(
  server: McpServer,
  client: WhatapApiClient
) {
  server.tool(
    "whatap_mxql_query",
    "Use this for advanced custom MXQL queries when predefined tools don't cover your needs. " +
      "MXQL syntax: CATEGORY {name} → TAGLOAD → SELECT [field1, field2] → optional FILTER/ORDER.\n\n" +
      "WORKFLOW (if unfamiliar with MXQL):\n" +
      "1. whatap_list_categories → valid category names\n" +
      "2. whatap_describe_fields(category) → valid field names + example query\n" +
      "3. This tool → execute custom MXQL\n\n" +
      "SYNTAX TIPS:\n" +
      "- FILTER: {key:fieldName, value:val}  (colon syntax, not =)\n" +
      "- ORDER: {key:[fieldName], sort:[desc]}  (brackets required)\n" +
      "- Field names are case-sensitive\n\n" +
      "Prefer domain tools (whatap_server_cpu, whatap_apm_tps) or whatap_query_category for simpler queries.",
    {
      projectCode: z.number().describe(PARAM_PROJECT_CODE),
      mxql: z
        .string()
        .describe(
          "MXQL query text. Each command on a new line. Example: CATEGORY server_base\\nTAGLOAD\\nSELECT [cpu, memory_pused]"
        ),
      timeRange: z.string().describe(PARAM_TIME_RANGE),
      limit: z
        .number()
        .optional()
        .default(100)
        .describe("Maximum number of records to return (default: 100)"),
      param: z
        .record(z.string())
        .optional()
        .describe(
          "Optional key-value parameters to pass to the MXQL query (bind variables like $oid)"
        ),
    },
    async ({ projectCode, mxql, timeRange, limit, param }) => {
      try {
        const { stime, etime } = parseTimeRange(timeRange);
        const result = await client.executeMxqlText(projectCode, {
          stime,
          etime,
          mql: mxql,
          limit: limit ?? 100,
          param,
        });
        if (Array.isArray(result) && result.length === 0) {
          return buildNoDataResponse({
            toolName: "whatap_mxql_query",
            projectCode,
            timeRange,
          });
        }
        const text = formatMxqlResponse(result, {
          title: "MXQL Query Result",
          maxRows: limit ?? 100,
        });
        return {
          content: [
            { type: "text" as const, text: appendNextSteps(text, "whatap_mxql_query") },
          ],
        };
      } catch (err) {
        return classifyAndBuildError(err, {
          toolName: "whatap_mxql_query",
          projectCode,
          timeRange,
        });
      }
    }
  );
}
