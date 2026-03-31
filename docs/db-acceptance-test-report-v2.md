# DB SQL Statistics — Acceptance Test Report v2 (with oname + wait_class_summary)

**Date**: 2026-03-31
**Project**: oracle_dma_test (pcode: 641, ORACLE_DMA)
**AI Client**: Codex CLI v0.116.0 (gpt-5.4, full-auto mode)
**MCP**: whatap-mcp with 931-entry catalog (oname + wait_class_summary + alert_event)

---

## Test Summary

| # | User Request | Result | oname shown | Quality |
|---|---|---|---|---|
| 1 | 느린 SQL 5개 + 왜 느린지 + 인스턴스 | **PASS** | `DMX-centos7-2-39` | SQL text + sleep analysis + instance |
| 2 | CPU 높은 SQL 인스턴스별 | **PASS** | 6 instances listed | Per-instance CPU Top SQL breakdown |
| 3 | Wait event 원인 + 인스턴스별 요약 | **PASS** | 10+ instances | RAC contention, Application lock, I/O analysis |
| 4 | DB 성능 저하 원인 분석 | **PASS** | Per-instance | Multi-source: SQL + wait + lock combined |
| 5 | 최근 알림 발생 내역 | **PASS** | N/A | No alerts — correctly reported + explanation |
| 6 | 오래걸리는 쿼리 + 인스턴스 | **PASS** | `DMX-centos7-1`, `SUN10_12P`, `DMX-oracle-demo` | Time-ranged comparison (5m vs 1h) |
| 7 | 가장 많이 실행된 SQL TOP 5 | **PASS** | `DMX-OEL92-1`, `DMX-centos7-2`, `DMX-centos7-1` | SQL text + exec count + instance |

---

## Test 1: 느린 SQL 5개 + 인스턴스

**LLM Response** (key excerpt):
> Top 5 모두 `DMX-centos7-2-39` 인스턴스에서 발생.
> SQL: `INSERT INTO KWLEE_TIME (SELECT SYSDATE AS DATE1, ORA_SLEEP(359) FROM DUAL)`
> elapsed_time=354.91s, cpu_time=0, elapsed_wait=354.91s
> → ORA_SLEEP 테스트 SQL. 실제 튜닝 대상이 아닌 검증용 SQL.

**oname validation**: `DMX-centos7-2-39` — correctly identifies instance.

---

## Test 2: CPU 높은 SQL 인스턴스별

**LLM Response** (key instances):

| Instance | Top SQL | cpu_time |
|---|---|---|
| `DMX-oracle-demo` | `select /* bind test */ ... union ...` | 111.23s |
| `DMX-centos7-21` | `TABLE(CAST(:B1 AS MGMT_METRIC_RESULTS))` | 25.85s |
| `DMX-centos7-1` | `v$sesstat` 조회 계열 | 4.75s |
| `DMX-centos7-2` | Low CPU (0.35s) | - |
| `DMX-OEL92-1` | Low CPU (<0.30s) | - |

**oname validation**: 6 instances identified with per-instance CPU ranking.

---

## Test 3: Wait event 원인 + 인스턴스별 요약

**LLM Response** — most comprehensive (uses wait_class_summary + sqlstat + session data):

| Instance | Primary Wait | Analysis |
|---|---|---|
| `SUN10_12P` | Application=270 (5min) | Lock/transaction contention, `dbms_lock.sleep` |
| `DMX-oracle-demo` | Other=761, Application=177 (1h) | CPU-heavy UNION SQL |
| `dmx-rac19-1a` | User I/O=188, Concurrency=124, Cluster=69 | RAC contention (hot blocks, GC, redo) |
| `dmx-rac19-2` | User I/O=8, System I/O=33, Cluster=9 | Weaker version of rac19-1a |
| `DMX-centos7-2` | User I/O=112, System I/O=74 | Transient, sleep SQL inflated |
| `DMX-centos7-1` | User I/O=21, System I/O=53 | Mild, sleep SQL |

**Priority recommendations**: 1. SUN10_12P blocking sessions → 2. DMX-oracle-demo SQL tuning → 3. RAC contention

---

## Test 4: DB 성능 저하 원인 분석

**LLM Response** — 4 root causes identified:

1. `SUN10_12P`: Application wait=1620 → lock/transaction contention
2. `dmx-rac19-1a`: User I/O + Concurrency + Cluster → RAC contention
3. `DMX-oracle-demo`: cpu_time 87-179s per SQL → heavy UNION query
4. `DMX-centos7-2-39`: ORA_SLEEP test SQL (not real bottleneck)

**Action items provided**: Check blocking sessions, I/O patterns, SQL execution plans, separate test SQL.

---

## Test 5: 최근 알림 발생 내역

**LLM Response**:
> 24시간, 7일 모두 조회 결과 없음.
> 에이전트 22개 active이지만 alert_event 카테고리 비활성.
> 해석: 알림 미발생 또는 알림 규칙 미설정.

**Correctly handled**: No false positives, clear explanation of empty results.

---

## Test 6: 오래걸리는 쿼리 + 인스턴스

**LLM Response** — compared 5min vs 1h:

| Timeframe | Top SQL | Instance | elapsed_time |
|---|---|---|---|
| 5min | `dbms_lock.sleep(:aa)` | `DMX-centos7-1`, `SUN10_12P` | 150s |
| 5min | `select /* bind test */ ... union` | `DMX-oracle-demo` | 111s |
| 1h | `INSERT ... ORA_SLEEP(359)` | `DMX-centos7-2-39` | 354.9s |
| 1h | `dbms_lock.sleep(:aa)` | `DMX-centos7-1`, `SUN10_12P` | 180s |

**oname validation**: Multiple instances correctly identified per SQL.

---

## Test 7: 가장 많이 실행된 SQL TOP 5

**LLM Response**:

| # | Instance | SQL | exec_count |
|---|---|---|---|
| 1 | `DMX-OEL92-1` | `select /* WhaTapAQ#5 */ ... v$sgastat` | 20 |
| 2 | `DMX-OEL92-1` | same | 19 |
| 3 | `DMX-OEL92-1` | same | 15 |
| 4 | `DMX-centos7-2` | `select /* WhaTap3D#3 */ ... v$lock` | 13 |
| 5 | `DMX-centos7-1` | same lock query | 13 |

**Note**: LLM correctly identified these are WhaTap agent internal monitoring queries.

---

## PATCH-GUIDE Changes Validation

| Change | Before | After | Validated |
|---|---|---|---|
| 1-4. oname in queries | No instance identification | `DMX-centos7-2-39`, `DMX-oracle-demo`, etc. in every response | **PASS** |
| 5. wait_class_summary | Only time-series (one point at a time) | Per-instance totals (SUN10_12P: App=1620) | **PASS** |
| 6. alert_event | "No MXQL path available" | Query executes, returns empty or events | **PASS** |

---

## Key Improvements Over v1 Report

| Aspect | v1 (before oname) | v2 (with oname) |
|---|---|---|
| Instance identification | Not available | Every SQL linked to specific instance |
| Wait event analysis | Flat per-instance rows | Aggregated summary with totals |
| Root cause precision | "Some SQL is slow" | "SQL X on instance Y due to Z" |
| Multi-instance comparison | Not possible | LLM compares 6+ instances automatically |
| Alert history | Not queried | Queried via alert_event (empty = correctly reported) |

---

## Catalog Statistics

| Metric | Value |
|---|---|
| Total MXQL entries | 931 |
| DB sqlstat paths (with oname) | 21 |
| DB wait event paths | 7 (+1 summary) |
| DB counter paths (with oname) | 4 |
| DB alert_event path | 1 |
| PG analytics paths | 6 |
| DB probe categories | 14 |
