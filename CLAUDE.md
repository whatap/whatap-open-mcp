# whatap-mcp — Claude Code Context

MCP server bridging AI assistants to WhaTap monitoring. 34 tools, 9 categories, live-tested.

## Commands

```bash
npm run build          # Build ESM bundle via tsup → dist/
npm run dev            # Dev mode: WHATAP_API_TOKEN=xxx npx tsx src/index.ts
npm start              # Production: node dist/index.js
npx @modelcontextprotocol/inspector node dist/index.js   # Test with MCP Inspector
```

## Source Layout

```
src/
├── index.ts              # Entry: McpServer + StdioServerTransport
├── config.ts             # Loads WHATAP_API_TOKEN, WHATAP_API_URL from env
├── api/
│   ├── client.ts         # WhatapApiClient — HTTP, two-tier auth, token cache, error detection
│   ├── types.ts          # TypeScript interfaces (Project, Agent, MxqlTextParams)
│   └── mxql.ts           # 23 MXQL query builder functions
├── data/                 # Category/field metadata for catalog tools
├── tools/
│   ├── index.ts          # registerAllTools() — dispatches to 9 modules
│   ├── catalog.ts (4)    # list_categories, describe_fields, check_availability, query_category
│   ├── project.ts (3)    # list_projects, project_info, list_agents
│   ├── server.ts (7)     # cpu, memory, disk, network, process, cpu_load, top
│   ├── apm.ts (6)        # tps, response_time, error, apdex, active_tx, tx_stats
│   ├── kubernetes.ts (6) # node_list, node_cpu, node_memory, pod_status, container_top, events
│   ├── database.ts (4)   # instance_list, db_stat, active_sessions, wait_analysis
│   ├── log.ts (2)        # log_search, log_stats
│   ├── alert.ts (1)      # alerts (event → kube_event fallback)
│   └── mxql.ts (1)       # raw MXQL query
└── utils/
    ├── time.ts           # parseTimeRange("5m","1h","last 7 days") → {stime,etime}
    ├── format.ts         # MXQL results → Markdown tables
    ├── response.ts       # classifyAndBuildError(), appendNextSteps() — unified response system
    └── descriptions.ts   # Shared parameter description constants
tests/
├── scenario-test.ts      # 3-scenario automated test (smart project selection, NL questions)
└── report.md             # Generated test report (Markdown)
```

## Architecture

- **Transport:** stdio (JSON-RPC) via `@modelcontextprotocol/sdk`
- **Auth:** Account token → listProjects → project tokens cached in `Map<pcode, token>`
- **Data:** Most tools use MXQL via `POST /open/api/flush/mxql/text`
- **Validation:** All tool params validated with Zod schemas

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
| `/open/api/json/projects` | GET | Account | List projects (+ cache tokens) |
| `/open/api/json/project` | GET | Project | Project info |
| `/open/json/agents` | GET | Project | Agent list |
| `/open/api/flush/mxql/text` | POST | Project | MXQL queries (most tools) |
| `/open/api/flush/mxql/path` | POST | Project | Pre-defined MXQL paths |

## Key MXQL Categories

| Category | Domain | Key Fields |
|----------|--------|------------|
| `server_base` | Server CPU/memory/load | oid, oname, cpu, memory_pused, cpu_load1/5/15 |
| `server_disk` | Disk I/O | readIops, writeIops, usedPercent, mountPoint |
| `server_network` | Network I/O | desc, in, out |
| `server_process` | Process stats | pid, name, cpu, rss, memory |
| `app_counter` | APM metrics | tps, tx_time, tx_count, tx_error, apdex_* |
| `app_active_stat` | Active transactions | active_tx_count, active_tx_0/3/8 |
| `kube_pod_stat` | K8s pods | podName, podStatus, namespace, restartCount |
| `kube_container_stat` | K8s containers | containerName, cpu_usage, mem_usage |
| `kube_event` | K8s events | type, reason, message, namespace |
| `db_counter` | DB stats | active_sessions, lock_wait, cpu, memory |
| `db_active_session` | DB sessions | sid, sql_text, wait_event, elapsed_time |
| `db_wait_event` | DB waits (Oracle) | wait_class, wait_event, time_waited |
| `app_log` | Log entries | time, content, oname, category |
| `app_log_count` | Log volume | time, count, category |
| `event` | Alerts | time, title, message, level |

## Adding a New Tool

1. Add query builder in `src/api/mxql.ts`
2. Register tool in `src/tools/<category>.ts` with Zod schema
3. If new category file → import in `src/tools/index.ts`
4. `npm run build` → test with MCP Inspector
5. Update: `docs/tool-catalog.md`, `docs/mxql-reference.md`, `README.md`, this file

## Documentation

| Doc | Path |
|-----|------|
| Architecture | [docs/architecture.md](docs/architecture.md) |
| API Client | [docs/api-client.md](docs/api-client.md) |
| MXQL Reference | [docs/mxql-reference.md](docs/mxql-reference.md) |
| Tool Catalog (34 tools) | [docs/tool-catalog.md](docs/tool-catalog.md) |
| Testing | [docs/testing.md](docs/testing.md) |
| Contributing | [docs/contributing.md](docs/contributing.md) |
| Release Process | [docs/release-process.md](docs/release-process.md) |
| Session Log | [docs/session-log.md](docs/session-log.md) |
| ADR Index | [docs/adr/README.md](docs/adr/README.md) |

## Session Workflow

- **Start:** Read this file (auto), check `docs/session-log.md`
- **During:** Log tasks in session-log, create ADRs for decisions
- **End:** Update session-log "Notes for Next Session" + this "Current Status"

## Current Status

- **Version:** 1.0.0
- **Tools:** 34 (30 domain + 4 catalog/discovery)
- **Last Session:** 4 — Catalog tools, scenario test, smart project selection
- **Test Results:** 100% success, 81% has-data, 95.2% next-steps (21 calls across 3 scenarios)
- **Next:** DB/log scenario tests, npm publish, unit tests for MXQL builders
