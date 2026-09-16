# whatap-mcp — Claude Code Context

MCP server bridging AI assistants to WhaTap monitoring. 11 tools (3 project + 3 data + 2 mesh + 1 install + 1 promql + 1 log), MXQL catalog (815 entries) + PromQL/OpenMetrics support, semantic result classification, live-tested.

## Commands

```bash
npm run build          # Build ESM bundle via tsup → dist/
npm run dev            # Dev mode: WHATAP_API_TOKEN=xxx npx tsx src/index.ts
npm start              # Production: node dist/index.js
npm run generate-catalog <yard-path>  # Regenerate static catalog from .mql files
npx @modelcontextprotocol/inspector node dist/index.js   # Test with MCP Inspector
```

## Source Layout

```
src/
├── index.ts              # Entry: McpServer + StdioTransport + --version flag
├── version.ts            # Single source of truth for VERSION constant
├── config.ts             # Loads WHATAP_API_TOKEN, WHATAP_API_URL from env
├── mcp/
│   ├── types.ts          # JSON-RPC + MCP protocol interfaces
│   ├── schema.ts         # Zod-compatible schema builder (z.string, z.number, etc.)
│   ├── transport.ts      # ReadBuffer + StdioTransport (newline-delimited JSON)
│   ├── protocol.ts       # JSON-RPC dispatch + initialize handshake
│   └── server.ts         # McpServer class with tool() API
├── api/
│   ├── client.ts         # WhatapApiClient — HTTP, two-tier auth, token cache, category probing
│   └── types.ts          # TypeScript interfaces (Project, Agent, MxqlTextParams, MxqlPathParams)
├── data/
│   ├── mxql-catalog.ts   # AUTO-GENERATED: 815 CatalogEntry objects + raw MXQL (from yard, build-layout deduped)
│   ├── field-metadata.ts # AUTO-GENERATED: 131 categories, 2,605 field descriptions (from YAML)
│   ├── install-guides.ts # 29 platforms, 9 INFRA OS variants, APM/DB/K8s/server-app guides
│   ├── mxql-comment-translations.ts # HAND-MAINTAINED: 135 Korean .mql comment lines → English
│   └── field-metadata-en.ts # HAND-MAINTAINED: English overrides for 16 Korean YAML descriptions
└── utils/
    ├── format-promql.ts  # PromQL result formatter (group by label set, OpenMetrics list)
├── yard/
│   ├── catalog.ts        # Static catalog API: search, describe, fuzzyMatch, getPathsForCategory
│   ├── paths.ts          # Catalog path normalization (strips Maven src/main/resources + target/classes)
│   ├── markers.ts        # Unresolved yard marker detection (scanMarkers, isTemplateCategory)
│   ├── parser.ts         # .mql file parser: extracts categories, params, fields, headers
│   └── types.ts          # CatalogEntry, MqlMetadata, DomainSummary types
├── tools/
│   ├── index.ts          # registerAllTools() — dispatches to project + yard + mesh + install modules
│   ├── project.ts (3)    # list_projects, project_info, list_agents
│   ├── yard.ts (3)       # data_availability, describe_query, query_data (+PromQL/savedQuery)
│   ├── mesh.ts (2)       # apm_anomaly (4-query parallel), service_topology (NPM)
│   ├── install.ts (1)    # install_agent (fetch access + generate install commands for 29 platforms)
│   ├── promql.ts (1)     # create_promql (validate + save reusable PromQL queries)
│   └── log.ts (1)        # log_search (LogCountLoad count mode + LOGSINKLOAD content mode, capped)
└── utils/
    ├── time.ts           # parseTimeRange("5m","1h","last 7 days") → {stime,etime}
    ├── format.ts         # MXQL results → Markdown tables, unit annotations, semantic headers, summary stats, field guide
    ├── response.ts       # classifyAndBuildError(), appendNextSteps(), buildNoDataResponse() — unified response system
    ├── descriptions.ts   # Shared parameter descriptions, MXQL param registry (17), English overlay (120 translations)
    ├── semantic.ts       # Result type classifier (timeseries/snapshot/ranking/inventory/events/aggregate), badge generator
    ├── field-guide.ts    # Category field metadata lookup (+English overrides), field guide table, threshold alerts, analysis guidance
    └── mxql-comments.ts  # Comment-aware Korean→English rewriter for raw MXQL (display-only)
scripts/
└── generate-catalog.ts   # Build-time: scan yard .mql files → src/data/mxql-catalog.ts
tests/
├── codex-mcp-test-v2.sh  # 30-prompt automated test via codex CLI
└── codex-mcp-test-v3.sh  # Acceptance test script (25 prompts)
```

## Architecture

- **Transport:** stdio (JSON-RPC) — custom zero-dependency implementation (`src/mcp/`, 673 lines)
- **Auth:** Account token → listProjects → project tokens cached in `Map<pcode, token>`
- **Data:** MXQL path endpoint (`POST /open-mcp/api/flush/mxql/path`) for yard queries; text endpoint for probing
- **Catalog:** 815 static entries generated from yard .mql files; powers discovery, describe, fuzzy matching
- **Semantics:** `classifyResultType()` derives result type, grain, entity level from path patterns + catalog metadata
- **LLM Aids:** Unit annotations from `_head_`, ISO timestamps, summary stats, semantic badges, English descriptions (120)
- **Validation:** All tool params validated with Zod schemas

## Sysadmin Workflow

```
whatap_list_projects → get projectCode
        ↓
whatap_data_availability(projectCode) → MXQL paths + OpenMetrics + saved PromQL
        ↓                                (2-min probe, path-centric response)
whatap_describe_query(path) → verify params, fields, raw MXQL
        ↓
whatap_query_data(projectCode, path) → execute and get results
```

## PromQL Workflow

```
whatap_data_availability(projectCode) → discover OpenMetrics + suggested PromQL
        ↓
whatap_create_promql(projectCode, name, query) → validate + save for reuse
        ↓
whatap_query_data(projectCode, savedQuery="name") → execute saved query
```

## Agent Install Workflow

```
whatap_list_projects → get projectCode + platform
        ↓
whatap_install_agent(projectCode) → access credentials + install commands
        ↓                           (auto-detects platform from project)
Execute commands on target server → install, configure, start agent
        ↓
whatap_list_agents(projectCode) → verify agent appears
```

## Log Search Workflow

```
whatap_data_availability(projectCode) → confirm "Log Sink" is active
        ↓
whatap_log_search(projectCode, category="AppLog", mode="count", filters={"level":"ERROR"})
        ↓                                      (LogCountLoad — safe, ≤24h, ≤1000 rows)
whatap_log_search(projectCode, category="AppLog", mode="content",
                  filters={"level":"ERROR","host":"web-01"}, timeRange="15m")
        ↓                                      (LOGSINKLOAD — capped: ≤1h, ≤100 lines, mandatory non-wildcard filter)
```

Yard guards apply server-side: 30s query timeout, 512 MB / 30s CPU breaker,
max 3 concurrent MXQL queries per project (`mcp_api_call_limit`).

## MXQL Critical Gotchas

> These cause silent failures (empty results, not errors). Memorize them.

1. JSON field is **`mql`** not `mxql`
2. JSON field is **`param`** not `params` (singular)
3. **`pageKey: "mxql"`** is required in every request (auto-set by client)
4. FILTER: **`{key:field, value:val}`** — colon syntax, not `field = val`
5. FILTER like: **`{key:field, like:pattern}`** — for substring matching
6. ORDER: **`{key:[field], sort:[desc]}`** — brackets around field and sort
7. SELECT: **`SELECT [field1, field2]`** — brackets required
8. **`TAGLOAD`** must follow `CATEGORY` — without it, no data loads
9. Field names are **case-sensitive** — `cpu_usr` not `cpuUsr`
10. Times are **Unix milliseconds** — not seconds

## MXQL Query Pattern

```
CATEGORY {category_name}
TAGLOAD
[FILTER {key:field, value:val}]
SELECT [field1, field2, ...]
[ORDER {key:[field], sort:[desc]}]
```

## WhaTap API Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/open-mcp/api/json/projects` | GET | Account | List projects (+ cache tokens) |
| `/open-mcp/api/json/project` | GET | Project | Project info |
| `/open-mcp/json/agents` | GET | Project | Agent list |
| `/open-mcp/api/flush/mxql/text` | POST | Project | MXQL text queries (probing) |
| `/open-mcp/api/flush/mxql/path` | POST | Project | MXQL path queries (yard .mql files) |
| `/open-mcp/api/json/project/access/{pcode}` | GET | Project | Agent access credentials (accesskey + server) |

## Tools (11)

| Tool | Description |
|------|-------------|
| `whatap_list_projects` | List all monitoring projects with pcode, name, platform |
| `whatap_project_info` | Get detailed info for a specific project |
| `whatap_list_agents` | List agents/instances for a project |
| `whatap_data_availability` | Browse MXQL catalog + OpenMetrics discovery + saved PromQL queries |
| `whatap_describe_query` | Describe MXQL path or OpenMetrics metric (labels, type, suggested PromQL) |
| `whatap_query_data` | Execute MXQL path, ad-hoc PromQL, or saved PromQL query |
| `whatap_create_promql` | Create, validate, and save a reusable PromQL query for OpenMetrics data |
| `whatap_apm_anomaly` | Multi-query APM anomaly detection (TPS, latency, errors, active TX per agent) |
| `whatap_service_topology` | Service connectivity map with bottleneck detection (requires NPM) |
| `whatap_install_agent` | Get agent install commands for 29 platforms with pre-filled credentials (auto-detects platform, optional OS filter) |
| `whatap_log_search` | Search log sink data — count mode (LogCountLoad, ≤24h/1000 rows) or content mode (LOGSINKLOAD, ≤1h/100 lines, mandatory non-wildcard filter) |

## Key Probe Categories

| Category | Label | Load Type |
|----------|-------|-----------|
| `server_base` | Server | TAGLOAD |
| `server_disk` | Server Disk | TAGLOAD |
| `server_network` | Server Network | TAGLOAD |
| `app_counter` | APM | TAGLOAD |
| `app_active_stat` | APM Active TX | TAGLOAD |
| `kube_pod_stat` | K8s Pod | TAGLOAD |
| `kube_node` | K8s Node | TAGLOAD |
| `kube_event` | K8s Event | TAGLOAD |
| `container` | Container | TAGLOAD |
| `db_real_counter` | Database | TAGLOAD |
| `db_agent_list` | DB Agent List | FLEXLOAD |
| `db_oracle_dma_sqlstat` | Oracle DMA SQL Stats | TAGLOAD |
| `db_oracle_sqlstat` | Oracle SQL Stats | TAGLOAD |
| `db_mysql_sqlstat` | MySQL SQL Stats | TAGLOAD |
| `db_postgresql_sqlstat` | PostgreSQL SQL Stats | TAGLOAD |
| `db_mssql_sqlstat` | MSSQL SQL Stats | TAGLOAD |
| `db_oracle_wait_class` | Oracle Wait Class | TAGLOAD |
| `db_oracle_dma_wait_class` | Oracle DMA Wait Class | TAGLOAD |
| `db_postgresql_wait_event` | PostgreSQL Wait Event | TAGLOAD |
| `db_tablespace` | Tablespace | TAGLOAD |
| `logsink_stats` | Log Sink | TAGLOAD |

## Catalog Domains (top 10)

| Domain | Queries | Description |
|--------|---------|-------------|
| flexboard | 112 | Dashboard queries |
| v2/aws | 61 | AWS CloudWatch metrics |
| cpm | 52 | Container performance monitoring |
| v2/container | 46 | Kubernetes: pods, nodes, containers |
| v2/sys | 43 | Server: CPU, memory, disk, network |
| v2/app | 39 | APM: TPS, response time, errors |
| v2/db | 38 | Database: sessions, waits, counters |
| mongo | 25 | MongoDB queries |
| redis | 24 | Redis queries |
| v2/rum/pageload | 20 | Real User Monitoring |

## Documentation

| Doc | Path |
|-----|------|
| User Manual | [docs/user-manual.md](docs/user-manual.md) |

## Current Status

- **Version:** 1.2.1 (single source: `src/version.ts`)
- **Tools:** 11 (3 project + 3 data + 2 mesh + 1 install + 1 promql + 1 log)
- **Catalog:** 815 entries across 35+ domains (generated from yard; 116 Maven build-layout duplicates collapsed)
- **English translations:** 130 description entries (120 base + 10 DB long session with unit info), 135 MXQL comment lines, 16 field-metadata overrides
- **Output language:** English only — `tests/no-korean-output.test.ts` fails the build if a catalog/field-metadata regeneration introduces untranslated Korean
- **LLM Pipeline Score:** 9.1/10

## Output Language (English-only guarantee)

MCP tool output is consumed by an LLM, which renders it into the end user's
language. Korean in the payload confuses non-Korean-speaking customers, so every
string the server *renders* is English.

Korean only enters through the two auto-generated data files. Three layers keep
it out of responses:

| Layer | Covers | Applied in |
|-------|--------|-----------|
| `ENGLISH_DESCRIPTIONS` (130) | catalog `description` fields | `translateDescription()` — `src/tools/yard.ts` |
| `MXQL_COMMENT_TRANSLATIONS` (135) | `--`, `#`, `/* */` comments in raw MXQL | `translateMxqlComments()` — `describe_query` display only |
| `CATEGORY/FIELD_DESCRIPTION_EN` (16) | Korean YAML field metadata | `getCategoryMeta()` — `src/utils/field-guide.ts` |

Two rules:

1. **Translation is display-only.** `whatap_query_data` sends `CATALOG_RAW` to the
   text endpoint verbatim — the stored MXQL must stay byte-identical to the yard
   source. Only `whatap_describe_query` translates its copy.
2. **`mxql/techross/*` Korean is data, not prose.** Those paths use Korean SCADA
   tag names as real metric identifiers (`P1_PV_AI_UF_1차압`). The rewriter is
   comment-aware so it never touches them.

After `npm run generate-catalog` or `npm run generate-field-metadata`, run
`npx vitest run tests/no-korean-output.test.ts` — it fails with the exact
untranslated strings to add.

## Catalog Hygiene (dedupe + template markers)

The yard lives in a Maven project, so every `.mql` exists twice on disk: under
`src/main/resources/` and as a byte-identical build copy under `target/classes/`.
The generator walked both trees, so 232 of 931 entries (24.9%) were duplicate
pairs. Tool responses go straight into LLM context, so a `category=` listing
could spend up to half its rows on copies (45 of 164 categories were affected).

**Rule 1 — paths are normalized at generation time.** `scripts/generate-catalog.ts`
runs every path through `normalizeCatalogPath()` (`src/yard/paths.ts`) and skips
a query already registered under another spelling. Catalog: **931 → 815 entries**,
zero queries lost. `canonicalCatalogPath()` still accepts the old prefixed
spellings, so a path copied from a pre-dedupe response keeps resolving.

**Rule 2 — marker text is not a category name.** 14 of 164 base categories were
unsubstituted yard markers (`<%CATEGORY%>`, `db_oracle_dma_sqlstat<%TIMEUNIT%>`,
a bare `<%`). All 62 entries carrying them are non-executable templates, so
`isTemplateCategory()` keeps them out of the category index and the browsable
list (**164 → 150**). Asking for one by name returns an explanation rather than a
bare "not found".

`tests/catalog-dedupe.test.ts` locks both rules in. Known follow-ups, left alone
deliberately:

- `$category` (11 paths, all executable) is a runtime `$`-parameter, not a real
  category — still listed. Removing it would hide executable log paths from
  `category=`, so it needs a separate call.
- `db3_stat_httpc[h1}` is a brace typo in the upstream collector `.mql`, tracked
  in PLAT-854 — not fixable here.
