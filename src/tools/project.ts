import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WhatapApiClient } from "../api/client.js";
import { formatProjectList, formatAgentList } from "../utils/format.js";

export function registerProjectTools(
  server: McpServer,
  client: WhatapApiClient
) {
  server.tool(
    "whatap_list_projects",
    "List all monitoring projects accessible with the account token. Returns project name, pcode, platform, and product type.",
    {},
    async () => {
      try {
        const projects = await client.listProjects();
        const text = formatProjectList(
          projects as unknown as Array<Record<string, unknown>>
        );
        return { content: [{ type: "text", text }] };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "whatap_project_info",
    "Get detailed information about a specific monitoring project.",
    { projectCode: z.number().describe("Project code (pcode)") },
    async ({ projectCode }) => {
      try {
        const project = await client.getProjectInfo(projectCode);
        const lines = [
          `## Project: ${project.name}`,
          "",
          `- **pcode**: ${project.projectCode}`,
          `- **Platform**: ${project.platform ?? "unknown"}`,
          `- **Product Type**: ${project.productType ?? "unknown"}`,
          `- **Status**: ${project.status ?? "unknown"}`,
          ...(project.gatewayName
            ? [`- **Gateway**: ${project.gatewayName}`]
            : []),
        ];
        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "whatap_list_agents",
    "List all agents (servers/instances) in a project with their status.",
    { projectCode: z.number().describe("Project code (pcode)") },
    async ({ projectCode }) => {
      try {
        const agents = await client.getAgents(projectCode);
        const text = formatAgentList(
          agents as unknown as Array<Record<string, unknown>>
        );
        return { content: [{ type: "text", text }] };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
          isError: true,
        };
      }
    }
  );
}
