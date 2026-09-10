# "No data found" 수정 — 라이브 시험 주행 결과

- 날짜: 2026-09-10
- 대상: `whatap-open-mcp` main HEAD `c6e1f8a` + 본 수정 (미커밋)
- 설계: [2026-09-10-mcp-nodata-diagnosability-design.md](../design/2026-09-10-mcp-nodata-diagnosability-design.md)
- 검증 방식: 계정 토큰으로 실제 `api.whatap.io` 호출. stdio 직접 구동 + `tests/mcp-protocol/test.ts` + vitest
- 시험 프로젝트: 5490 (Java APM Demo, TPS ~220 실데이터), 29763 (INFRA), 33194 (K8s), 29762 (MySQL), 28458 (PostgreSQL)

---

## 1. 수정 전 재현 (확정)

데이터가 살아 있는 프로젝트에서 티켓의 응답을 그대로 재현했다.

```
$ whatap_query_data(projectCode=5490, path="v2/app/tps_pcode", timeRange="6h")
| tps    | time                    |
| 222.22 | 2026-09-10 00:01:30 UTC |     ← 초당 222 트랜잭션, 살아 있는 프로젝트

$ whatap_query_data(projectCode=5490, path="src/main/resources/mxql/apm/stat/transaction_diff", timeRange="6h")
**No data found.**
**Possible causes:**
- Time range may be too narrow or no data was collected in this window.
- No active agents sending data for this category.
isError: (unset)
```

## 2. 와이어 캡처 — 분석 문서의 미확인 3건 해소

프로젝트 토큰으로 서버를 직접 호출해 확인했다. (MXQL 엔드포인트는 **계정 토큰이 아니라 프로젝트 토큰**을 요구한다. 계정 토큰으로는 `{"msg":"[F] Invalid token","code":400}`.)

| 검증 항목 | 결과 |
|---|---|
| 오류 행의 실제 형태 | `HTTP 200` + `[{"error":"A JSONObject text must begin with '{' at 1 [character 2 line 1]"}]` — **배열 안 단일 오류 행, 키는 `error`**. 분석의 소거법 추론과 일치 |
| `ERROR_ROW_KEYS` 범위 | 실측된 키는 `error` 하나. 비배열 오류 본문은 `msg`(`{"msg":"[F] Invalid token"}`) |
| path 엔드포인트가 마커 경로를 해석하는가 | **아니다.** `[{"error":"not found /src/main/resources/mxql/apm/stat/transaction_diff"}]` → 설계의 "폴백(c) 배제" 판단 확정 |
| 마커 없는 원문 | `[{"tps":40.14143},{"tps":0}]` — 정상 |

## 3. 4-상태 라이브 검증

| 상태 | 시험 호출 | 결과 |
|---|---|---|
| **C** not-executed | 티켓 경로 | `isError: true`, "It was NOT sent to the server", 마커 `<%AGENT%>` `<%FILTER%>` 열거 |
| **C** 네트워크 0회 증명 | 같은 호출을 `WHATAP_API_TOKEN=INVALID_TOKEN_XXXX`로 실행 | 인증 오류가 아니라 **동일한 마커 오류**가 나옴 → 가드가 토큰 발급·전송 전에 차단함이 증명됨 |
| **B** server-error | 오류 행 주입 (fake client) + 라이브 파싱 오류 | `isError: true`, 서버 원문 그대로, "not** an absence of data", `"No data found"` 부재 |
| **B** not-found | `v2/app/does_not_exist_xyz` | `isError: true`, `**Server message**: not found /v2/app/does_not_exist_xyz` |
| **A** empty (text 분기) | `mxql/cpm/kube_debug_last_pod` @5490 | 실행 MXQL 전문 + UTC/KST 시간창 + 행수 에코. 원인 단정 없음 |
| **A** empty (path 분기) | `v2/container/kube_pod_stat` @5490 | "a path reference … not the executed text" + 카탈로그 원문 첨부 |
| **D** transport | `projectCode=999999999` | 기존 `classifyAndBuildError` 유지 |

### 3.1 상태 A 에코가 실제로 원인을 드러낸 사례

`mxql/cpm/kube_debug_last_pod`의 빈 결과가 에코한 실행문:

```mxql
TIME-RANGE {recent: 10s}
CATEGORY kube_pod
TAGLOAD
SELECT
LAST-ONLY {key: [namespace, podname, podUid]}
LIMIT 50
```

읽는 사람이 즉시 알 수 있는 두 가지 — `TIME-RANGE {recent: 10s}`가 요청한 30분 창을 덮어쓰고, `SELECT`에 필드 목록이 없다. **빈 결과의 이유가 데이터가 아니라 쿼리에 있음**이 응답 안에서 드러난다. 수정 전에는 같은 호출이 "시간 범위가 좁거나 수집된 데이터가 없다"고 답했다.

### 3.2 잘못된 PromQL도 오류가 아니라 빈 배열로 온다

`query="rate("` (문법적으로 깨진 쿼리)를 실행하면 서버는 **오류가 아니라 빈 배열**을 돌려준다. 즉 요청 1(오류 전달)만으로는 이 부류가 잡히지 않는다 — 신고자가 집계한 "빈 배열 75건"과 같은 계열이다. 수정 후 응답은 `OPENMX rate(` 를 그대로 보여주므로 호출한 LLM이 문법 문제를 스스로 집어낼 수 있다. **요청 3이 요청 1·2로 대체되지 않는다는 설계 판단이 라이브로 확인됐다.**

## 4. 설계에서 바뀐 점 (시험 중 발견해 수정)

### 4.1 대체 경로 제안을 카테고리 기반으로 교체 — 설계 수정

설계 §5.5는 `fuzzyMatch(path, 12)`를 마커 필터링만 해서 쓰기로 했다. 라이브에서 실제로 나온 제안은 다음과 같았다.

```
- `mxql/mongo/stat`
- `mxql/redis/stat`
- `mxql/techross/01/main` — TIME-FILTER { date:'2020/07/28' , gmt:9}
```

`fuzzyMatch`가 `"stat"` 한 토큰으로 매칭한 결과다. **LLM을 엉뚱한 경로로 유도하므로 그대로 쓸 수 없었다.** 카테고리 기반 제안으로 교체했다 — 카탈로그의 `baseCategories`가 실제 데이터 소스를 지목하므로 경로 이름 유사도보다 강한 신호다.

```
**Data source of this template**: `db3_stat_tx`

**Executable paths over the same or a related category:**
- `mxql/app/stat_tx_pcode` [stat_tx] — Transaction statistics
```

`db3_stat_tx` → `stat_tx` 정규화(`^(db\d*_|v\d+_)` 제거)로 찾아낸 것이고, 이 경로를 실제 호출하면 트랜잭션 통계가 **나온다**(`tx_count 47, tx_error 0, tx_time 4178.62`). 즉 LLM이 원래 원했던 답을 얻는다. 매칭이 무의미하면 목록을 만들지 않고 "관련 없는 경로로 대체하지 말라"고 명시한다.

동일 제안기를 `not found` 응답에도 적용했다. `v2/container/kube_pod`(존재하지 않는 경로)에 대해 `kube_pod_stat`, `kube_stat_pod`, `cpm/kube_pod_stat`을 제안한다.

### 4.2 미확인 #3 부분 해소

설계 §10-3은 "`mxql/` 트리에 트랜잭션 통계 대체 경로가 있는지 미확인"으로 남겨 뒀다. 실측 결과 **`mxql/app/stat_tx_pcode` (baseCategory `stat_tx`) 1건 존재**한다. 경로 이름으로는 `transaction` 토큰이 마커 없는 경로에 0건이지만 카테고리로는 찾힌다 — PR4의 검색 필터 선행 조건이 이 방식으로 해결된다.

### 4.3 `log_search` 빈 결과도 가로채도록 추가

설계는 `log.ts`에 오류 행 검사만 넣기로 했다. 라이브 시험에서 **존재하지 않는 카테고리**를 넣으면 서버가 빈 배열을 주고, 포매터(`format.ts:76`)의 `"No data found for the specified time range."`가 나왔다 — 같은 결함의 다른 출구다. `log.ts`가 보낸 MXQL을 알고 있으므로 빈 결과도 가로채 에코하도록 추가했다.

~~~
Executed MXQL (sent verbatim to the server):
```mxql
CATEGORY NoSuchCategoryXYZ      ← 오타/오류가 응답에서 바로 보인다
LogCountLoad
GROUP { timeunit:5m, pk:pcode, merge:[rows] }
SELECT [time, rows]
```
~~~

`format.ts:76`의 문구 자체도 원인 단정을 제거했다(다른 호출부의 방어선으로 남으므로).

### 4.4 path 분기의 카탈로그 원문 첨부 (표시 전용)

카탈로그 키는 `mxql/` 접두사를 갖고 툴 설명은 접두사 없는 형태를 권하므로, `v2/container/kube_pod_stat`는 `describeMql`을 못 맞고 path 엔드포인트로 간다. 이 경우 카탈로그 원문을 **표시 전용**으로 조회해 첨부한다(`CATALOG_RAW["mxql/" + path]`). 실행 경로 선택은 의도적으로 그대로 뒀다 — 그것을 바꾸면 340개 v2 경로의 엔드포인트가 달라지므로 별도 PR 사안이다.

## 5. 회귀 검증

| 검사 | 결과 |
|---|---|
| vitest 전체 | **93 passed / 10 files** (신규 42건 포함) |
| 라이브 MCP 프로토콜 인수시험 | **12/12 PASS** (2회 실행, 수정 전후 동일) |
| 경로 스윕 (56 쌍, 5개 프로젝트) | 마커 없는 47개 중 **40개 정상 행 반환**, 7개는 진짜 빈 결과(MySQL 프로젝트에 DB2/MSSQL 경로 조회) |
| 마커 경로 차단 | 카탈로그의 **마커 키 200개 전부** `isError`, fake client 호출 **0회** |
| 토큰 유출 | 저장소 내 토큰 문자열 **0건** (스크래치패드에만 보관) |

`whatap_apm_anomaly`는 `Promise.all` → `allSettled` 교체 후에도 라이브 인수시험을 통과했다(1431 chars 분석 반환).

### 5.1 테스트 함정 실증

설계 §8.1이 예측한 두 함정이 실제로 나타났다.

1. **`tests/mcp-protocol/test.ts:102`** — `text.includes("No data")`를 실패 신호로 쓰므로 문구 변경 후 **조용히 항상 통과**하게 된다. 결과 테이블(`|`) 존재 검사와 `isError` 검사를 추가했다.
2. **`tests/format.test.ts:9`** — `expect(result).toContain('No data')`. 이건 **시끄럽게 실패했다**(1 failed). 문구가 아니라 계약을 검증하도록 교체했다.

두 번째가 첫 번째보다 안전한 테스트라는 점이 그대로 드러났다.

## 6. 변경 파일

**신규**

| 파일 | 내용 |
|---|---|
| `src/yard/markers.ts` | `scanMarkers()` — 미치환 `<% %>` 탐지 |
| `tests/markers.test.ts` | 스캐너 단위 + 카탈로그 실측 고정(100/48/27/22/3, 중복 200) |
| `tests/query-data.test.ts` | 4-상태 종단 + 마커 200경로 전수 차단 |

**수정**

| 파일 | 내용 |
|---|---|
| `src/utils/response.ts` | `QueryEcho`/`renderEcho`, `buildNoDataResponse` 재작성, `extractServerError`, `buildServerErrorResponse` |
| `src/tools/yard.ts` | 마커 가드, 오류 판정 교체, 에코 배선, 카테고리 기반 제안기, `describe_query` 배너 + 예시 억제 |
| `src/tools/log.ts` | 오류 행 검사 + 빈 결과 에코 |
| `src/tools/mesh.ts` | `allSettled` + 부분 실패 배너 + 원인 단정 제거 |
| `src/tools/promql.ts` | 공용 헬퍼로 치환 |
| `src/api/client.ts` | `MXQL_PAGE_KEY` export |
| `src/utils/format.ts` | 빈 결과 문구의 원인 단정 제거 |
| `tests/{format,response,mcp-protocol}` | 계약 기반으로 교체·보강 |

## 7. 남은 항목

1. **PR4(카탈로그 정리)는 미착수** — `CatalogEntry.hasUnresolvedMarkers` 플래그, `target/classes/` 제외(931→815), `searchEntries` 필터. 현재 수정은 **실행 차단**까지이고, 검색 결과에서 마커 경로를 **숨기는** 일은 카탈로그 재생성(yard 경로 필요)을 수반한다. `search="transaction"`은 여전히 18건 전부 마커 경로를 반환한다.
2. **경로 이중 표기(`mxql/` 접두사)는 표시 전용으로만 우회했다.** 실행 라우팅 정규화는 340개 경로의 엔드포인트를 바꾸는 별건.
3. **`ERROR_ROW_KEYS`에 `err`/`errorMessage`/`error_message`/`msg`를 넣어 뒀으나 실측된 것은 `error`뿐이다.** 나머지는 방어적 추가이며, 로그 응답에서 `msg` 컬럼이 정상 데이터로 쓰이면 오탐 가능 — 운영 관찰 필요.
4. **75(빈 배열)/22(오류) 경로별 매핑은 재현하지 않았다.** 두 부류 모두 마커 가드가 동일하게 차단하므로 수정 유효성에는 영향 없다.
5. **`src/tools/log.ts`에 선재하던 타입 오류 4건**(`mode` 인덱싱)은 본 수정과 무관하며 손대지 않았다.
