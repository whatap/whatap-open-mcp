# Session Log

Reverse-chronological log of development sessions. Each session entry includes focus, tasks, issues, decisions, and notes for the next session.

---

## Session 3 — 2026-02-25 (Documentation)

**Focus:** Documentation system implementation

### Tasks Completed

| Task | Files Created | Notes |
|------|--------------|-------|
| Create .gitignore | `.gitignore` | Standard Node.js ignores |
| Create LICENSE | `LICENSE` | MIT license |
| Create CHANGELOG.md | `CHANGELOG.md` | Keep-a-changelog format, v1.0.0 entry |
| Create docs/ structure | `docs/README.md` | Index with links to all doc files |
| Write architecture doc | `docs/architecture.md` | ASCII component diagram, layer descriptions, request lifecycle |
| Write API client doc | `docs/api-client.md` | Two-tier auth, methods, endpoints, types |
| Write MXQL reference | `docs/mxql-reference.md` | Gotchas, syntax, 14 category/field tables |
| Write tool catalog | `docs/tool-catalog.md` | All 30 tools with params, source, MXQL categories |
| Write testing doc | `docs/testing.md` | MCP Inspector setup, known queries, 14 issues resolved |
| Write contributing doc | `docs/contributing.md` | 5-step tool addition checklist, code style |
| Write release process | `docs/release-process.md` | Build, test, npm publish workflow |
| Write session log | `docs/session-log.md` | Back-filled sessions 1-2 |
| Write 7 ADRs | `docs/adr/001-007` | Decisions from sessions 1-2 |
| Create CLAUDE.md | `CLAUDE.md` | Bootstrap context (< 200 lines) |
| Update README.md | `README.md` | Tool count 23 → 30 |
| Git init | `.git/` | Initial commit with all files |

### Decisions Made
- CLAUDE.md stays under 200 lines, links to docs/ for details
- Session log uses reverse-chronological format
- ADRs use simplified Nygard template

### Notes for Next Session
- All 30 tools tested and working in session 2
- Documentation system fully in place
- Ready for: unit tests, additional tool categories, or npm publish

---

## Session 2 — 2026-02-25 (Testing Round 2 + MXQL Fixes)

**Focus:** Comprehensive MCP protocol testing, MXQL syntax corrections

### Tasks Completed

| Task | Files Modified | Issues Found | Resolution |
|------|---------------|--------------|------------|
| Full MCP protocol test (18 tools) | — | MXQL FILTER syntax wrong | `{oid = '123'}` → `{key:oid, value:123}` |
| Fix MXQL FILTER syntax | `src/api/mxql.ts` | — | Rewrote all FILTER clauses to colon syntax |
| Fix MXQL ORDER syntax | `src/api/mxql.ts`, `src/tools/server.ts` | ORDER clause errors | `{field desc}` → `{key:[field], sort:[desc]}` |
| Alert tool redesign | `src/tools/alert.ts` | `event` category empty for most projects | Dual-strategy: try `event` first, fall back to `kube_event` |
| Rebuild and retest | — | — | All 18 tested tools pass |

### Test Results (18 tools tested)

All tools verified working via full MCP JSON-RPC protocol:
- Project tools (3/3): list_projects, project_info, list_agents
- Server tools (4/7): cpu, memory, cpu_load, top (disk/network/process not tested — need active agents)
- APM tools (6/6): tps, response_time, error, apdex, active_transactions, transaction_stats
- K8s tools (3/6): node_list, pod_status, events (node_cpu/memory/container_top need active K8s data)
- Alert tool (1/1): Falls back to kube_event correctly
- MXQL tool (1/1): Raw query execution works
- Error handling: Invalid project code returns proper error message

### Issues Found and Resolved

| # | Issue | Resolution |
|---|-------|------------|
| A | MXQL FILTER syntax `{oid = '123'}` returns empty | Changed to `{key:oid, value:123}` colon syntax |
| B | MXQL ORDER syntax `{field desc}` returns error | Changed to `{key:[field], sort:[desc]}` bracket syntax |
| C | `event` MXQL category always empty | Added `kube_event` fallback in alert tool |
| D | `active_tx_count` field not in `app_active_stat` response | Accepted as data schema limitation |

### Decisions Made
- ADR-005: MXQL FILTER/ORDER syntax uses colon-based key-value pairs
- ADR-006: Alert tool uses event → kube_event fallback strategy

### Notes for Next Session
- Database tools untested (need DB monitoring project with active data)
- Log tools untested (need project with log monitoring enabled)
- Consider adding unit tests for MXQL query builders

---

## Session 1 — 2026-02-25 (Initial Implementation + First Test)

**Focus:** Full implementation from specification, first live API test, bug fix round 1

### Tasks Completed

| Task | Files Created/Modified | Notes |
|------|----------------------|-------|
| Scaffold project | `package.json`, `tsconfig.json`, `tsup.config.ts`, `.env.example` | Node 18+, ESM, tsup build |
| Implement config | `src/config.ts` | Loads WHATAP_API_TOKEN, WHATAP_API_URL |
| Implement API types | `src/api/types.ts` | Project, Agent, MXQL types |
| Implement API client | `src/api/client.ts` | WhatapApiClient with token caching |
| Implement MXQL builders | `src/api/mxql.ts` | 23 query builder functions |
| Implement utilities | `src/utils/time.ts`, `src/utils/format.ts` | Time parser, Markdown formatter |
| Implement 30 tools | `src/tools/*.ts` (8 files) | All tool categories |
| Create entry point | `src/index.ts`, `bin/whatap-mcp.js` | MCP server with stdio transport |
| Write README | `README.md` | Installation, config, tool list |
| Build & verify | `dist/` | 33.86 KB ESM bundle |
| Live API test (curl) | — | Discovered 10 issues |
| Fix API paths | `src/api/client.ts` | Added `/open` prefix to all paths |
| Fix field names | `src/api/types.ts`, all tools | `mql`/`param`/`projectCode`/`oname` |
| Fix response handling | `src/utils/format.ts` | Flat array instead of `{data: [...]}` |
| Fix pageKey | `src/api/client.ts` | Auto-inject `pageKey: "mxql"` |
| Rebuild & retest | — | 6 API calls pass, 30 tools registered |

### Issues Found and Resolved

| # | Issue | Resolution |
|---|-------|------------|
| 1 | All API calls 404 — missing `/open` prefix | Added `/open` to all URL paths |
| 2 | MXQL 500 error — field named `mxql` | Changed to `mql` (API expectation) |
| 3 | MXQL params ignored — field named `params` | Changed to `param` (singular) |
| 4 | Project fields undefined — `pcode`/`pname` | Changed to `projectCode`/`projectName` |
| 5 | Agent `ip` undefined | Changed to `host_ip`, `oid` made optional |
| 6 | MXQL formatter crash — expected `{data: [...]}` | Changed to handle flat array `[{...}]` |
| 7 | MXQL incomplete responses | Added auto `pageKey: "mxql"` injection |

### Decisions Made
- ADR-001: Use MCP SDK with stdio transport
- ADR-002: MXQL-first approach for all metric queries
- ADR-003: Project token caching in memory Map
- ADR-004: Adopt actual API field names after live testing
- ADR-007: tsup with ESM-only output

### Notes for Next Session
- MXQL FILTER and ORDER syntax needs verification (was fixed in Session 2)
- Alert tool needs fallback strategy (was added in Session 2)
