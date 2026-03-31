# DB SQL Statistics — MCP Test Report

**Date**: 2026-03-31
**Project**: oracle_dma_test (pcode: 641)
**Platform**: ORACLE_DMA
**Environment**: dev.whatap.io

---

## Test Summary

| # | User Request | Before (v1.2.0) | After (v1.3.0-dev) |
|---|---|---|---|
| 1 | 가장 느린 SQL 5개 보여줘 | "SQL 실행 통계를 직접 제공하는 MXQL 경로가 없습니다" | **sql_id, elapsed_time, cpu_time, execute_count 반환** |
| 2 | 오래걸리는 쿼리 어떤거야? | "개별 세션의 SQL 텍스트, PID, 실행 시간 같은 상세 정보는 MXQL 경로로 노출되지 않습니다" | **sqlstat_top_elapse 경로로 SQL 실행 통계 제공** |
| 3 | Oracle wait event 원인 분석해줘 | (이미 존재하지만 프로브 안됨) | **db_oracle_dma_wait_class 카테고리 자동 프로브 + 경로 노출** |
| 4 | CPU 높은 SQL 찾아줘 | "Not available" | **sqlstat_top_cpu 경로로 cpu_time 기준 정렬 제공** |
| 5 | DB 성능 저하 원인 분석 | "Limited to session count aggregation" | **counter_perf + wait_event + sqlstat 조합 가능** |

---

## Test 1: whatap_data_availability(projectCode=641)

### Before (v1.2.0)
```
Probed 13 categories. 1 active (db_agent_list), 12 inactive.
Available MXQL Paths: db_agent_list only.
→ No sqlstat, no wait events discovered.
```

### After (new catalog + probe categories)
```
Probed 22 categories. 3 active, 19 inactive.

Available MXQL Paths (6):

DB Agent List (db_agent_list):
- mxql/v2/db/db_agent_list

Oracle DMA SQL Stats (db_oracle_dma_sqlstat):
- mxql/v2/db/db_oracle_dma_sqlstat_top_cpu      [ranking]
- mxql/v2/db/db_oracle_dma_sqlstat_top_elapse    [ranking]
- mxql/v2/db/db_oracle_dma_sqlstat_top_exec      [ranking]

Oracle DMA Wait Class (db_oracle_dma_wait_class):
- mxql/v2/db/db_oracle_dma_wait_event_last       [events]
- mxql/v2/db/db_oracle_dma_wait_event_series      [events]
```

**Result**: LLM can now discover SQL stats and wait event paths automatically.

---

## Test 2: Top Slow SQL (MXQL text endpoint)

**Query**: `CATEGORY db_oracle_dma_sqlstat` + `ORDER {key:[elapsed_time], sort:[desc]}`

**Response** (5 rows, truncated):
```
Row 1: sql_id=["33uhckcdm7ds5","2tw91d2fss1hf","ah0fugts5kchy",...]
       elapsed_time=[13 values], cpu_time=[13 values], execute_count=[13 values]

Row 2: sql_id=["d0y3gpwdaxatc","46trsb112hwxp"]
       elapsed_time=[0.2, 0.05], cpu_time values

Row 3-5: Additional SQL entries with execution stats
```

**Result**: SQL execution statistics returned successfully. Each row contains per-OID SQL stats with sql_id, elapsed_time, cpu_time, execute_count, physical reads, session logical reads.

---

## Test 3: Oracle Wait Events

**Query**: `CATEGORY db_oracle_dma_wait_class` + `TAGLOAD` + `SELECT`

**Response** (20 rows):
```
Wait class columns: Other, Application, Configuration, Administrative,
                    Concurrency, Commit, Idle, Network, User I/O,
                    System I/O, Scheduler, Cluster, Queueing

Example row:
  oname: dmx-rac19-1a
  con_name: (CDB level)
  User I/O: 0
  System I/O: 0
  Application: 0
  Concurrency: 0
```

**Result**: All Oracle wait classes returned. LLM can analyze which wait classes have non-zero values to identify bottlenecks.

---

## Test 4: Performance Counters

**Query**: `CATEGORY db_oracle_dma_counter` + key metrics

**Response** (10 rows):
```
Row 1: active_sessions=2, lock_wait_sessions=0, long_running_sessions=2,
       DB time=0, CPU used by this session=0, execute count=0

Row 2: active_sessions=1, DB time=144, CPU used by this session=6,
       execute count=30

Row 3: active_sessions=9, long_running_sessions=6, DB time=2,
       execute count=3
```

**Result**: Key Oracle performance counters available for root cause analysis.

---

## New MXQL Paths Added (17 total)

### SQL Statistics (15 paths)

| DB Type | top_elapse | top_cpu | top_exec |
|---|---|---|---|
| Oracle DMA | `db_oracle_dma_sqlstat_top_elapse` | `db_oracle_dma_sqlstat_top_cpu` | `db_oracle_dma_sqlstat_top_exec` |
| Oracle | `db_oracle_sqlstat_top_elapse` | `db_oracle_sqlstat_top_cpu` | `db_oracle_sqlstat_top_exec` |
| MySQL | `db_mysql_sqlstat_top_elapse` | `db_mysql_sqlstat_top_cpu` | `db_mysql_sqlstat_top_exec` |
| PostgreSQL | `db_postgresql_sqlstat_top_elapse` | `db_postgresql_sqlstat_top_cpu` | `db_postgresql_sqlstat_top_exec` |
| MSSQL | `db_mssql_sqlstat_top_elapse` | `db_mssql_sqlstat_top_cpu` | `db_mssql_sqlstat_top_exec` |

### Additional (2 paths)
- `db_oracle_dma_counter_perf` — Key Oracle DMA performance counters
- `db_tablespace_usage` — Tablespace utilization

### New Probe Categories (+9)
`db_oracle_dma_sqlstat`, `db_oracle_sqlstat`, `db_mysql_sqlstat`, `db_postgresql_sqlstat`, `db_mssql_sqlstat`, `db_oracle_wait_class`, `db_oracle_dma_wait_class`, `db_postgresql_wait_event`, `db_tablespace`

---

## Catalog Growth

| Metric | Before | After |
|---|---|---|
| Total MXQL entries | 640 | 914 |
| DB-specific paths | 38 | 55 |
| Probe categories | 13 | 22 |
| DB probe categories | 2 | 11 |

---

## Limitations

1. **SQL text not available via MXQL** — sqlstat returns `sql_id` and `sql_hash_value` but not the actual SQL text. SQL text resolution requires the `TopSqlService` REST endpoint (`/dbx/v2/pcode/{pcode}/statistics/top_sql`), which is not exposed through MXQL.

2. **List-value response format** — sqlstat returns multiple SQL entries per row as lists (sql_id: [id1, id2, ...], elapsed_time: [t1, t2, ...]). The MCP formatter may need enhancement to properly render these nested lists.

3. **.mql files not deployed to dev server** — The new .mql files are created in the local yard project but need to be deployed to the dev/prod server for the path endpoint to work. Currently testable only via MXQL text endpoint.

---

## Next Steps

1. **Deploy .mql files** to dev.whatap.io yard server → enables path endpoint access
2. **Add SQL text resolution** — either via REST API integration or MXQL HvText lookup
3. **Enhance formatter** — handle list-value sqlstat responses (unfold to individual SQL rows)
4. **Test with active DB** — verify with a busy Oracle DMA instance that has diverse SQL workload
