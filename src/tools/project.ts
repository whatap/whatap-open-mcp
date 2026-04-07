import { z } from "../mcp/schema.js";
import type { McpServer } from "../mcp/server.js";
import type { WhatapApiClient } from "../api/client.js";
import { formatProjectList, formatAgentList } from "../utils/format.js";
import { PARAM_PROJECT_CODE } from "../utils/descriptions.js";
import {
  classifyAndBuildError,
  appendNextSteps,
} from "../utils/response.js";
import { VERSION } from "../version.js";

export function registerProjectTools(
  server: McpServer,
  client: WhatapApiClient
) {
  server.tool(
    "whatap_list_projects",
    "Returns all monitoring projects with pcode (project code), name, platform, and product type.\n\n" +
      "WHEN TO CALL:\n" +
      "- Call this ONLY if you do NOT already have a projectCode.\n" +
      "- If the user provides a projectCode (e.g., 'project 5490'), skip this and call the needed tool directly.\n" +
      "- Do NOT call this as a prerequisite when you already know the pcode.",
    {},
    async () => {
      try {
        const projects = await client.listProjects();
        const text = formatProjectList(
          projects as unknown as Array<Record<string, unknown>>
        );
        const versioned = `*whatap-mcp v${VERSION}*\n\n${text}`;
        return {
          content: [
            { type: "text" as const, text: appendNextSteps(versioned, "whatap_list_projects") },
          ],
        };
      } catch (err) {
        return classifyAndBuildError(err, { toolName: "whatap_list_projects" });
      }
    }
  );

  server.tool(
    "whatap_project_info",
    "Get detailed info about a specific project (platform, product type, status, gateway). " +
      "Only call this when the user explicitly asks about project details. " +
      "Do NOT call as a prerequisite before querying data — it is not needed for data queries.",
    { projectCode: z.number().describe(PARAM_PROJECT_CODE) },
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
        const text = lines.join("\n");
        return {
          content: [
            { type: "text" as const, text: appendNextSteps(text, "whatap_project_info") },
          ],
        };
      } catch (err) {
        return classifyAndBuildError(err, {
          toolName: "whatap_project_info",
          projectCode,
        });
      }
    }
  );

  server.tool(
    "whatap_list_agents",
    "List servers, app instances, or DB instances in a project. " +
      "Returns agent name (oname), status (active/inactive), IP, and OID. " +
      "Only call this when the user asks about agents/instances, or when you need an OID to filter query results. " +
      "Do NOT call as a prerequisite before data queries — it is not needed.",
    { projectCode: z.number().describe(PARAM_PROJECT_CODE) },
    async ({ projectCode }) => {
      try {
        const agents = await client.getAgents(projectCode);
        const text = formatAgentList(
          agents as unknown as Array<Record<string, unknown>>
        );
        return {
          content: [
            { type: "text" as const, text: appendNextSteps(text, "whatap_list_agents") },
          ],
        };
      } catch (err) {
        return classifyAndBuildError(err, {
          toolName: "whatap_list_agents",
          projectCode,
        });
      }
    }
  );

}
