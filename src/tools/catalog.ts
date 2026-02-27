import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WhatapApiClient } from "../api/client.js";
import { parseTimeRange } from "../utils/time.js";
import { formatMxqlResponse } from "../utils/format.js";
import { PARAM_PROJECT_CODE, PARAM_TIME_RANGE, PARAM_CATEGORY } from "../utils/descriptions.js";
import {
  buildErrorResponse,
  classifyAndBuildError,
  appendNextSteps,
  buildNoDataResponse,
} from "../utils/response.js";
import {
  getCategories,
  getCategoryByName,
  getDomains,
  CATEGORY_REGISTRY,
  type CategoryMeta,
} from "../data/categories.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCategoryTable(cats: CategoryMeta[]): string {
  const lines = [`## MXQL Categories (${cats.length} total)`, ""];
  lines.push("| Category | Domain | Description | Platforms |");
  lines.push("| --- | --- | --- | --- |");
  for (const c of cats) {
    lines.push(
      `| ${c.name} | ${c.domain} | ${c.description} | ${c.platforms.join(", ")} |`
    );
  }
  return lines.join("\n");
}

function formatFieldsDescription(cat: CategoryMeta): string {
  const tags = cat.fields.filter((f) => f.kind === "tag");
  const metrics = cat.fields.filter((f) => f.kind === "field");
  const lines: string[] = [];

  lines.push(`## Category: ${cat.name}`, "");
  lines.push(`- **Domain**: ${cat.domain}`);
  lines.push(`- **Description**: ${cat.description}`);
  lines.push(`- **Platforms**: ${cat.platforms.join(", ")}`);

  if (tags.length > 0) {
    lines.push("", "### Tags (Dimension Fields)", "");
    lines.push("| Field | Type | Description |");
    lines.push("| --- | --- | --- |");
    for (const f of tags) {
      lines.push(`| ${f.name} | ${f.type} | ${f.description} |`);
    }
  }

  if (metrics.length > 0) {
    lines.push("", "### Fields (Metric Values)", "");
    lines.push("| Field | Type | Description |");
    lines.push("| --- | --- | --- |");
    for (const f of metrics) {
      lines.push(`| ${f.name} | ${f.type} | ${f.description} |`);
    }
  }

  lines.push("", "### Example MXQL Query", "");
  lines.push("```");
  lines.push(cat.exampleMxql);
  lines.push("```");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Build MXQL from structured params
// ---------------------------------------------------------------------------

function buildMxqlFromParams(
  cat: CategoryMeta,
  opts: {
    fields?: string[];
    filters?: Record<string, string>;
    orderBy?: string;
    orderDir?: string;
  }
): string {
  const lines: string[] = [];
  lines.push(`CATEGORY ${cat.name}`);
  lines.push("TAGLOAD");

  // Filters
  if (opts.filters) {
    for (const [key, value] of Object.entries(opts.filters)) {
      lines.push(`FILTER {key:${key}, value:${value}}`);
    }
  }

  // SELECT — use provided fields or all fields from metadata
  const selectFields =
    opts.fields && opts.fields.length > 0
      ? opts.fields
      : cat.fields.map((f) => f.name);
  lines.push(`SELECT [${selectFields.join(", ")}]`);

  // ORDER
  if (opts.orderBy) {
    const dir = opts.orderDir ?? "desc";
    lines.push(`ORDER {key:[${opts.orderBy}], sort:[${dir}]}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export function registerCatalogTools(
  server: McpServer,
  client: WhatapApiClient
): void {
  // -----------------------------------------------------------------------
  // Tool 1: whatap_list_categories
  // -----------------------------------------------------------------------
  server.tool(
    "whatap_list_categories",
    "Use this to discover what types of monitoring data exist in WhaTap. " +
      "Returns all MXQL categories with domain, description, and supported platforms. " +
      "Filter by domain (server/apm/kubernetes/database/log/alert) or platform (JAVA/SERVER/KUBERNETES/etc.). " +
      "NEXT: Call whatap_describe_fields(category) to see queryable fields.",
    {
      domain: z
        .enum(["server", "apm", "kubernetes", "database", "log", "alert"])
        .optional()
        .describe("Filter categories by monitoring domain"),
      platform: z
        .string()
        .optional()
        .describe(
          "Filter categories by project platform (e.g., JAVA, SERVER, KUBERNETES, POSTGRESQL)"
        ),
    },
    async ({ domain, platform }) => {
      try {
        const cats = getCategories({ domain, platform });
        if (cats.length === 0) {
          const hint = domain
            ? `domain="${domain}"`
            : platform
              ? `platform="${platform}"`
              : "";
          return {
            content: [
              {
                type: "text" as const,
                text: `No categories found${hint ? ` for ${hint}` : ""}. Valid domains: ${getDomains().join(", ")}`,
              },
            ],
          };
        }
        const text = formatCategoryTable(cats);
        return {
          content: [
            { type: "text" as const, text: appendNextSteps(text, "whatap_list_categories") },
          ],
        };
      } catch (err) {
        return classifyAndBuildError(err, {
          toolName: "whatap_list_categories",
        });
      }
    }
  );

  // -----------------------------------------------------------------------
  // Tool 2: whatap_describe_fields
  // -----------------------------------------------------------------------
  server.tool(
    "whatap_describe_fields",
    "Use this to understand fields in an MXQL category before querying. " +
      "Shows tags (dimensions for filtering) vs fields (metric values), types, and example MXQL. " +
      "PREREQUISITE: category name from whatap_list_categories. " +
      "NEXT: whatap_query_category(projectCode, category, fields, timeRange) to query the data.",
    {
      category: z
        .string()
        .describe(PARAM_CATEGORY),
    },
    async ({ category }) => {
      try {
        const cat = getCategoryByName(category);
        if (!cat) {
          const available = CATEGORY_REGISTRY.map((c) => c.name).join(", ");
          return buildErrorResponse({
            message: `Unknown category: "${category}".`,
            hint: `Valid categories: ${available}`,
            suggestTool: "whatap_list_categories",
            retryable: false,
          });
        }
        const text = formatFieldsDescription(cat);
        return {
          content: [
            { type: "text" as const, text: appendNextSteps(text, "whatap_describe_fields") },
          ],
        };
      } catch (err) {
        return classifyAndBuildError(err, {
          toolName: "whatap_describe_fields",
          category,
        });
      }
    }
  );

  // -----------------------------------------------------------------------
  // Tool 3: whatap_check_availability
  // -----------------------------------------------------------------------
  server.tool(
    "whatap_check_availability",
    "Use this to verify which data categories have data for a project. " +
      "Probes each category with a minimal query. Omit category params to check all 15 at once. " +
      "PREREQUISITE: projectCode from whatap_list_projects. " +
      "WHEN TO USE: Before querying, to avoid empty results. " +
      "NEXT: Query available categories with whatap_query_category or domain tools.",
    {
      projectCode: z.number().describe(PARAM_PROJECT_CODE),
      category: z
        .string()
        .optional()
        .describe(
          "Single MXQL category to check (e.g., server_base). Omit to check all."
        ),
      categories: z
        .array(z.string())
        .optional()
        .describe(
          "Multiple MXQL categories to check at once. Takes precedence over 'category'."
        ),
      timeRange: z
        .string()
        .optional()
        .default("5m")
        .describe(
          'Time range for the probe (default: "5m"). Use wider range if data is sparse.'
        ),
    },
    async ({ projectCode, category, categories, timeRange }) => {
      try {
        // Determine which categories to check
        let toCheck: string[];
        if (categories && categories.length > 0) {
          toCheck = categories;
        } else if (category) {
          toCheck = [category];
        } else {
          toCheck = CATEGORY_REGISTRY.map((c) => c.name);
        }

        const { stime, etime } = parseTimeRange(timeRange ?? "5m");

        // Probe each category in parallel
        const probes = toCheck.map(async (catName) => {
          const cat = getCategoryByName(catName);
          // Pick the first two field names for a minimal SELECT
          const selectFields = cat
            ? cat.fields.slice(0, 2).map((f) => f.name)
            : ["oid", "oname"];

          const mql = [
            `CATEGORY ${catName}`,
            "TAGLOAD",
            `SELECT [${selectFields.join(", ")}]`,
          ].join("\n");

          try {
            const result = await client.executeMxqlText(projectCode, {
              stime,
              etime,
              mql,
              limit: 1,
            });
            const available = Array.isArray(result) && result.length > 0;
            const sampleFields = available
              ? Object.keys(result[0] as Record<string, unknown>)
              : [];
            return {
              category: catName,
              available,
              sampleFields,
              error: undefined,
            };
          } catch (err) {
            return {
              category: catName,
              available: false,
              sampleFields: [] as string[],
              error: (err as Error).message,
            };
          }
        });

        const results = await Promise.allSettled(probes);
        const rows = results.map((r) =>
          r.status === "fulfilled"
            ? r.value
            : {
                category: "unknown",
                available: false,
                sampleFields: [] as string[],
                error: String(r.reason),
              }
        );

        // Format output
        const availableCount = rows.filter((r) => r.available).length;
        const lines: string[] = [];

        if (rows.length === 1) {
          // Single category — detailed output
          const r = rows[0];
          lines.push("## Data Availability Check", "");
          lines.push(`- **Project**: ${projectCode}`);
          lines.push(`- **Category**: ${r.category}`);
          lines.push(`- **Available**: ${r.available ? "Yes" : "No"}`);
          if (r.sampleFields.length > 0) {
            lines.push(`- **Sample Fields**: ${r.sampleFields.join(", ")}`);
          }
          if (r.error) {
            lines.push(`- **Error**: ${r.error}`);
          }
          lines.push(`- **Time Range**: last ${timeRange ?? "5m"}`);
        } else {
          // Batch — table output
          lines.push(
            `## Data Availability — Project ${projectCode}`,
            ""
          );
          lines.push("| Category | Available | Sample Fields |");
          lines.push("| --- | --- | --- |");
          for (const r of rows) {
            const fields =
              r.sampleFields.length > 0
                ? r.sampleFields.join(", ")
                : r.error
                  ? `Error: ${r.error}`
                  : "-";
            lines.push(
              `| ${r.category} | ${r.available ? "Yes" : "No"} | ${fields} |`
            );
          }
          lines.push(
            "",
            `**Summary**: ${availableCount} of ${rows.length} categories have data in the last ${timeRange ?? "5m"}.`
          );
        }

        const text = lines.join("\n");
        return {
          content: [
            { type: "text" as const, text: appendNextSteps(text, "whatap_check_availability") },
          ],
        };
      } catch (err) {
        return classifyAndBuildError(err, {
          toolName: "whatap_check_availability",
          projectCode,
        });
      }
    }
  );

  // -----------------------------------------------------------------------
  // Tool 4: whatap_query_category
  // -----------------------------------------------------------------------
  server.tool(
    "whatap_query_category",
    "Use this to query any MXQL category with structured params — no MXQL syntax needed. " +
      "Auto-builds MXQL from category, fields, filters, and ordering. " +
      "WORKFLOW: 1) whatap_list_projects → pcode, 2) whatap_list_categories → category, " +
      "3) whatap_describe_fields → fields, 4) this tool → data. " +
      "Prefer domain tools (whatap_server_cpu, whatap_apm_tps) for simple common queries. " +
      "Use this for custom field selection, filters, or categories not covered by domain tools.",
    {
      projectCode: z.number().describe(PARAM_PROJECT_CODE),
      category: z
        .string()
        .describe(PARAM_CATEGORY),
      fields: z
        .array(z.string())
        .optional()
        .describe(
          "Fields to select. If omitted, selects all known fields for the category. Use whatap_describe_fields to see available fields."
        ),
      filters: z
        .record(z.string())
        .optional()
        .describe(
          'Key-value filters (e.g., {"oid": "12345"} or {"podStatus": "Running"})'
        ),
      orderBy: z
        .string()
        .optional()
        .describe("Field name to sort by (e.g., cpu, tps, memory_pused)"),
      orderDir: z
        .enum(["asc", "desc"])
        .optional()
        .default("desc")
        .describe("Sort direction (default: desc)"),
      timeRange: z
        .string()
        .describe(PARAM_TIME_RANGE),
      limit: z
        .number()
        .optional()
        .default(100)
        .describe("Maximum number of records to return (default: 100)"),
    },
    async ({
      projectCode,
      category,
      fields,
      filters,
      orderBy,
      orderDir,
      timeRange,
      limit,
    }) => {
      try {
        const cat = getCategoryByName(category);
        if (!cat) {
          const available = CATEGORY_REGISTRY.map((c) => c.name).join(", ");
          return buildErrorResponse({
            message: `Unknown category: "${category}".`,
            hint: `Valid categories: ${available}`,
            suggestTool: "whatap_list_categories",
            retryable: false,
          });
        }

        // Validate fields if provided
        if (fields && fields.length > 0) {
          const knownFields = new Set(cat.fields.map((f) => f.name));
          const unknown = fields.filter((f) => !knownFields.has(f));
          if (unknown.length > 0) {
            const valid = cat.fields.map((f) => f.name).join(", ");
            return buildErrorResponse({
              message: `Unknown field(s) for ${category}: ${unknown.join(", ")}.`,
              hint: `Valid fields: ${valid}`,
              suggestTool: "whatap_describe_fields",
              suggestToolArgs: `with category="${category}"`,
              retryable: false,
            });
          }
        }

        const { stime, etime } = parseTimeRange(timeRange);
        const mql = buildMxqlFromParams(cat, {
          fields,
          filters,
          orderBy,
          orderDir,
        });

        const result = await client.executeMxqlText(projectCode, {
          stime,
          etime,
          mql,
          limit: limit ?? 100,
        });

        if (Array.isArray(result) && result.length === 0) {
          return buildNoDataResponse({
            toolName: "whatap_query_category",
            projectCode,
            timeRange,
            category,
          });
        }

        const title = `${cat.name} — ${cat.description}`;
        const text = formatMxqlResponse(result, {
          title,
          maxRows: limit ?? 100,
        });
        return {
          content: [
            { type: "text" as const, text: appendNextSteps(text, "whatap_query_category") },
          ],
        };
      } catch (err) {
        return classifyAndBuildError(err, {
          toolName: "whatap_query_category",
          projectCode,
          category,
          timeRange,
        });
      }
    }
  );
}
