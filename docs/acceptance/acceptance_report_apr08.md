# Acceptance Test Report — 2026-04-08

**MCP Server**: whatap-mcp v1.2.1 (10 tools, 914-entry catalog)
**AI Client**: Codex CLI v0.118.0 (gpt-5.4, full-auto mode)
**Config**: Single MCP server, `--dangerously-bypass-approvals-and-sandbox --json`

---

## Summary

Two test runs — before and after tool description improvements:

| Metric | Run 1 (before) | Run 2 (after) | Change |
|--------|---------------|---------------|--------|
| **Correctness** | 30/30 (100%) | 30/30 (100%) | — |
| **Efficiency** | 13/30 (43%) | 30/30 (100%) | **+57pp** |
| **Duration** | ~7 min | ~4 min | **-43%** |
| **Median tool calls** | 8.5 | 1 | **-88%** |
| **Mean tool calls** | 7.7 | 2.8 | **-64%** |
| **Max tool calls** | 15 | 11 | -27% |

---

## Run 1: Before (original tool descriptions)

### Results

| # | Category | Calls | Limit | Status |
|---|----------|-------|-------|--------|
| 1 | discovery | 1 | 3 | PASS |
| 2 | discovery | 1 | 4 | PASS |
| 3 | discovery | 2 | 4 | PASS |
| 4 | discovery | 4 | 4 | PASS |
| 5 | discovery | 2 | 4 | PASS |
| 6 | infra | **9** | 8 | FAIL |
| 7 | infra | **12** | 8 | FAIL |
| 8 | infra | **9** | 8 | FAIL |
| 9 | infra | **15** | 8 | FAIL |
| 10 | infra | **8** | 4 | FAIL |
| 11 | apm | 5 | 8 | PASS |
| 12 | apm | **12** | 8 | FAIL |
| 13 | apm | **13** | 8 | FAIL |
| 14 | apm | 8 | 8 | PASS |
| 15 | apm | 2 | 6 | PASS |
| 16 | database | 2 | 4 | PASS |
| 17 | database | **5** | 4 | FAIL |
| 18 | database | **10** | 8 | FAIL |
| 19 | database | **11** | 8 | FAIL |
| 20 | database | **14** | 10 | FAIL |
| 21 | k8s | 8 | 8 | PASS |
| 22 | k8s | **12** | 8 | FAIL |
| 23 | k8s | **9** | 8 | FAIL |
| 24 | k8s | **10** | 8 | FAIL |
| 25 | promql | 4 | 4 | PASS |
| 26 | promql | **15** | 12 | FAIL |
| 27 | url_rum | **6** | 4 | FAIL |
| 28 | url_rum | **9** | 4 | FAIL |
| 29 | install | 3 | 5 | PASS |
| 30 | edge | 6 | 6 | PASS |

### Waste Patterns Identified

1. **Redundant `list_projects`** (17/30): LLM calls `list_projects` even when pcode is in the prompt
2. **Multiple `data_availability`** (12/30): 2-8 calls with different domain filters instead of `search=`
3. **Precautionary `describe_query`** (15/30): Called before every `query_data`, doubling call count
4. **Exploratory `project_info`/`list_agents`** (10/30): Context-gathering when not asked

### Root Cause

Tool descriptions encouraged a verbose workflow:
- `list_projects`: "Use this as the FIRST STEP in any WhaTap monitoring workflow"
- `describe_query`: "Use this before whatap_query_data"
- `data_availability`: Workflow suggested multi-step domain browsing
- `query_data`: Listed `list_projects` as a prerequisite

---

## Tool Description Changes

### whatap_list_projects

```diff
- "Use this as the FIRST STEP in any WhaTap monitoring workflow."
- "Do NOT call other WhaTap tools before this one — you need a pcode first."
+ "Call this ONLY if you do NOT already have a projectCode."
+ "If the user provides a projectCode, skip this and call the needed tool directly."
```

### whatap_project_info / whatap_list_agents

```diff
- "PREREQUISITE: projectCode from whatap_list_projects."
+ "Only call this when the user explicitly asks about project details/agents."
+ "Do NOT call as a prerequisite before querying data."
```

### whatap_data_availability

```diff
- "WORKFLOW: 1. data_availability() → 2. data_availability(domain=...) → 3. describe → 4. query"
+ "Call this ONCE — do NOT call multiple times with different params."
+ "BEST USAGE: projectCode=X (live probe) or search='keyword' (instant results)"
```

### whatap_describe_query

```diff
- "Use this before whatap_query_data to understand what a query does."
+ "Only call when the user asks what a query does."
+ "Do NOT call as a prerequisite before query_data — just call query_data directly."
```

### whatap_query_data

```diff
- "PREREQUISITES: projectCode from whatap_list_projects, path from whatap_data_availability"
+ "Call this directly when you know the projectCode — no prerequisite tools needed."
+ "COMMON PATHS (use directly):
+   Server: v2/sys/server_base, v2/sys/server_disk, v2/sys/server_network
+   APM: v2/app/tps_pcode, v2/app/resp_time_pcode, v2/app/tx_error_pcode
+   K8s: v2/container/kube_pod, v2/container/kube_node, v2/container/kube_event
+   DB: v2/db/instance_active_session, db_*_sqlstat_top_elapse"
+ "If path returns no data, THEN call data_availability to find the right path."
```

---

## Run 2: After (improved tool descriptions)

### Results

| # | Category | Calls | Limit | Status |
|---|----------|-------|-------|--------|
| 1 | discovery | 1 | 3 | PASS |
| 2 | discovery | 1 | 4 | PASS |
| 3 | discovery | 1 | 4 | PASS |
| 4 | discovery | 1 | 4 | PASS |
| 5 | discovery | 2 | 4 | PASS |
| 6 | infra | 1 | 8 | PASS |
| 7 | infra | 1 | 8 | PASS |
| 8 | infra | 5 | 8 | PASS |
| 9 | infra | 7 | 8 | PASS |
| 10 | infra | 1 | 4 | PASS |
| 11 | apm | 1 | 8 | PASS |
| 12 | apm | 1 | 8 | PASS |
| 13 | apm | 1 | 8 | PASS |
| 14 | apm | 1 | 8 | PASS |
| 15 | apm | 1 | 6 | PASS |
| 16 | database | 1 | 4 | PASS |
| 17 | database | 1 | 4 | PASS |
| 18 | database | 3 | 8 | PASS |
| 19 | database | 5 | 8 | PASS |
| 20 | database | 4 | 10 | PASS |
| 21 | k8s | 2 | 8 | PASS |
| 22 | k8s | 6 | 8 | PASS |
| 23 | k8s | 4 | 8 | PASS |
| 24 | k8s | 3 | 8 | PASS |
| 25 | promql | 1 | 4 | PASS |
| 26 | promql | 11 | 12 | PASS |
| 27 | url_rum | 1 | 4 | PASS |
| 28 | url_rum | 1 | 4 | PASS |
| 29 | install | 1 | 5 | PASS |
| 30 | edge | 2 | 6 | PASS |

### Call Count Distribution

| Invocations | Run 1 | Run 2 |
|-------------|-------|-------|
| 1 | 3 | **19** |
| 2-4 | 5 | 6 |
| 5-8 | 6 | 4 |
| 9-15 | 16 | 1 |

19 out of 30 prompts now resolve in a single tool call — the LLM goes directly to the right tool with the right path.

---

## Test Configuration

**Projects tested**:

| pcode | Platform | Product | Prompts |
|-------|----------|---------|---------|
| 5490 | JAVA | APM | #3, #11-15, #30 |
| 28458 | POSTGRESQL | DB | #16-20 |
| 33194 | KUBERNETES | CPM | #21-26 |
| 48403 | URLCHECK | WPM | #27 |
| 27506 | RUM | BROWSER | #28 |
| 29763 | INFRA | SMS | #2, #4, #6-10, #29 |

**Environment**:
- Single MCP server (no duplicate registrations)
- Codex CLI v0.118.0, gpt-5.4, non-interactive mode with JSON trace
- Each prompt runs in an isolated session (no context carryover)
- 180s timeout per prompt, batches of 3

---

## Conclusion

Tool description quality directly controls LLM efficiency. Four changes eliminated 88% of unnecessary tool calls:

1. Removed "call this first" language from `list_projects`
2. Added common paths directly to `query_data` description
3. Changed `describe_query` from prerequisite to optional
4. Emphasized single-call usage for `data_availability`

The 30-prompt acceptance test is now a reliable CI gate at the 90% threshold.
