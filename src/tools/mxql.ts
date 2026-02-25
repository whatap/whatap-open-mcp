import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WhatapApiClient } from "../api/client.js";
import { parseTimeRange } from "../utils/time.js";
import { formatMxqlResponse } from "../utils/format.js";

export function registerMxqlTools(
  server: McpServer,
  client: WhatapApiClient
) {
  server.tool(
    "whatap_mxql_query",
    `Execute a raw MXQL text query for advanced/custom data retrieval.
MXQL is WhaTap's query language for monitoring data.
Example: "CATEGORY server_base\\nTAGLOAD\\nSELECT [oid, oname, cpu, memory_pused]"
Use this tool when the predefined tools don't cover your specific needs.`,
    {
      projectCode: z.number().describe("Project code (pcode)"),
      mxql: z
        .string()
        .describe(
          "MXQL query text. Each command on a new line. Example: CATEGORY server_base\\nTAGLOAD\\nSELECT [cpu, memory_pused]"
        ),
      timeRange: z
        .string()
        .describe('Time range, e.g. "5m", "1h", "6h", "1d", "last 30 minutes"'),
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
        const text = formatMxqlResponse(result, {
          title: "MXQL Query Result",
          maxRows: limit ?? 100,
        });
        return { content: [{ type: "text", text }] };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Error executing MXQL query: ${(err as Error).message}\n\nQuery:\n${mxql}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
