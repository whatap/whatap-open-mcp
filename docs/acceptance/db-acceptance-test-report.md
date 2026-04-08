# DB SQL Statistics — Acceptance Test Report

**Date**: 2026-03-31
**Project**: oracle_dma_test (pcode: 641, ORACLE_DMA)
**AI Client**: Codex CLI v0.116.0 (gpt-5.4, full-auto mode)
**MCP**: whatap-mcp with 929-entry catalog (v2/db sqlstat + wait events)

---

## Test Summary

| # | User Request | Result | Quality |
|---|---|---|---|
| 1 | 가장 느린 SQL 5개 보여주고 왜 느린지 설명해줘 | **PASS** | SQL text shown, wait vs CPU analysis |
| 2 | 오래걸리는 쿼리 어떤거야? | **PASS** | Top 3 SQL identified with root cause |
| 3 | Oracle wait event 원인 분석해줘 | **PASS** | Wait class breakdown + SQL correlation |
| 4 | CPU 높은 SQL 찾아줘 | **PASS** | CPU-dominant SQL identified + tuning hints |
| 5 | DB 성능 저하 원인 분석 | **PASS** | Multi-source analysis: SQL + wait + counters |

---

## Test 1: 가장 느린 SQL 5개 보여주고 왜 느린지 설명해줘

**LLM Workflow**:
1. `whatap_list_projects()` → found pcode 641 (oracle_dma_test)
2. `whatap_data_availability(projectCode=641)` → discovered `db_oracle_dma_sqlstat_top_elapse` path
3. `whatap_list_agents(projectCode=641)` → 22 active agents
4. `whatap_describe_query(path)` → understood fields: sql_id, elapsed_time, cpu_time, sql_text
5. `whatap_query_data(path="...sqlstat_top_elapse", limit=5)` → **SQL text returned with elapsed_time**
6. `whatap_query_data(path="...wait_event_last")` → correlated wait events

**Key Data Returned**:
```
| sql_id        | elapsed_time | cpu_time | sql_text                                                          |
|---------------|-------------|----------|-------------------------------------------------------------------|
| b4b0x9jc3bbf8 | 353.67s     | 0s       | INSERT INTO KWLEE_TIME (SELECT SYSDATE AS DATE1,ORA_SLEEP(359)... |
| c14ctw9tttuz8 | 214s        | 202.85s  | select /* bind test */ 'aaa' name...union select...               |
```

**LLM Analysis**: Correctly identified ORA_SLEEP as test SQL (elapsed_wait=353s, cpu_time=0) vs real bottleneck (cpu_time=202s, logical_reads=4981).

---

## Test 2: 오래걸리는 쿼리 어떤거야?

**LLM Workflow**:
1. `whatap_data_availability(projectCode=641)` → found sqlstat paths
2. `whatap_query_data(path="...sqlstat_top_elapse", timeRange="30m", limit=20)` → SQL ranking
3. `whatap_query_data(path="...sqlstat_top_cpu", timeRange="30m", limit=10)` → CPU ranking

**LLM Response** (translated):
> Top 3 slow queries:
> 1. `INSERT INTO KWLEE_TIME (...ORA_SLEEP(359))` — 353.67s, test SQL using intentional sleep
> 2. `select /* bind test */ ...` — 232.79s, **actual performance issue** (cpu_time=219s)
> 3. `begin dbms_lock.sleep(:aa); end;` — 186.80s, another sleep-based test
>
> **Conclusion**: The real performance candidate is `c14ctw9tttuz8`. Others are test SQL.

---

## Test 3: Oracle wait event 원인 분석해줘

**LLM Workflow**:
1. `whatap_data_availability(projectCode=641)` → found `db_oracle_dma_wait_event_last` + `...series`
2. `whatap_query_data(path="...wait_event_last", timeRange="6h", limit=50)` → wait class per instance
3. `whatap_query_data(path="...sqlstat_top_elapse", timeRange="6h", limit=20)` → correlated SQL
4. `whatap_query_data(path="...sqlstat_top_cpu", timeRange="6h")` → CPU SQL

**LLM Response** (translated):
> No significant Oracle wait event bottleneck. All wait classes = 0 across instances except `DMX-oracle-demo` (Other=1).
>
> Root cause: `ORA_SLEEP`/`DBMS_LOCK.SLEEP` test SQL causing intentional waits (354s, 170-190s per execution).
> `c14ctw9tttuz8` is CPU-dominant (cpu_time ≈ elapsed_time), not a wait event issue.
>
> Assessment: Not a storage/network/lock contention issue — it's application-level test SQL.

---

## Test 4: CPU 높은 SQL 찾아줘

**LLM Workflow**:
1. `whatap_data_availability(projectCode=641)`
2. `whatap_query_data(path="...sqlstat_top_cpu", timeRange="1h", limit=10)`

**LLM Response** (translated):
> Only 1 SQL dominates CPU: `c14ctw9tttuz8`
> - `cpu_time`: 219.21s max
> - `session logical reads`: 3,793–4,981
> - Pattern: `SUBSTR(...)`, `LIKE '%...%'`, `UNION`, correlated subqueries
>
> **Full SQL text provided** with analysis of why it's CPU-heavy.
> Offered next steps: per-agent breakdown, elapsed_time comparison, tuning points.

---

## Test 5: DB 성능 저하 원인 분석

**LLM Workflow** (most comprehensive — 7 tool calls):
1. `whatap_data_availability(projectCode=641)` → discovered all available paths
2. `whatap_query_data(path="...sqlstat_top_elapse", limit=20)` → slow SQL ranking
3. `whatap_query_data(path="...sqlstat_top_cpu", limit=10)` → CPU SQL
4. `whatap_query_data(path="...sqlstat_top_exec", limit=10)` → high-frequency SQL
5. `whatap_query_data(path="...wait_event_last")` → wait class status
6. `whatap_query_data(path="...wait_event_series", timeRange="30m")` → wait trends
7. `whatap_query_data(path="...counter_perf")` → performance counters (if available)

**LLM Response** (translated):
> **Root cause**: Not system-level I/O bottleneck — it's specific SQL causing delay + CPU.
>
> **Primary causes**:
> 1. `ORA_SLEEP`/`DBMS_LOCK.SLEEP` — intentional test SQL, not DB engine bottleneck
> 2. CPU-intensive UNION query (`c14ctw9tttuz8`) — 219s CPU, complex joins/aggregations
>
> **Secondary load**:
> - `UPDATE T_BUFFER_BUSY_WAITS` — 257-634 executions, 17K physical reads
> - Sequence NEXTVAL calls — hundreds of repetitions
> - Short DML bursts adding cumulative load
>
> **Wait events**: No widespread I/O, Concurrency, or Commit wait spikes. Only minor Other/Scheduler on `DMX-oracle-demo`.
>
> **Conclusion**: SQL-centric issue, not infrastructure bottleneck.

---

## Before vs After Comparison

| Request | Before (v1.2.0) | After (with sqlstat) |
|---|---|---|
| 느린 SQL 보여줘 | "SQL 실행 통계를 직접 제공하는 MXQL 경로가 없습니다" | **Full SQL text + elapsed_time + CPU analysis** |
| 오래걸리는 쿼리? | "개별 세션의 SQL 텍스트... 노출되지 않습니다" | **SQL ranked by elapsed_time with HvText** |
| Wait event 분석 | (data existed but not discoverable) | **Wait class per instance + SQL correlation** |
| CPU 높은 SQL | "Not available" | **SQL ranked by cpu_time with tuning hints** |
| DB 성능 저하 원인 | "Limited to session count" | **Multi-source: SQL + wait + counter analysis** |

---

## LLM Tool Usage Pattern

| Test | Tool Calls | Key Insight |
|---|---|---|
| 1 | 6 calls | Used both sqlstat + wait_event for correlation |
| 2 | 3 calls | Efficient — went straight to sqlstat |
| 3 | 4 calls | Combined wait_event + sqlstat for root cause |
| 4 | 2 calls | Minimal — sqlstat_top_cpu answered directly |
| 5 | 7 calls | Most comprehensive — all data sources combined |

The LLM correctly:
- Discovered sqlstat paths via `whatap_data_availability`
- Used `whatap_describe_query` to understand fields before querying
- Combined multiple data sources (SQL stats + wait events + counters)
- Differentiated test SQL (ORA_SLEEP) from real bottlenecks
- Provided actionable tuning guidance

---

## Catalog Statistics

| Metric | Value |
|---|---|
| Total MXQL entries | 929 |
| DB sqlstat paths | 21 (7 platforms × 3 rankings) |
| DB wait event paths | 7 |
| DB counter paths | 4 |
| PG analytics paths | 6 |
| DB probe categories | 13 |
