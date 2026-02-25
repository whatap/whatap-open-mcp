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

export function registerDatabaseTools(
  server: McpServer,
  client: WhatapApiClient
) {
  server.tool(
    "whatap_db_instance_list",
    "List database instances in a project.",
    {
      projectCode: z.number().describe("Project code (pcode)"),
    },
    async ({ projectCode }) => {
      try {
        const agents = await client.getAgents(projectCode);
        const text = formatAgentList(
          agents as unknown as Array<Record<string, unknown>>
        );
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
    "whatap_db_stat",
    "Get database performance statistics (active sessions, locks, CPU, memory).",
    {
      projectCode: z.number().describe("Project code (pcode)"),
      timeRange: z
        .string()
        .describe('Time range, e.g. "5m", "1h", "6h", "1d"'),
      oid: z
        .string()
        .optional()
        .describe("Agent OID to filter by (optional)"),
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
        const text = formatMxqlResponse(result, {
          title: "Database Performance Stats",
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
    "whatap_db_active_sessions",
    "Get active database sessions with SQL text and wait events.",
    {
      projectCode: z.number().describe("Project code (pcode)"),
      oid: z
        .string()
        .optional()
        .describe("Agent OID to filter by (optional)"),
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
        const text = formatMxqlResponse(result, {
          title: "Active Database Sessions",
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
    "whatap_db_wait_analysis",
    "Analyze database wait events (Oracle). Shows wait classes and events ranked by time waited.",
    {
      projectCode: z.number().describe("Project code (pcode)"),
      timeRange: z
        .string()
        .describe('Time range, e.g. "5m", "1h", "6h", "1d"'),
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
        const text = formatMxqlResponse(result, {
          title: "Database Wait Event Analysis",
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
