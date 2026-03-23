import { z } from "../mcp/schema.js";
import type { McpServer } from "../mcp/server.js";
import type { WhatapApiClient } from "../api/client.js";
import { formatProjectList, formatAgentList } from "../utils/format.js";
import { PARAM_PROJECT_CODE } from "../utils/descriptions.js";
import {
  classifyAndBuildError,
  appendNextSteps,
} from "../utils/response.js";

export function registerProjectTools(
  server: McpServer,
  client: WhatapApiClient
) {
  server.tool(
    "whatap_list_projects",
    "Use this as the FIRST STEP in any WhaTap monitoring workflow. " +
      "Returns all monitoring projects with pcode (project code), name, platform, and product type. " +
      "Every other WhaTap tool requires a projectCode — get it from this tool.\n\n" +
      "WORKFLOW for WhaTap monitoring analysis:\n" +
      "1. whatap_list_projects (this tool) → find the target project, note its pcode and platform\n" +
      "2. whatap_data_availability() → browse available MXQL query domains\n" +
      "3. whatap_describe_mxql(path) → understand query parameters and output fields\n" +
      "4. whatap_query_mxql(projectCode, path) → execute and get live data\n\n" +
      "Do NOT call other WhaTap tools before this one — you need a pcode first.",
    {},
    async () => {
      try {
        const projects = await client.listProjects();
        const text = formatProjectList(
          projects as unknown as Array<Record<string, unknown>>
        );
        return {
          content: [
            { type: "text" as const, text: appendNextSteps(text, "whatap_list_projects") },
          ],
        };
      } catch (err) {
        return classifyAndBuildError(err, { toolName: "whatap_list_projects" });
      }
    }
  );

  server.tool(
    "whatap_project_info",
    "Use this to get detailed info about a specific project (platform, product type, status, gateway). " +
      "PREREQUISITE: projectCode from whatap_list_projects. " +
      "RELATED: whatap_list_agents (servers/instances), whatap_data_availability (query discovery).",
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
    "Use this to discover servers, app instances, or DB instances in a project. " +
      "Returns agent name (oname), status (active/inactive), IP, and OID. " +
      "OIDs can filter MXQL queries via params: whatap_query_mxql(params={oid: '...'}). " +
      "PREREQUISITE: projectCode from whatap_list_projects.",
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
