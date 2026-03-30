// src/tools/install.ts
// Agent installation tool — fetches project access info,
// detects platform, and returns pre-filled installation commands.

import { z } from "../mcp/schema.js";
import type { McpServer } from "../mcp/server.js";
import type { WhatapApiClient } from "../api/client.js";
import { PARAM_PROJECT_CODE } from "../utils/descriptions.js";
import {
  classifyAndBuildError,
  appendNextSteps,
} from "../utils/response.js";
import {
  getInstallGuide,
  getAllPlatforms,
  type PlatformInstallGuide,
  type InstallStep,
  type OsInstallGuide,
} from "../data/install-guides.js";

// ── Render helpers ──────────────────────────────────────────────

function fillTemplate(text: string, vars: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

function renderStep(step: InstallStep, vars: Record<string, string>): string[] {
  const lines: string[] = [];
  lines.push(`### ${step.title}`);
  if (step.description) {
    lines.push("", fillTemplate(step.description, vars));
  }
  lines.push("", "```bash");
  for (const cmd of step.commands) {
    lines.push(fillTemplate(cmd, vars));
  }
  lines.push("```");
  return lines;
}

function renderOsVariant(
  variant: OsInstallGuide,
  vars: Record<string, string>
): string[] {
  const lines: string[] = [];
  lines.push(`## ${variant.os}`, "");
  lines.push(`**Package**: ${variant.packageName}`);
  lines.push(`**Config**: ${variant.configPath}`, "");
  for (const step of variant.steps) {
    lines.push(...renderStep(step, vars), "");
  }
  return lines;
}

function renderGuide(
  guide: PlatformInstallGuide,
  vars: Record<string, string>,
  targetOs?: string
): string[] {
  const lines: string[] = [];

  // If platform has OS variants
  if (guide.osVariants && guide.osVariants.length > 0) {
    if (targetOs) {
      // Find matching OS variant
      const match = guide.osVariants.find((v) =>
        v.os.toLowerCase().includes(targetOs.toLowerCase())
      );
      if (match) {
        lines.push(...renderOsVariant(match, vars));
      } else {
        lines.push(
          `OS "${targetOs}" not found. Available: ${guide.osVariants.map((v) => v.os).join(", ")}`,
          ""
        );
        // Show first variant as default
        lines.push(
          `**Showing default: ${guide.osVariants[0].os}**`,
          "",
          ...renderOsVariant(guide.osVariants[0], vars)
        );
      }
    } else {
      // List all OS variants with commands
      for (const variant of guide.osVariants) {
        lines.push(...renderOsVariant(variant, vars));
        lines.push("---", "");
      }
    }
  }

  // If platform has direct steps (no OS variants)
  if (guide.steps && guide.steps.length > 0) {
    for (const step of guide.steps) {
      lines.push(...renderStep(step, vars), "");
    }
  }

  // Notes
  if (guide.notes && guide.notes.length > 0) {
    lines.push("### Notes", "");
    for (const note of guide.notes) {
      lines.push(`- ${note}`);
    }
  }

  return lines;
}

// ── Tool Registration ───────────────────────────────────────────

export function registerInstallTools(
  server: McpServer,
  client: WhatapApiClient
): void {
  const platformList = getAllPlatforms().join(", ");

  server.tool(
    "whatap_install_agent",
    "Get agent installation commands for a WhaTap monitoring project. " +
      "Automatically detects the project platform and returns pre-filled installation commands " +
      "with the correct access credentials.\n\n" +
      "PREREQUISITES: projectCode from whatap_list_projects.\n\n" +
      "The tool fetches the project's accesskey and server connection info, " +
      "then generates platform-specific installation commands.\n\n" +
      "IMPORTANT: The returned commands require shell access with appropriate privileges. " +
      "Execute them step by step and verify each step succeeds.\n\n" +
      `Supported platforms: ${platformList}\n\n` +
      "Example: whatap_install_agent(projectCode=38)\n" +
      'Example with OS: whatap_install_agent(projectCode=38, os="debian")',
    {
      projectCode: z.number().describe(PARAM_PROJECT_CODE),
      os: z
        .string()
        .optional()
        .describe(
          'Target OS for platforms with multiple variants (e.g., "debian", "centos", "amazon", "freebsd", "windows", "alpine", "suse", "aix"). ' +
            "If omitted, all variants are shown for INFRA; auto-detected where possible."
        ),
    },
    async ({ projectCode, os }) => {
      try {
        // Fetch project info and access credentials in parallel
        const [projectInfo, access] = await Promise.all([
          client.getProjectInfo(projectCode),
          client.getProjectAccess(projectCode),
        ]);

        const platform = (projectInfo.platform ?? "unknown").toUpperCase();
        const serverHost = access.whatap_server.map((s) => s.host).join("/");
        const serverPort = String(access.whatap_server[0]?.port ?? 6600);

        const vars: Record<string, string> = {
          accesskey: access.accesskey,
          server_host: serverHost,
          server_port: serverPort,
        };

        const lines: string[] = [
          `## Agent Installation — Project ${projectCode}`,
          "",
          `**Project**: ${projectInfo.name}`,
          `**Platform**: ${platform}`,
          `**Product**: ${projectInfo.productType ?? "unknown"}`,
          "",
          "### Access Credentials",
          "",
          `- **accesskey**: \`${access.accesskey}\``,
        ];
        for (const s of access.whatap_server) {
          lines.push(`- **server**: \`${s.host}:${s.port}\``);
        }
        lines.push("");

        // Find install guide for this platform
        const guide = getInstallGuide(platform);

        if (guide) {
          lines.push(
            `**Agent**: ${guide.agentType}`,
            `**Description**: ${guide.description}`,
            ""
          );
          lines.push(...renderGuide(guide, vars, os));
        } else {
          // Generic fallback for unknown platforms
          lines.push(
            "### Configuration",
            "",
            `Platform \`${platform}\` — use the credentials above to configure the WhaTap agent.`,
            "",
            "**Configuration values:**",
            "```",
            `license = ${access.accesskey}`,
            `whatap.server.host = ${serverHost}`,
            `whatap.server.port = ${serverPort}`,
            "```",
            "",
            "Refer to WhaTap documentation for platform-specific installation steps.",
          );
        }

        lines.push(
          "",
          "### Verify Installation",
          "",
          `After starting the agent, verify: \`whatap_list_agents(projectCode=${projectCode})\``,
        );

        return {
          content: [
            {
              type: "text" as const,
              text: appendNextSteps(lines.join("\n"), "whatap_list_agents"),
            },
          ],
        };
      } catch (err) {
        return classifyAndBuildError(err, {
          toolName: "whatap_install_agent",
          projectCode,
        });
      }
    }
  );
}
