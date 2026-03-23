// src/tools/yard.ts
// Three MXQL tools — always registered, backed by static catalog + live probe.

import { z } from "../mcp/schema.js";
import type { McpServer } from "../mcp/server.js";
import type { WhatapApiClient } from "../api/client.js";
import { formatMxqlResponse } from "../utils/format.js";
import { parseTimeRange } from "../utils/time.js";
import {
  PARAM_PROJECT_CODE,
  PARAM_TIME_RANGE_OPTIONAL,
  PARAM_MXQL_PATH,
  MXQL_PARAM_REGISTRY,
  HEADER_UNIT_SUFFIX,
  ENGLISH_DESCRIPTIONS,
  translateDescription,
} from "../utils/descriptions.js";
import {
  classifyResultType,
  deriveBestFor,
  formatBadge,
} from "../utils/semantic.js";
import { getCategoryMeta } from "../utils/field-guide.js";
import {
  classifyAndBuildError,
  appendNextSteps,
  buildNoDataResponse,
} from "../utils/response.js";
import {
  getDomainSummary,
  searchEntries,
  describeMql,
  fuzzyMatch,
  getPathsForCategory,
  getAllBaseCategories,
  getCatalogSize,
} from "../yard/catalog.js";

import type { CatalogEntry } from "../yard/types.js";

// Fields that are dimensions/identifiers, not metrics
const NON_METRIC_FIELDS = new Set([
  "time", "oid", "oname", "pcode", "okind", "onode",
  "onodeName", "okindName", "path", "pname", "name",
  "namespace", "kind", "type", "reason", "status",
  "url", "host", "ip", "host_ip", "message", "title",
  "level", "category",
]);

// Auto-set params that should not appear as filters in badges
const AUTO_PARAMS = new Set([
  "$etime", "$stime", "$pcode", "$s_default", "$duration", "$limit",
]);

/** Format a path listing entry with optional semantic badge. */
function formatPathEntry(entry: CatalogEntry): string {
  const desc = entry.description
    ? ` — ${translateDescription(entry.path, entry.description)}`
    : "";
  const sem = classifyResultType(entry.path, {
    selectFields: entry.selectFields,
  });
  const metrics = entry.selectFields
    .map((f) => f.replace(/^['"]|['"]$/g, ""))
    .filter((f) =>
      !NON_METRIC_FIELDS.has(f) &&
      !f.startsWith("$") &&
      f !== f.toUpperCase() // skip ALL_CAPS internal vars
    );
  const filters = entry.parameters
    .filter((p) =>
      !AUTO_PARAMS.has(p) &&
      !p.toUpperCase().includes("MERGE") &&
      !p.toUpperCase().includes("PLACE")
    )
    .map((p) => p.slice(1));
  const badge = formatBadge(sem, {
    metrics: metrics.slice(0, 3),
    filters: filters.length > 0 ? filters : undefined,
  });
  return `- \`${entry.path}\`${desc}\n  \`${badge}\``;
}

const HEADER_TYPE_LEGEND: Record<string, string> = {
  P: "Percentage (%)",
  F: "Float",
  I: "Integer",
  B: "Bytes",
  ms: "Milliseconds",
  "0": "Raw numeric",
};

/** Categories to probe for live data availability */
const PROBE_CATEGORIES: Array<{
  name: string;
  loadType: "TAGLOAD" | "FLEXLOAD" | "LogCountLoad" | "unknown";
  label: string;
}> = [
  { name: "server_base", loadType: "TAGLOAD", label: "Server" },
  { name: "server_disk", loadType: "TAGLOAD", label: "Server Disk" },
  { name: "server_network", loadType: "TAGLOAD", label: "Server Network" },
  { name: "server_process", loadType: "TAGLOAD", label: "Server Process" },
  { name: "app_counter", loadType: "TAGLOAD", label: "APM" },
  { name: "app_active_stat", loadType: "TAGLOAD", label: "APM Active TX" },
  { name: "kube_pod_stat", loadType: "TAGLOAD", label: "K8s Pod" },
  { name: "kube_node", loadType: "TAGLOAD", label: "K8s Node" },
  { name: "kube_event", loadType: "TAGLOAD", label: "K8s Event" },
  { name: "container", loadType: "TAGLOAD", label: "Container" },
  { name: "db_real_counter", loadType: "TAGLOAD", label: "Database" },
  { name: "db_agent_list", loadType: "FLEXLOAD", label: "DB Agent List" },
  { name: "logsink_stats", loadType: "TAGLOAD", label: "Log Sink" },
];

export function registerYardTools(
  server: McpServer,
  client: WhatapApiClient
): void {
  // ── Tool 1: whatap_data_availability ──

  server.tool(
    "whatap_data_availability",
    "Browse available MXQL queries from the WhaTap yard (production query catalog). " +
      "Use this to discover what data you can query.\n\n" +
      "USAGE:\n" +
      "- No params → domain summary table (domain, count, description)\n" +
      '- domain="v2/sys" → list all query paths in that domain\n' +
      '- search="cpu" → keyword search across all paths/descriptions\n' +
      '- category="server_base" → reverse lookup: which query paths use this category\n' +
      "- projectCode=12345 → live probe: which data categories have active data\n\n" +
      "WORKFLOW:\n" +
      "1. whatap_data_availability() → see domains\n" +
      '2. whatap_data_availability(domain="v2/sys") → see queries\n' +
      "3. whatap_describe_mxql(path) → see query details\n" +
      "4. whatap_query_mxql(projectCode, path) → execute query",
    {
      domain: z
        .string()
        .optional()
        .describe(
          'Domain to list (e.g., "v2/sys", "v2/app", "v2/container", "v2/db"). Omit for summary.'
        ),
      search: z
        .string()
        .optional()
        .describe(
          'Keyword to search across paths and descriptions (e.g., "cpu", "pod", "tps").'
        ),
      category: z
        .string()
        .optional()
        .describe(
          'MXQL category name for reverse lookup (e.g., "server_base", "app_counter"). Shows which query paths use this category.'
        ),
      projectCode: z
        .number()
        .optional()
        .describe(
          "Project code for live data probe. When provided, probes ~13 base categories to detect which have active data."
        ),
    },
    async ({ domain, search, category, projectCode }) => {
      try {
        // ── Live probe mode ──
        if (projectCode !== undefined) {
          const probeResults = await client.probeCategoriesForProject(
            projectCode,
            PROBE_CATEGORIES.map((p) => ({
              name: p.name,
              loadType: p.loadType,
            }))
          );

          const active: typeof PROBE_CATEGORIES = [];
          const inactive: typeof PROBE_CATEGORIES = [];
          for (const p of PROBE_CATEGORIES) {
            if (probeResults.get(p.name)) {
              active.push(p);
            } else {
              inactive.push(p);
            }
          }

          const lines = [
            `## Data Availability — Project ${projectCode}`,
            "",
            `Probed ${PROBE_CATEGORIES.length} categories (last 2 minutes). ${active.length} active, ${inactive.length} inactive.`,
            "",
          ];

          if (active.length > 0) {
            let totalPaths = 0;
            const pathLines: string[] = [];
            for (const p of active) {
              const paths = getPathsForCategory(p.name);
              totalPaths += paths.length;
              if (paths.length === 0) {
                pathLines.push(`**${p.label}** (\`${p.name}\`): (no catalog paths)`);
                pathLines.push("");
                continue;
              }
              pathLines.push(`**${p.label}** (\`${p.name}\`):`);
              const shown = paths.slice(0, 5);
              for (const entry of shown) {
                pathLines.push(formatPathEntry(entry));
              }
              if (paths.length > 5) {
                pathLines.push(`  (+${paths.length - 5} more — use \`whatap_data_availability(category="${p.name}")\` to see all)`);
              }
              pathLines.push("");
            }

            lines.push(
              `### Available MXQL Paths (${totalPaths})`,
              "",
              ...pathLines,
            );
          }

          if (inactive.length > 0) {
            lines.push(
              `### Inactive (${inactive.length})`,
              "",
              inactive.map((p) => `\`${p.name}\``).join(", "),
              ""
            );
          }

          lines.push(
            '**Next**: Call `whatap_describe_mxql(path)` to see parameters and fields, or `whatap_query_mxql(projectCode, path)` to execute directly.'
          );

          return {
            content: [{ type: "text" as const, text: lines.join("\n") }],
          };
        }

        // ── Category reverse lookup ──
        if (category) {
          const entries = searchEntries({ category, search });
          if (entries.length === 0) {
            const allCats = getAllBaseCategories();
            const sample = allCats.slice(0, 15).join(", ");
            return {
              content: [
                {
                  type: "text" as const,
                  text:
                    `No queries found for category "${category}".\n\n` +
                    `**Available base categories** (${allCats.length} total): ${sample}${allCats.length > 15 ? ", ..." : ""}`,
                },
              ],
            };
          }

          const lines = [
            `## Category: ${category} (${entries.length} query paths)`,
            "",
          ];
          for (const e of entries) {
            lines.push(formatPathEntry(e));
          }
          lines.push(
            "",
            "**Next**: Call `whatap_describe_mxql(path)` to see query details."
          );
          return {
            content: [{ type: "text" as const, text: lines.join("\n") }],
          };
        }

        // ── Domain summary (no params) ──
        if (!domain && !search) {
          const summaries = getDomainSummary();
          const total = getCatalogSize();
          const lines = [
            `## MXQL Catalog — ${total} queries across ${summaries.length} domains`,
            "",
            "| Domain | Queries | Description |",
            "| --- | --- | --- |",
          ];
          for (const s of summaries) {
            lines.push(`| ${s.domain} | ${s.count} | ${s.description} |`);
          }
          lines.push(
            "",
            '**Next**: Call `whatap_data_availability(domain="v2/sys")` to list queries in a domain.'
          );
          return {
            content: [{ type: "text" as const, text: lines.join("\n") }],
          };
        }

        // ── Search or domain listing ──
        const entries = searchEntries({ domain, search });

        if (entries.length === 0) {
          const hint = domain
            ? `No queries found in domain "${domain}".`
            : `No queries matching "${search}".`;
          const summaries = getDomainSummary();
          const available = summaries.map((s) => s.domain).join(", ");
          return {
            content: [
              {
                type: "text" as const,
                text: `${hint}\n\n**Available domains**: ${available}`,
              },
            ],
          };
        }

        const title = domain
          ? `## Domain: ${domain} (${entries.length} queries)`
          : `## Search: "${search}" (${entries.length} matches)`;

        const lines = [title, ""];
        for (const e of entries) {
          lines.push(formatPathEntry(e));
        }

        return {
          content: [
            {
              type: "text" as const,
              text: appendNextSteps(lines.join("\n"), "whatap_data_availability"),
            },
          ],
        };
      } catch (err) {
        return classifyAndBuildError(err, {
          toolName: "whatap_data_availability",
        });
      }
    }
  );

  // ── Tool 2: whatap_describe_mxql ──

  server.tool(
    "whatap_describe_mxql",
    "Describe a specific MXQL query from the catalog. " +
      "Shows description, categories, parameters, output fields, header types, JOIN dependencies, and raw MXQL.\n\n" +
      "Use this before whatap_query_mxql to understand what a query does and what parameters it accepts.\n\n" +
      'Example: whatap_describe_mxql(path="v2/sys/server_base")',
    {
      path: z.string().describe(PARAM_MXQL_PATH),
    },
    async ({ path }) => {
      try {
        const result = describeMql(path);

        if (!result) {
          // Fuzzy match suggestions
          const suggestions = fuzzyMatch(path);
          const lines = [
            `**Error**: Query path "${path}" not found in the catalog.`,
          ];
          if (suggestions.length > 0) {
            lines.push("", "**Did you mean:**");
            for (const s of suggestions) {
              const desc = s.description
                ? ` — ${translateDescription(s.path, s.description)}`
                : "";
              lines.push(`- \`${s.path}\`${desc}`);
            }
          }
          lines.push(
            "",
            "Use `whatap_data_availability` to browse available queries."
          );
          return {
            content: [{ type: "text" as const, text: lines.join("\n") }],
            isError: true,
          };
        }

        const { entry, ...metadata } = result;
        const lines = [`## MXQL: ${path}`, ""];

        // Description — prefer English overlay, fall back to original comments
        const englishDesc = ENGLISH_DESCRIPTIONS[path];
        if (englishDesc) {
          lines.push(`**Description**: ${englishDesc}`, "");
        } else if (metadata.comments.length > 0) {
          lines.push(
            `**Description**: ${metadata.comments.join(" / ")}`,
            ""
          );
        }

        // Categories with modifier explanation
        if (metadata.categories.length > 0) {
          lines.push(
            `**Categories**: ${metadata.categories.map((c) => `\`${c}\``).join(", ")}`
          );
          const hasModifiers = metadata.categories.some((c) =>
            /\{[^}]+\}/.test(c)
          );
          if (hasModifiers) {
            lines.push(
              "*`{m5}` = 5-min rollup (ranges >1h), `{h1}` = 1-hour rollup (ranges >3d)*"
            );
          }
          lines.push("");
        }

        // Load type
        if (entry.loadType !== "unknown") {
          lines.push(`**Load type**: ${entry.loadType}`, "");
        }

        // Parameters — annotated with descriptions and kind
        if (metadata.parameters.length > 0) {
          const autoParams = metadata.parameters.filter(
            (p) => MXQL_PARAM_REGISTRY[p]?.kind === "auto"
          );
          const userParams = metadata.parameters.filter(
            (p) => MXQL_PARAM_REGISTRY[p]?.kind !== "auto"
          );

          if (userParams.length > 0) {
            lines.push("**Parameters**:");
            for (const p of userParams) {
              const info = MXQL_PARAM_REGISTRY[p];
              if (info) {
                lines.push(`- \`${p}\` (${info.kind}) — ${info.desc}`);
              } else {
                lines.push(`- \`${p}\` — query-specific parameter`);
              }
            }
            lines.push("");
          }
          if (autoParams.length > 0) {
            lines.push(
              `*Auto-set parameters (no action needed)*: ${autoParams.map((p) => `\`${p}\``).join(", ")}`,
              ""
            );
          }
        }

        // Output fields — annotated with units, oid suppressed when oname present
        if (metadata.selectFields.length > 0) {
          let fields = metadata.selectFields;
          if (fields.includes("oname") && fields.includes("oid")) {
            fields = fields.filter((f) => f !== "oid");
          }
          const annotated = fields.map((f) => {
            const suffix = HEADER_UNIT_SUFFIX[metadata.headerTypes[f]];
            return suffix ? `\`${f}\` (${suffix})` : `\`${f}\``;
          });
          lines.push(`**Output fields**: ${annotated.join(", ")}`, "");
        }

        // Field types (compact)
        if (Object.keys(metadata.headerTypes).length > 0) {
          lines.push("**Field types**:");
          for (const [field, type] of Object.entries(metadata.headerTypes)) {
            const desc = HEADER_TYPE_LEGEND[type] ?? type;
            lines.push(`- \`${field}\`: ${desc}`);
          }
          lines.push("");
        }

        // JOINs
        if (metadata.joins.length > 0) {
          lines.push(
            `**JOIN dependencies**: ${metadata.joins.map((j) => `\`${j}\``).join(", ")}`,
            ""
          );
        }

        // Category field descriptions (from YAML metadata)
        const descBaseCategory = entry.baseCategories[0];
        if (descBaseCategory) {
          const catMeta = getCategoryMeta(descBaseCategory);
          if (catMeta) {
            lines.push(
              `**Category**: ${catMeta.title} — ${catMeta.description}`
            );
            if (catMeta.platforms.length > 0) {
              lines.push(`**Platforms**: ${catMeta.platforms.join(", ")}`);
            }
            lines.push("");

            // Field descriptions with thresholds
            const normalizedFields = metadata.selectFields.map((f) =>
              f.replace(/^['"]|['"]$/g, "")
            );
            const described = normalizedFields
              .filter((f) => catMeta.fields[f]?.description)
              .slice(0, 8);
            if (described.length > 0) {
              lines.push("**Field descriptions**:");
              for (const f of described) {
                const fm = catMeta.fields[f];
                const thresh = fm.normal_operation?.recommended
                  ? ` (recommended: ${fm.normal_operation.recommended})`
                  : "";
                lines.push(`- \`${f}\`: ${fm.description}${thresh}`);
              }
              lines.push("");
            }
          }
        }

        // Semantic hints
        const sem = classifyResultType(path, {
          selectFields: metadata.selectFields,
          rawMxql: metadata.raw,
        });
        lines.push(`**Best for**: ${deriveBestFor(sem)}`);
        if (sem.resultType === "timeseries") {
          lines.push(
            "**Note**: If result is truncated, visible rows are a sample — do not infer global ranking."
          );
        } else if (sem.resultType === "ranking") {
          lines.push(
            "**Note**: Rows are pre-sorted by metric. Safe for top-N claims."
          );
        } else if (sem.resultType === "inventory") {
          lines.push(
            "**Note**: Returns a complete list. Safe for counting."
          );
        }
        lines.push("");

        // Raw MXQL — simplified (strip internal directives)
        if (metadata.raw) {
          const simplified = metadata.raw
            .split("\n")
            .filter((line) => {
              const t = line.trim();
              if (!t) return false;
              return !(
                t.startsWith("INJECT") ||
                t.startsWith("RENAME") ||
                t.startsWith("CREATE") ||
                t.startsWith("FIRST-ONLY") ||
                t.startsWith("APPEND")
              );
            })
            .join("\n")
            .trim();
          if (simplified) {
            lines.push("### Raw MXQL", "", "```", simplified, "```");
          }
        }

        // Example call
        lines.push(
          "",
          "### Example",
          "",
          "```",
          `whatap_query_mxql(projectCode=<PCODE>, path="${path}", timeRange="5m")`,
          "```"
        );

        // Filter example when filter params exist
        const filterParams = metadata.parameters.filter(
          (p) => MXQL_PARAM_REGISTRY[p]?.kind === "filter"
        );
        if (filterParams.length > 0) {
          const exampleParam = filterParams[0].slice(1); // strip $
          lines.push(
            "",
            "To filter by agent:",
            "",
            "```",
            `whatap_query_mxql(projectCode=<PCODE>, path="${path}", params={"${exampleParam}": "<VALUE>"})`,
            "```"
          );
        }

        return {
          content: [
            {
              type: "text" as const,
              text: appendNextSteps(lines.join("\n"), "whatap_describe_mxql"),
            },
          ],
        };
      } catch (err) {
        return classifyAndBuildError(err, {
          toolName: "whatap_describe_mxql",
        });
      }
    }
  );

  // ── Tool 3: whatap_query_mxql ──

  server.tool(
    "whatap_query_mxql",
    "Execute an MXQL query from the yard via the WhaTap API path endpoint. " +
      "The API server resolves the .mql file path and executes it.\n\n" +
      "PREREQUISITES:\n" +
      "- projectCode from whatap_list_projects\n" +
      "- path from whatap_data_availability or whatap_describe_mxql\n\n" +
      'Example: whatap_query_mxql(projectCode=12345, path="v2/sys/server_base")\n\n' +
      "Pass params for queries that accept $-prefixed parameters (e.g., $oid, $okind).",
    {
      projectCode: z.number().describe(PARAM_PROJECT_CODE),
      path: z.string().describe(PARAM_MXQL_PATH),
      timeRange: z
        .string()
        .default("5m")
        .describe(PARAM_TIME_RANGE_OPTIONAL),
      params: z
        .record(z.string())
        .optional()
        .describe(
          'Query parameters for $-prefixed variables. Example: {"oid": "12345", "okind": "myApp"}'
        ),
      limit: z
        .number()
        .default(100)
        .describe("Maximum rows to return (default: 100)."),
    },
    async ({ projectCode, path, timeRange, params, limit }) => {
      try {
        const { stime, etime } = parseTimeRange(timeRange);

        // Path endpoint requires leading "/"
        const mqlPath = path.startsWith("/") ? path : `/${path}`;

        const result = await client.executeMxqlPath(projectCode, {
          stime,
          etime,
          mql: mqlPath,
          limit,
          param: params,
        });

        if (Array.isArray(result) && result.length === 0) {
          return buildNoDataResponse({
            toolName: "whatap_query_mxql",
            projectCode,
            timeRange,
          });
        }

        // Detect "not found" returned as a data row (server returns 200 with error in body)
        if (
          Array.isArray(result) &&
          result.length === 1 &&
          typeof result[0] === "object" &&
          result[0] !== null &&
          "error" in result[0]
        ) {
          const errorMsg = String((result[0] as Record<string, unknown>).error);
          if (errorMsg.includes("not found")) {
            const suggestions = fuzzyMatch(path, 5);
            const lines = [`**Error**: MXQL path "${path}" not found on the server.`];
            if (suggestions.length > 0) {
              lines.push("", "**Did you mean:**");
              for (const s of suggestions) {
                const desc = s.description
                ? ` — ${translateDescription(s.path, s.description)}`
                : "";
                lines.push(`- \`${s.path}\`${desc}`);
              }
            }
            lines.push("", `Use \`whatap_data_availability(projectCode=${projectCode})\` to see available paths.`);
            return { content: [{ type: "text" as const, text: lines.join("\n") }], isError: true };
          }
        }

        // Check for no data after filtering metadata rows
        const dataRows = Array.isArray(result)
          ? result.filter(
              (r: Record<string, unknown>) =>
                !r["_head_"] && !r["error"]
            )
          : [];
        if (dataRows.length === 0) {
          return buildNoDataResponse({
            toolName: "whatap_query_mxql",
            projectCode,
            timeRange,
            category: describeMql(path)?.entry.baseCategories[0],
          });
        }

        // Auto-resolve oid → oname if result has oid but no oname
        if (Array.isArray(result)) {
          const sampleRow = dataRows[0] as Record<string, unknown> | undefined;
          if (sampleRow && "oid" in sampleRow && !("oname" in sampleRow)) {
            const oids = new Set<number>();
            for (const row of dataRows) {
              const r = row as Record<string, unknown>;
              if (typeof r.oid === "number") oids.add(r.oid);
            }
            if (oids.size > 0) {
              const resolved = await client.resolveOids(
                projectCode,
                Array.from(oids)
              );
              if (resolved.size > 0) {
                for (const row of result as Array<Record<string, unknown>>) {
                  if (typeof row.oid === "number") {
                    const info = resolved.get(row.oid);
                    if (info) row.oname = info.oname;
                  }
                }
              }
            }
          }
        }

        // Classify result type from catalog metadata
        const catalogInfo = describeMql(path);
        const querySem = classifyResultType(path, {
          selectFields: catalogInfo?.selectFields,
          rawMxql: catalogInfo?.raw,
        });

        const baseCategory = catalogInfo?.entry.baseCategories[0];

        const text = formatMxqlResponse(result, {
          title: path,
          maxRows: limit,
          queryMeta: { stime, etime },
          semantics: querySem,
          fieldGuide: baseCategory ? { category: baseCategory } : undefined,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: appendNextSteps(text, "whatap_query_mxql"),
            },
          ],
        };
      } catch (err) {
        // Fuzzy path suggestions on "not found" errors
        const errMsg = (err as Error).message ?? String(err);
        if (errMsg.includes("not found") || errMsg.includes("404")) {
          const suggestions = fuzzyMatch(path, 5);
          const lines = [`**Error**: MXQL path "${path}" not found on the server.`];
          if (suggestions.length > 0) {
            lines.push("", "**Did you mean:**");
            for (const s of suggestions) {
              const desc = s.description
                ? ` — ${translateDescription(s.path, s.description)}`
                : "";
              lines.push(`- \`${s.path}\`${desc}`);
            }
          }
          lines.push("", `Use \`whatap_data_availability(projectCode=${projectCode})\` to see available paths.`);
          return { content: [{ type: "text" as const, text: lines.join("\n") }], isError: true };
        }
        return classifyAndBuildError(err, {
          toolName: "whatap_query_mxql",
          projectCode,
          timeRange,
        });
      }
    }
  );
}
