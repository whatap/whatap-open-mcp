# DB Acceptance Test Report v3

**Date**: 2026-04-01
**Project**: oracle_dma_test (pcode: 641, ORACLE_DMA)
**AI Client**: Codex CLI v0.116.0 (gpt-5.4, full-auto mode)
**MCP**: whatap-mcp 11 tools, 931-entry catalog

---

## Test Summary

| # | Request | Tool Calls | Result | Key Finding |
|---|---|---|---|---|
| 1 | Oracle wait event 원인 분석해줘 | 26 | **PASS** | 4 instances ranked by wait class with root cause |
| 2 | CPU 높은 SQL 찾아줘 | 11 | **PASS** | Top 5 CPU SQL with instance + SQL text |
| 3 | DB 성능 저하 원인 분석 | 22 | **PASS** | 3 root causes identified, action items provided |
| 4 | slow query 튜닝 방법 | 15 | **PASS** | SQL-level tuning recommendations with wait correlation |

---

## Test 1: Oracle wait event 원인 분석해줘

**Tool calls**: 26 (list_projects, project_info, event_history, list_agents, data_availability, describe_query ×7, query_data ×3)

**LLM Analysis**:

| Instance | Primary Wait | Value (30min) | Root Cause |
|---|---|---|---|
| `SUN10_12P` | Application | 1620 | Lock contention (row lock), mixed with dbms_lock.sleep test SQL |
| `DMX-centos7-2` | User I/O + System I/O | 220 + 129 | Disk I/O bottleneck |
| `DMX-oracle-demo` | Scheduler + System I/O + Other | 614 + 250 + 413 | CPU-heavy UNION SQL driving scheduler/I/O waits |
| `dmx-rac19-1a` | User I/O + Concurrency + Cluster | 105 + 94 + 53 | RAC hot block/GC contention |

**Priority**: 1. SUN10_12P blocking sessions → 2. DMX-oracle-demo SQL tuning → 3. dmx-rac19-1a RAC contention

**Quality**: Correctly differentiated test SQL (dbms_lock.sleep) from real bottlenecks. Correlated wait events with SQL stats.

---

## Test 2: CPU 높은 SQL 찾아줘

**Tool calls**: 11 (list_projects, project_info, data_availability ×2, list_agents, describe_query, query_data ×5)

**LLM Analysis**:

| # | Instance | sql_id | cpu_time | SQL Pattern |
|---|---|---|---|---|
| 1 | `DMX-oracle-demo` | c14ctw9tttuz8 | 213.76s (max) | UNION + correlated subquery + SUBSTR LIKE |
| 2 | `DMX-centos7-21` | 1gwsnnc0p7p87 | 35.58s | TABLE(CAST(:B1 AS MGMT_METRIC_RESULTS)) UNION |
| 3 | `DMX-oracle-demo` | 3ws45p33nytqd | 13.53s | Multi-join COUNT(*) on HR schema |
| 4 | `DMX-oracle-demo` | d7mg9b2hg54qt | 12.50s | Self-join COUNT(*) on HR.EMPLOYEES |
| 5 | `DMX-oracle-demo` | 7w42v7np9b4c7 | 7.7s | Parallel hint + full scan on test_big_table |

**Quality**: Per-instance breakdown, full SQL text shown, dominant SQL identified (`c14ctw9tttuz8` owns CPU).

---

## Test 3: DB 성능 저하 원인 분석

**Tool calls**: 22 (list_projects, project_info, event_history, list_agents, data_availability, describe_query ×7, query_data ×7)

**LLM Analysis** — 3 root causes:

1. **DMX-oracle-demo: CPU-heavy SQL** (primary)
   - `sql_id c14ctw9tttuz8`: cpu_time=213.76s, logical_reads=3941-4651
   - Correlated: System I/O=522, Scheduler=1291

2. **SUN10_12P: Application lock contention**
   - Application wait=3240 (highest across all instances)
   - Mixed with dbms_lock.sleep test sessions

3. **DMX-centos7-2-39: Artificial delay**
   - ORA_SLEEP(359): elapsed=353.5s, cpu=0
   - Correctly identified as test SQL, not real bottleneck

**Action items provided**: SQL execution plan review, UNION→UNION ALL, blocking session investigation, test SQL separation.

**Quality**: Multi-source analysis combining sqlstat + wait_class_summary + event_history. Distinguished real bottlenecks from test artifacts.

---

## Test 4: slow query 튜닝 방법

**Tool calls**: 15 (list_projects, project_info, event_history, data_availability, list_agents, describe_query ×3, query_data ×6)

**LLM Tuning Recommendations**:

1. **Filter test SQL first** — Remove ORA_SLEEP, dbms_lock.sleep from analysis
2. **Target SQL** — `sql_id c14ctw9tttuz8` (DMX-oracle-demo)
3. **Tuning steps**:
   - Check execution plan via `DBMS_XPLAN.DISPLAY_CURSOR`
   - `UNION` → `UNION ALL` if dedup not needed
   - `SUBSTR(col) LIKE '%...%'` → function-based index or rewrite
   - Correlated subquery → JOIN/CTE restructure
   - Review index coverage for join/filter columns
4. **Wait-correlated tuning**:
   - `SUN10_12P`: Application wait=1620 → index for locked rows, shorten transactions
   - `DMX-centos7-2`: User I/O=220 → storage/I/O + SQL tuning
   - `DMX-oracle-demo`: Scheduler=614 → reduce CPU demand via SQL optimization

**WhaTap query path recommendations**:
- `db_oracle_dma_sqlstat_top_elapse` → slow SQL
- `db_oracle_dma_sqlstat_top_cpu` → CPU SQL
- `db_oracle_dma_wait_class_summary` → wait breakdown

**Quality**: Actionable tuning advice with specific SQL rewrite patterns. Correctly linked wait events to tuning approach.

---

## Tools Used Across All Tests

| Tool | Test 1 | Test 2 | Test 3 | Test 4 |
|---|---|---|---|---|
| whatap_list_projects | 1 | 1 | 1 | 1 |
| whatap_project_info | 1 | 1 | 1 | 1 |
| whatap_event_history | 1 | - | 1 | 1 |
| whatap_list_agents | 1 | 1 | 1 | 1 |
| whatap_data_availability | 1 | 2 | 1 | 1 |
| whatap_describe_query | 7 | 1 | 7 | 3 |
| whatap_query_data | 3 | 5 | 7 | 6 |
| **Total** | **26** | **11** | **22** | **15** |

---

## Key Observations

1. **oname enables per-instance analysis** — Every response identifies which DB instance is the source of the problem
2. **wait_class_summary provides aggregated view** — LLM uses it to rank instances by wait severity
3. **event_history checked automatically** — LLM calls it to check for alert correlation
4. **Test SQL correctly filtered** — ORA_SLEEP/dbms_lock.sleep consistently identified as non-production
5. **Tuning advice is specific** — Not generic "add index" but specific SQL patterns: UNION→UNION ALL, SUBSTR LIKE rewrite, correlated subquery→JOIN

---

## Comparison: Before vs After

| Capability | Before (v1.2.0) | After (current) |
|---|---|---|
| "느린 SQL 보여줘" | "경로가 없습니다" | SQL text + elapsed + cpu + oname |
| "Wait event 분석" | Not discoverable | Per-instance summary with totals |
| "CPU 높은 SQL" | "Not available" | Top N by cpu_time + SQL text + oname |
| "DB 성능 저하 원인" | "Session count only" | Multi-source root cause (26 tool calls) |
| "Slow query 튜닝" | Not possible | Specific SQL rewrite recommendations |
| "알림 발생 내역" | Not available | whatap_event_history (REST API) |
