# whatap-mcp — Claude Code Context

MCP server bridging AI assistants to WhaTap monitoring. 9 tools (3 project + 3 yard + 2 mesh + 1 install), path-centric MXQL catalog (640 entries from yard), semantic result classification, live-tested.

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
├── index.ts              # Entry: McpServer + StdioTransport
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
│   ├── mxql-catalog.ts   # AUTO-GENERATED: 640 CatalogEntry objects + raw MXQL (from yard)
│   ├── field-metadata.ts # AUTO-GENERATED: 131 categories, 2,605 field descriptions (from YAML)
│   └── install-guides.ts # 29 platforms, 9 INFRA OS variants, APM/DB/K8s/server-app guides
├── yard/
│   ├── catalog.ts        # Static catalog API: search, describe, fuzzyMatch, getPathsForCategory
│   ├── parser.ts         # .mql file parser: extracts categories, params, fields, headers
│   └── types.ts          # CatalogEntry, MqlMetadata, DomainSummary types
├── tools/
│   ├── index.ts          # registerAllTools() — dispatches to project + yard + mesh + install modules
│   ├── project.ts (3)    # list_projects, project_info, list_agents
│   ├── yard.ts (3)       # data_availability, describe_mxql, query_mxql
│   ├── mesh.ts (2)       # apm_anomaly (4-query parallel), service_topology (NPM)
│   └── install.ts (1)    # install_agent (fetch access + generate install commands for 29 platforms)
└── utils/
    ├── time.ts           # parseTimeRange("5m","1h","last 7 days") → {stime,etime}
    ├── format.ts         # MXQL results → Markdown tables, unit annotations, semantic headers, summary stats, field guide
    ├── response.ts       # classifyAndBuildError(), appendNextSteps(), buildNoDataResponse() — unified response system
    ├── descriptions.ts   # Shared parameter descriptions, MXQL param registry (17), English overlay (120 translations)
    ├── semantic.ts       # Result type classifier (timeseries/snapshot/ranking/inventory/events/aggregate), badge generator
    └── field-guide.ts    # Category field metadata lookup, field guide table, threshold alerts, analysis guidance
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
- **Catalog:** 640 static entries generated from yard .mql files; powers discovery, describe, fuzzy matching
- **Semantics:** `classifyResultType()` derives result type, grain, entity level from path patterns + catalog metadata
- **LLM Aids:** Unit annotations from `_head_`, ISO timestamps, summary stats, semantic badges, English descriptions (120)
- **Validation:** All tool params validated with Zod schemas

## Sysadmin Workflow

```
whatap_list_projects → get projectCode
        ↓
whatap_data_availability(projectCode) → returns MXQL paths with data
        ↓                                (2-min probe, path-centric response)
whatap_describe_mxql(path) → verify params, fields, raw MXQL
        ↓
whatap_query_mxql(projectCode, path) → execute and get results
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

## Tools (9)

| Tool | Description |
|------|-------------|
| `whatap_list_projects` | List all monitoring projects with pcode, name, platform |
| `whatap_project_info` | Get detailed info for a specific project |
| `whatap_list_agents` | List agents/instances for a project |
| `whatap_data_availability` | Browse catalog (640 queries), search, probe live data — with semantic badges |
| `whatap_describe_mxql` | Describe a query path: params, fields, best-for hints, example calls |
| `whatap_query_mxql` | Execute MXQL path query — semantic headers, unit annotations, summary stats |
| `whatap_apm_anomaly` | Multi-query APM anomaly detection (TPS, latency, errors, active TX per agent) |
| `whatap_service_topology` | Service connectivity map with bottleneck detection (requires NPM) |
| `whatap_install_agent` | Get agent install commands for 29 platforms with pre-filled credentials (auto-detects platform, optional OS filter) |

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

- **Version:** 1.0.0
- **Tools:** 9 (3 project + 3 yard + 2 mesh + 1 install)
- **Catalog:** 640 entries across 35 domains (generated from yard)
- **English translations:** 120 entries (all Korean descriptions covered)
- **LLM Pipeline Score:** 9.1/10
