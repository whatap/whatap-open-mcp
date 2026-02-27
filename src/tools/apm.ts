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
import { PARAM_PROJECT_CODE, PARAM_TIME_RANGE } from "../utils/descriptions.js";
import {
  classifyAndBuildError,
  appendNextSteps,
  buildNoDataResponse,
} from "../utils/response.js";

const apmParams = {
  projectCode: z.number().describe(PARAM_PROJECT_CODE),
  timeRange: z.string().describe(PARAM_TIME_RANGE),
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

export function registerApmTools(
  server: McpServer,
  client: WhatapApiClient
) {
  registerApmMetricTool(
    server,
    "whatap_apm_tps",
    "Use this when asked about application throughput or transaction volume. " +
      "Returns transactions per second (TPS). Works with APM projects (JAVA, NODEJS, PYTHON, PHP, DOTNET, GO). " +
      "PREREQUISITES: projectCode from whatap_list_projects. " +
      "RELATED: whatap_apm_response_time (latency), whatap_apm_error (errors), whatap_apm_active_transactions (saturation).",
    buildApmTpsQuery,
    "APM - Transactions Per Second",
    client
  );

  registerApmMetricTool(
    server,
    "whatap_apm_response_time",
    "Use this when asked about application latency or response time. " +
      "Returns average transaction time (ms) and count. Works with APM projects. " +
      "PREREQUISITES: projectCode from whatap_list_projects. " +
      "RELATED: whatap_apm_tps (throughput), whatap_apm_apdex (satisfaction), whatap_apm_error.",
    buildApmResponseTimeQuery,
    "APM - Response Time",
    client
  );

  registerApmMetricTool(
    server,
    "whatap_apm_error",
    "Use this when asked about application errors or failure rates. " +
      "Returns transaction error count and total count. Works with APM projects. " +
      "PREREQUISITES: projectCode from whatap_list_projects. " +
      "RELATED: whatap_apm_transaction_stats, whatap_apm_tps, whatap_apm_response_time.",
    buildApmErrorQuery,
    "APM - Transaction Errors",
    client
  );

  registerApmMetricTool(
    server,
    "whatap_apm_apdex",
    "Use this when asked about user experience or satisfaction. " +
      "Returns APDEX: satisfied, tolerated, total. Score = (satisfied + tolerated/2) / total. Works with APM projects. " +
      "PREREQUISITES: projectCode from whatap_list_projects. " +
      "RELATED: whatap_apm_response_time, whatap_apm_error.",
    buildApmApdexQuery,
    "APM - APDEX Score",
    client
  );

  // Active transactions - no time range needed (real-time)
  server.tool(
    "whatap_apm_active_transactions",
    "Use this for a real-time snapshot of in-flight transactions. " +
      "Returns active transaction count bucketed by duration: <3s, 3-8s, >8s. " +
      "High counts in >8s bucket indicate slow transactions. Works with APM projects. " +
      "PREREQUISITES: projectCode from whatap_list_projects. " +
      "NOTE: Real-time snapshot — no timeRange needed. " +
      "RELATED: whatap_apm_response_time, whatap_server_cpu (resource pressure).",
    {
      projectCode: z.number().describe(PARAM_PROJECT_CODE),
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
        if (Array.isArray(result) && result.length === 0) {
          return buildNoDataResponse({
            toolName: "whatap_apm_active_transactions",
            projectCode,
          });
        }
        const text = formatMxqlResponse(result, {
          title: "APM - Active Transactions (Real-time)",
        });
        return {
          content: [
            { type: "text" as const, text: appendNextSteps(text, "whatap_apm_active_transactions") },
          ],
        };
      } catch (err) {
        return classifyAndBuildError(err, {
          toolName: "whatap_apm_active_transactions",
          projectCode,
        });
      }
    }
  );

  registerApmMetricTool(
    server,
    "whatap_apm_transaction_stats",
    "Use this for a statistical overview of transactions over a period. " +
      "Returns count, average time, error count. Works with APM projects. " +
      "PREREQUISITES: projectCode from whatap_list_projects. " +
      "RELATED: whatap_apm_error, whatap_apm_response_time.",
    buildApmTransactionStatsQuery,
    "APM - Transaction Statistics",
    client
  );
}
