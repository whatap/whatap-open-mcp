import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WhatapApiClient } from "../api/client.js";
import {
  buildDbStatQuery,
  buildDbActiveSessionsQuery,
  buildDbWaitAnalysisQuery,
} from "../api/mxql.js";
import { parseTimeRange } from "../utils/time.js";
import { formatMxqlResponse, formatAgentList } from "../utils/format.js";
import {
  PARAM_PROJECT_CODE,
  PARAM_TIME_RANGE,
  PARAM_OID_DB,
} from "../utils/descriptions.js";
import {
  classifyAndBuildError,
  appendNextSteps,
  buildNoDataResponse,
} from "../utils/response.js";

export function registerDatabaseTools(
  server: McpServer,
  client: WhatapApiClient
) {
  server.tool(
    "whatap_db_instance_list",
    "Use this to discover database instances in a project. " +
      "Returns instance name, status, IP, OID. OID filters other DB tools. " +
      "Works with DATABASE projects (POSTGRESQL, ORACLE, MYSQL, MSSQL). " +
      "PREREQUISITES: projectCode from whatap_list_projects. " +
      "NEXT: whatap_db_stat(oid=...) or whatap_db_active_sessions(oid=...).",
    {
      projectCode: z.number().describe(PARAM_PROJECT_CODE),
    },
    async ({ projectCode }) => {
      try {
        const agents = await client.getAgents(projectCode);
        const text = formatAgentList(
          agents as unknown as Array<Record<string, unknown>>
        );
        return {
          content: [
            { type: "text" as const, text: appendNextSteps(text, "whatap_db_instance_list") },
          ],
        };
      } catch (err) {
        return classifyAndBuildError(err, {
          toolName: "whatap_db_instance_list",
          projectCode,
        });
      }
    }
  );

  server.tool(
    "whatap_db_stat",
    "Use this for database performance overview: active sessions, locks, long-running queries, CPU, memory. " +
      "Works with DATABASE projects. " +
      "PREREQUISITES: projectCode from whatap_list_projects. Optional oid from whatap_db_instance_list. " +
      "RELATED: whatap_db_active_sessions (session details), whatap_db_wait_analysis (Oracle waits).",
    {
      projectCode: z.number().describe(PARAM_PROJECT_CODE),
      timeRange: z.string().describe(PARAM_TIME_RANGE),
      oid: z.string().optional().describe(PARAM_OID_DB),
    },
    async ({ projectCode, timeRange, oid }) => {
      try {
        const { stime, etime } = parseTimeRange(timeRange);
        const mql = buildDbStatQuery(oid ? { oid } : undefined);
        const result = await client.executeMxqlText(projectCode, {
          stime,
          etime,
          mql,
          limit: 100,
        });
        if (Array.isArray(result) && result.length === 0) {
          return buildNoDataResponse({
            toolName: "whatap_db_stat",
            projectCode,
            timeRange,
          });
        }
        const text = formatMxqlResponse(result, {
          title: "Database Performance Stats",
        });
        return {
          content: [
            { type: "text" as const, text: appendNextSteps(text, "whatap_db_stat") },
          ],
        };
      } catch (err) {
        return classifyAndBuildError(err, {
          toolName: "whatap_db_stat",
          projectCode,
          timeRange,
        });
      }
    }
  );

  server.tool(
    "whatap_db_active_sessions",
    "Use this for real-time database session details: SQL text, wait events, elapsed time. " +
      "Works with DATABASE projects. " +
      "PREREQUISITES: projectCode from whatap_list_projects. Optional oid from whatap_db_instance_list. " +
      "NOTE: Real-time snapshot (last 1 min) — no timeRange needed. " +
      "RELATED: whatap_db_wait_analysis (Oracle), whatap_db_stat (aggregate metrics).",
    {
      projectCode: z.number().describe(PARAM_PROJECT_CODE),
      oid: z.string().optional().describe(PARAM_OID_DB),
    },
    async ({ projectCode, oid }) => {
      try {
        const etime = Date.now();
        const stime = etime - 60_000; // last 1 minute for active sessions
        const mql = buildDbActiveSessionsQuery(oid ? { oid } : undefined);
        const result = await client.executeMxqlText(projectCode, {
          stime,
          etime,
          mql,
          limit: 100,
        });
        if (Array.isArray(result) && result.length === 0) {
          return buildNoDataResponse({
            toolName: "whatap_db_active_sessions",
            projectCode,
          });
        }
        const text = formatMxqlResponse(result, {
          title: "Active Database Sessions",
        });
        return {
          content: [
            { type: "text" as const, text: appendNextSteps(text, "whatap_db_active_sessions") },
          ],
        };
      } catch (err) {
        return classifyAndBuildError(err, {
          toolName: "whatap_db_active_sessions",
          projectCode,
        });
      }
    }
  );

  server.tool(
    "whatap_db_wait_analysis",
    "Use this for database wait event analysis — Oracle only. " +
      "Returns wait classes and events ranked by time waited. " +
      "PREREQUISITES: projectCode from whatap_list_projects. " +
      "Do NOT use for non-Oracle databases. " +
      "RELATED: whatap_db_active_sessions, whatap_db_stat.",
    {
      projectCode: z.number().describe(PARAM_PROJECT_CODE),
      timeRange: z.string().describe(PARAM_TIME_RANGE),
    },
    async ({ projectCode, timeRange }) => {
      try {
        const { stime, etime } = parseTimeRange(timeRange);
        const mql = buildDbWaitAnalysisQuery();
        const result = await client.executeMxqlText(projectCode, {
          stime,
          etime,
          mql,
          limit: 100,
        });
        if (Array.isArray(result) && result.length === 0) {
          return buildNoDataResponse({
            toolName: "whatap_db_wait_analysis",
            projectCode,
            timeRange,
          });
        }
        const text = formatMxqlResponse(result, {
          title: "Database Wait Event Analysis",
        });
        return {
          content: [
            { type: "text" as const, text: appendNextSteps(text, "whatap_db_wait_analysis") },
          ],
        };
      } catch (err) {
        return classifyAndBuildError(err, {
          toolName: "whatap_db_wait_analysis",
          projectCode,
          timeRange,
        });
      }
    }
  );
}
