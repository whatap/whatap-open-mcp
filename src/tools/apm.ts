import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WhatapApiClient } from "../api/client.js";
import {
  buildApmTpsQuery,
  buildApmResponseTimeQuery,
  buildApmErrorQuery,
  buildApmApdexQuery,
  buildApmActiveTransactionsQuery,
  buildApmTransactionStatsQuery,
} from "../api/mxql.js";
import { parseTimeRange } from "../utils/time.js";
import { formatMxqlResponse } from "../utils/format.js";

const apmParams = {
  projectCode: z.number().describe("Project code (pcode)"),
  timeRange: z
    .string()
    .describe('Time range, e.g. "5m", "1h", "6h", "1d", "last 30 minutes"'),
};

function registerApmMetricTool(
  server: McpServer,
  name: string,
  description: string,
  buildQuery: () => string,
  title: string,
  client: WhatapApiClient
) {
  server.tool(name, description, apmParams, async ({ projectCode, timeRange }) => {
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

export function registerApmTools(
  server: McpServer,
  client: WhatapApiClient
) {
  registerApmMetricTool(
    server,
    "whatap_apm_tps",
    "Get transactions per second (TPS) for the application.",
    buildApmTpsQuery,
    "APM - Transactions Per Second",
    client
  );

  registerApmMetricTool(
    server,
    "whatap_apm_response_time",
    "Get service response time metrics.",
    buildApmResponseTimeQuery,
    "APM - Response Time",
    client
  );

  registerApmMetricTool(
    server,
    "whatap_apm_error",
    "Get transaction error count and rate.",
    buildApmErrorQuery,
    "APM - Transaction Errors",
    client
  );

  registerApmMetricTool(
    server,
    "whatap_apm_apdex",
    "Get APDEX satisfaction score (satisfied, tolerated, total).",
    buildApmApdexQuery,
    "APM - APDEX Score",
    client
  );

  // Active transactions - no time range needed (real-time)
  server.tool(
    "whatap_apm_active_transactions",
    "Get currently active (in-flight) transactions. This is a real-time snapshot.",
    {
      projectCode: z.number().describe("Project code (pcode)"),
    },
    async ({ projectCode }) => {
      try {
        const etime = Date.now();
        const stime = etime - 60_000; // last 1 minute for active snapshot
        const mql = buildApmActiveTransactionsQuery();
        const result = await client.executeMxqlText(projectCode, {
          stime,
          etime,
          mql,
          limit: 100,
        });
        const text = formatMxqlResponse(result, {
          title: "APM - Active Transactions (Real-time)",
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

  registerApmMetricTool(
    server,
    "whatap_apm_transaction_stats",
    "Get transaction statistics (count, avg time, errors) for the period.",
    buildApmTransactionStatsQuery,
    "APM - Transaction Statistics",
    client
  );
}
