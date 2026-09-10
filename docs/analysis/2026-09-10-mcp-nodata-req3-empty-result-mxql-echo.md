# 2026-09-10 · 요청 3 분석 — 빈 결과일 때 실행한 MXQL을 함께 보여 주십시오

대상 티켓: `[MCP] "No data found"이 쿼리 미실행인지 데이터 부재인지 구분되게 해 주십시오`
대상 저장소: `/home/hsnam/git_hub/whatap-open-mcp` (npm `whatap-mcp` 1.2.1, main HEAD `c6e1f8a`, 작업 트리에 미커밋 수정 있음)
담당 범위: 요청 3 + 응답 계약(response contract). 요청 1(에러 패스스루)과 요청 2(마커 사전 검증)는 이웃 분석으로 참조만 함.

---

## 요약 (5줄)

1. **판정: 에코는 반드시 넣어야 하고, 지금 문구는 반드시 바꿔야 한다.** 현재 `buildNoDataResponse`는 실행 사실도 쿼리도 시간창도 남기지 않은 채 세 가지 원인을 **단정**해 LLM에게 넘긴다.
2. **가장 흔한 호출 경로에서는 MCP가 실행된 MXQL을 모른다.** 툴 설명이 권장하는 `path="v2/sys/server_base"` 형태는 카탈로그 조회(`describeMql`)에 실패해 path 엔드포인트로 빠지고, 서버가 `.mql`을 전개한다. 반대로 `whatap_data_availability`가 출력하는 `mxql/v2/...` 형태는 text 엔드포인트로 가서 raw MXQL 전문을 MCP가 쥐고 있다. **같은 데이터를 두 갈래로 부르는 구조**가 이 요청의 핵심 난점이다.
3. 두 갈래 모두 `client.ts` 반환 타입을 바꾸지 않고도 에코가 가능하다. 필요한 것은 요청 객체를 호출 직전에 지역 변수로 끌어올리는 것뿐이다(`src/tools/yard.ts:878-897`).
4. **에러가 "No data found"로 위장되는 지점을 하나 특정했다**: `src/tools/yard.ts:934-947`. 서버가 200으로 돌려준 에러 행이 `!r["error"]` 필터에 걸려 제거된 뒤 행 수 0으로 판정되어, 구문 오류가 "데이터 없음"으로 보고된다.
5. 요청 1·2가 반영된 뒤에도 잔여 사례(보고서 기준 75건의 빈 배열)는 그대로 남으며, 그 75건을 구분할 수 있는 유일한 수단이 이 에코다. 에코는 요청 1·2와 중복되지 않는다.

---

## 1. 책임 코드

모든 인용은 **디스크의 현재 작업 트리**(미커밋 수정 포함) 기준으로 확인했다.

### 1.1 "No data found" 문구를 만드는 곳 — 전수

| 생산자 | 위치 | 문구 | 실행 컨텍스트를 갖고 있나 |
|---|---|---|---|
| `buildNoDataResponse` | `src/utils/response.ts:173-208` | `**No data found.**` + 원인 3종 | ✗ (pcode/timeRange/category만) |
| `formatMxqlResponse` (배열 길이 0) | `src/utils/format.ts:36-41` | `No data found for the specified time range.` | ✗ |
| `formatMxqlResponse` (메타 필터 후 0) | `src/utils/format.ts:70-78` | 동일 | ✗ |
| `formatLogContentResponse` (배열 0) | `src/utils/format-log.ts:34-42` | `No log lines matched the filter in this window.` | △ (category/timeRange만) |
| `formatLogContentResponse` (필터 후 0) | `src/utils/format-log.ts:68-71` | 동일 | △ |
| `whatap_describe_query` OpenMetrics | `src/tools/yard.ts:425-434` | `**No data found for metric "…".**` | △ (metric 이름은 있음) |
| `whatap_apm_anomaly` | `src/tools/mesh.ts:376-392` | `**No APM data found.** This project may not be an APM project, …` | ✗ |
| `whatap_service_topology` | `src/tools/mesh.ts:492-511` | `**No NPM topology data found.** This could mean: …` | ✗ |
| `whatap_create_promql` | `src/tools/promql.ts:170-186` | `**Query returned no data.**` + **쿼리 원문 에코** | **○ (유일한 선례)** |

`buildNoDataResponse`의 호출 지점은 딱 셋이다.

```
src/tools/yard.ts:826   // PromQL 실행 모드
src/tools/yard.ts:900   // MXQL, result.length === 0
src/tools/yard.ts:941   // MXQL, 메타/에러 행 필터 후 0
```

### 1.2 현재 넘기는 컨텍스트 vs 넘길 수 있는 컨텍스트

`src/utils/response.ts:173-178`

```ts
export function buildNoDataResponse(opts: {
  toolName: string;
  projectCode: number;
  timeRange?: string;
  category?: string;
}): McpResponse {
```

호출부별 실태:

- **`src/tools/yard.ts:826-830`** — `{ toolName, projectCode, timeRange }`. `category` 없음.
  넘길 수 있었던 것: `query`(PromQL 원문), `savedQuery` 이름, `stime`/`etime`(`:811`에서 이미 계산됨), `limit`, 그리고 `client.executePromql`이 내부에서 만드는 `OPENMX ${query}` 문자열(`src/api/client.ts:124`).
- **`src/tools/yard.ts:900-904`** — `{ toolName, projectCode, timeRange }`. `category`조차 없음.
  넘길 수 있었던 것: `rawMxql`(`:875`), `params`, `stime`/`etime`(`:871`), `limit`, 어느 엔드포인트를 탔는지(`:878` 분기), `path`.
- **`src/tools/yard.ts:941-946`** — `{ toolName, projectCode, timeRange, category: describeMql(path)?.entry.baseCategories[0] }`.
  추가로 넘길 수 있었던 것: 위와 동일 + **필터링으로 버려진 에러 행 내용**(`result` 자체가 스코프에 살아 있음).

### 1.3 `category`가 사실상 항상 비어 있다는 문제

`src/utils/response.ts:183-190`은 `opts.category`가 있을 때만 플랫폼 힌트를 붙인다. 그런데 `category`를 채우는 유일한 곳(`src/tools/yard.ts:945`)은 `describeMql(path)`에 의존한다.

`src/yard/catalog.ts:114-116`

```ts
export function describeMql(path: string): (MqlMetadata & { entry: CatalogEntry }) | null {
  const entry = byPath().get(path);
  if (!entry) return null;
```

`byPath()`는 `CatalogEntry.path`를 **그대로** 키로 쓴다(`src/yard/catalog.ts:33-40`). 그리고 카탈로그의 실제 path 값은 전부 `mxql/` 접두사를 갖는다 — `"path": "v2/…"` 형태는 **0건**, `mxql/v2/…` 형태가 340건이다.

반면 툴이 LLM에게 권하는 표기는 접두사 없는 쪽이다.

```
src/tools/yard.ts:738   '- MXQL: whatap_query_data(projectCode=X, path="v2/sys/server_base")\n' +
src/tools/yard.ts:742   "- Server: cpu/mem/disk/net → v2/sys/server_base, v2/sys/server_disk, v2/sys/server_network\n" +
src/tools/yard.ts:744   "- APM per agent: → v2/app/tps_oid, v2/app/resp_time_oid, v2/app/act_tx/act_tx_oid\n" +
src/utils/descriptions.ts:19  'MXQL query path from the yard (e.g., "v2/sys/server_base", "v2/app/tps_pcode"). ' +
```

같은 파일의 다른 함수는 이 이중 표기를 이미 알고 있어서 접두사를 벗겨 준다.

`src/utils/descriptions.ts:276-283`

```ts
export function translateDescription(path: string, original: string): string {
  return ENGLISH_DESCRIPTIONS[path]
    ?? ENGLISH_DESCRIPTIONS[path.replace(/^mxql\//, "")]
    ?? original;
}
```

`describeMql`에는 이 정규화가 없다. 결과적으로 **툴 설명이 시킨 대로 부르면 카탈로그 조회가 실패**하고, `category`는 undefined가 되어 `src/utils/response.ts:184-189`의 플랫폼 힌트는 영영 뜨지 않으며, 실행은 path 엔드포인트로 넘어간다. 이것이 다음 절의 전제다.

### 1.4 실행 경로: 두 갈래

`src/tools/yard.ts:870-897`

```ts
      try {
        const { stime, etime } = parseTimeRange(timeRange);

        // Local catalog priority: if raw MXQL exists in catalog, use text endpoint
        const catalogInfo = describeMql(path);
        const rawMxql = catalogInfo?.raw;

        let result;
        if (rawMxql) {
          result = await client.executeMxqlText(projectCode, {
            stime, etime, mql: rawMxql, limit, param: params,
          });
        } else {
          const mqlPath = path.startsWith("/") ? path : `/${path}`;
          result = await client.executeMxqlPath(projectCode, {
            stime, etime, mql: mqlPath, limit, param: params,
          });
        }
```

클라이언트가 실제로 보내는 본문:

`src/api/client.ts:170-200` (text)

```ts
  async executeMxqlText(pcode: number, params: MxqlTextParams): Promise<MxqlResult> {
    const token = await this.getProjectToken(pcode);
    // Ensure pageKey is set
    const payload = { pageKey: "mxql", ...params };
    const res = await this.fetchProject("/open-mcp/api/flush/mxql/text", pcode, token, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
```

`src/api/client.ts:202-229` (path) — 동일 구조, 엔드포인트만 `/open-mcp/api/flush/mxql/path`.

즉 전송 본문은 `{ pageKey: "mxql", stime, etime, mql, limit, param }`이며, `pageKey`를 제외한 전 필드가 **호출부 스코프에 이미 존재한다**. `pageKey`는 `client.ts:176`/`:207`의 하드코딩 상수다.

**결론 — "실행된 MXQL"의 가용성**

| 분기 | 조건 | `mql`로 실제 전송된 값 | no-data 시점에 스코프에 있나 | 서버가 최종 전개하나 |
|---|---|---|---|---|
| A. text | `describeMql(path)`가 raw를 반환 (예: `mxql/v2/sys/server_base`) | 카탈로그 raw MXQL **전문** | **있음** (`rawMxql`, `:875`) | 아니오 — MCP가 보낸 텍스트가 곧 실행문 |
| B. path | 조회 실패 (예: `v2/sys/server_base`) | `"/v2/sys/server_base"` 한 줄 | `mqlPath`는 `else` 블록 지역 변수라 **없음**, 단 `path`는 있어 재구성 가능 | **예** — 서버가 `.mql`을 읽고 마커를 전개. 최종 텍스트는 MCP가 알 수 없음 |
| C. PromQL | `query && !path` (`:809`) | `OPENMX ${query}` (`client.ts:124`) | 문자열 자체는 없지만 `query`가 있고 래핑 규칙이 상수라 **재구성 가능** | 아니오 |

분기 B에서 에코할 수 없는 것: 서버가 만든 최종 MXQL.
분기 B에서 에코해야 할 것: 보낸 요청 본문(`mql: "/v2/..."`, `param`, 시간창, `limit`) + **카탈로그가 갖고 있는 같은 이름의 raw MXQL을 "catalog source, server-expanded"로 명시해 첨부**. 접두사 정규화(`mxql/` + path) 한 줄이면 340개 v2 경로 전부에서 원문을 찾을 수 있다. 이때 첨부문에 `<% ... %>` 마커가 보이면, LLM은 서버가 전개해야 할 템플릿이라는 사실 자체를 알게 된다.

### 1.5 에러가 "No data found"로 위장되는 지점

`src/tools/yard.ts:907-947`

```ts
        // Detect "not found" returned as a data row (server returns 200 with error in body)
        if (
          Array.isArray(result) && result.length === 1 &&
          typeof result[0] === "object" && result[0] !== null &&
          "error" in result[0]
        ) {
          const errorMsg = String((result[0] as Record<string, unknown>).error);
          if (errorMsg.includes("not found")) {
            …
          }
        }

        // Check for no data after filtering metadata rows
        const dataRows = Array.isArray(result)
          ? result.filter((r: Record<string, unknown>) => !r["_head_"] && !r["error"])
          : [];
        if (dataRows.length === 0) {
          return buildNoDataResponse({ … });
        }
```

`:916`의 조건은 `"not found"`를 포함하는 메시지만 통과시킨다. 그 외의 모든 서버 에러 행(구문 오류, 파라미터 누락, 마커 미전개 등)은 `:937`의 `!r["error"]`에 걸려 조용히 제거되고, 곧바로 `:940`에서 행 수 0으로 판정되어 **"No data found."** 가 나간다. 요청 1이 `:916`을 다루더라도, `:934-947`의 이 소거 경로는 별도로 막아야 한다. (요청 1과 인접하지만 다른 줄이며, 여기서는 "에러를 잃지 말고 에코에 실어라"는 관점으로 다룬다.)

### 1.6 카탈로그 마커 실측 (요청 2 전제의 교차 확인)

`src/data/mxql-catalog.ts:23326`의 `CATALOG_RAW`는 931개 키를 갖는다. `<% ... %>` 마커를 포함한 키는 200개인데, 접두사별로 `src/main/resources/...` 100개 + `target/classes/...` 100개로 **논리적으로 동일한 100개 경로가 두 번 실린 것**이다. 보고자가 말한 "100 catalog paths"와 정확히 일치한다. 마커 상위 빈도는 `<% AGENT %>`(102), `<%TIMEUNIT%>`(88), `<% FILTER %>`(86), `<%OID%>`(58) 등이다. 이 항목들은 `describeMql`이 raw를 반환하므로 **분기 A(text)** 로 흘러가고, 서버는 전개할 수 없는 문자열을 그대로 받아 빈 배열 또는 에러를 돌려준다. 에코가 켜져 있으면 이 사실이 응답 본문에서 한눈에 드러난다.

---

## 2. 다른 빈-결과 경로 감사

### 2.1 `src/tools/log.ts`

MQL은 `:280-289`에서 `buildLogMql`로 만들어져 지역 변수 `mql`에 들어가고, `:292-297`에서 그대로 전송된다. **에코에 필요한 값이 전부 한 함수 안에 있다** — 가장 손대기 쉬운 지점이다.

- **count 모드** (`:300-327`): 결과가 비어 있어도 검사 없이 `formatMxqlResponse`로 넘어가고, `src/utils/format.ts:39`가 `"No data found for the specified time range."` 한 줄을 낸다. 여기에 붙는 헤더(`:306-318`)는 mode/timeBucket/group만 알려 줄 뿐 MQL도 시간창도 없다.
- **content 모드** (`:328-350`): `formatLogContentResponse`가 `src/utils/format-log.ts:34-42`에서 `"No log lines matched the filter in this window."` 를 낸다. 문구 자체는 **원인을 단정하지 않아 현행 중 가장 정직**하고, category/timeRange를 함께 찍는다(`:37`). 다만 MQL은 없다. 이 문구를 다른 경로의 모범으로 삼을 만하다.
- 두 모드 모두 `client.executeMxqlText`가 던진 예외는 `:351-358`에서 `classifyAndBuildError`로 간다. 여기까지는 정상.

### 2.2 `src/tools/mesh.ts`

`src/tools/mesh.ts:349-366`

```ts
        const [tpsData, respData, errData, actTxData] = await Promise.all([
          client.executeMxqlPath(projectCode, { ...base, mql: "/v2/app/tps_oid" }),
          client.executeMxqlPath(projectCode, { ...base, mql: "/v2/app/resp_time_oid" }),
          client.executeMxqlPath(projectCode, { ...base, mql: "/v2/app/tx_error_oid" }),
          client.executeMxqlPath(projectCode, { ...base, mql: "/v2/app/act_tx/act_tx_oid" }),
        ]);
```

두 가지 결함이 있다.

1. **`Promise.all`이라 하나만 실패해도 전체가 예외로 무너진다.** 성공한 3개 결과는 버려지고 `:453-459`의 `classifyAndBuildError`가 하나의 에러만 보고한다. 어느 서브쿼리가 죽었는지 응답에 남지 않는다. → `Promise.allSettled`로 바꾸고 실패분을 개별 표기해야 한다.
2. **전부 비었을 때의 문구가 단정적이다.** `:376-392`의 `totalRows === 0` 분기는 `"This project may not be an APM project, or there are no active agents sending data in the specified time range."` 라고 말한다. 이는 티켓이 지적한 바로 그 형태의 근거 없는 인과 주장이다. 4개 서브쿼리 각각의 행 수(`tpsRows`/`respRows`/`errRows`/`actTxRows`, `:368-371`)를 그대로 찍어 주기만 해도 "4개 중 3개는 돌았고 tps만 0" 같은 판단이 가능해진다.

`whatap_service_topology`(`:483-511`)도 동일하다. 단일 쿼리 `"/npm/all/topology/app_name_latency"`가 `:486`에 문자열 리터럴로 박혀 있으므로 에코가 자명한데, `:499-501`은 대신 `"The project does not have an NPM agent installed."` 를 원인으로 제시한다.

### 2.3 `src/tools/promql.ts`

`:170-186`의 `**Query returned no data.**` 는 **이미 `**Query**: \`${query}\`` 로 쿼리를 에코하고 있고**, `"The query syntax may be valid but no metrics matched in the time range."` 라고 아는 것과 모르는 것을 구분해 서술한다. 이 저장소 안에 이미 존재하는 정답이며, 요청 3의 목표는 이 형태를 전 툴로 확대하는 것이다. 다만 시간창(`stime`/`etime`, `:126`에서 계산됨)은 여전히 빠져 있다.

`:135-160`의 에러 행 처리는 `whatap_query_data`와 달리 `"error"` 키를 가진 행을 발견하면 즉시 `isError: true`로 반환한다 — `yard.ts:934-947`이 같은 상황에서 그 행을 버리는 것과 정반대다. 두 파일의 정책 불일치 자체가 결함이다.

### 2.4 `src/utils/format.ts`

`:36-41`과 `:70-78`에 같은 문자열이 두 번 있다. 이 함수는 순수 포매터라 pcode·MQL·엔드포인트를 알지 못하며 알 필요도 없다. **포매터에 에코를 넣지 말고, 호출부에서 빈 결과를 먼저 가로채는 것**이 옳다(§3.3의 log.ts 패치가 그 형태다). 다만 `formatMxqlResponse`가 빈 결과를 조용히 삼키는 성질 때문에, 호출부가 검사를 잊으면 정보 없는 한 줄이 나간다는 점은 기록해 둔다. 현재 `src/tools/log.ts:301`이 정확히 그 상태다.

---

## 3. 제안

### 3.1 4-상태 판정표

| 상태 | 판정 조건 | 현재 응답 | 제안 응답 | 담당 |
|---|---|---|---|---|
| **A. executed-ok-empty** | HTTP 2xx, 배열 응답, 에러 행 없음, 데이터 행 0 | `**No data found.**` + 원인 3종 단정 (`response.ts:179-194`) | `**No rows returned.**` + 실행 에코 + 아는 것/모르는 것 구분. `isError` 없음 | **요청 3** |
| **B. executed-error** | HTTP 2xx이나 본문에 에러 행/에러 객체 (`yard.ts:915`, `client.ts:191-197`) | `"not found"`만 별도 처리(`yard.ts:916`), 나머지는 필터로 소거되어 A로 위장(`yard.ts:937,940`) | `isError: true`, 서버 원문 메시지 그대로 + 실행 에코 | 요청 1 (+ `yard.ts:934-947` 소거 경로는 본 문서에서 추가 지적) |
| **C. not-executed-invalid** | raw MXQL에 `<% … %>` 잔존, 필수 param 누락 등 — **전송 전** 판정 | 그대로 전송 → 서버가 0행 반환 → A로 보고 | 전송하지 않고 `isError: true`. 어떤 마커가 남았는지 열거. "실행되지 않았다"를 명시 | 요청 2 |
| **D. transport failure** | non-2xx, timeout/Abort, 토큰 없음 (`client.ts:339-345`, `:365-370`) | `classifyAndBuildError` (`response.ts:46-111`) — 분류는 적절 | 유지. 단 **시도한 요청의 에코를 함께** 첨부(어떤 쿼리가 타임아웃했는지 알 수 있게) | 요청 3 (부수) |

핵심: **A와 C는 LLM에게 정반대의 결론을 지시해야 한다.** A는 "이 창에서는 행이 없었다"이고 C는 "이 질문에 대해 아무것도 측정하지 않았다". 지금은 둘 다 같은 문장으로 나가며, 그 문장이 A를 C처럼 읽히게 만들고 있다.

### 3.2 `buildNoDataResponse` — before / after

**Before** (`src/utils/response.ts:173-208`, 전문은 §1.2 참조)

```ts
export function buildNoDataResponse(opts: {
  toolName: string;
  projectCode: number;
  timeRange?: string;
  category?: string;
}): McpResponse {
  const lines: string[] = ["**No data found.**", ""];
  lines.push("**Possible causes:**");
  if (opts.category) { /* CATEGORY_PLATFORMS 힌트 */ }
  lines.push(
    "- Time range may be too narrow or no data was collected in this window.",
    "- No active agents sending data for this category."
  );
  …
}
```

**After**

```ts
/** How a query reached the server, for echoing back on an empty result. */
export interface QueryEcho {
  /** Which API endpoint carried the request. */
  endpoint: "mxql/text" | "mxql/path" | "openmx/text";
  /** The exact value of the `mql` field in the POST body. */
  sentMql: string;
  /**
   * True when `sentMql` is a path reference the server expands server-side.
   * In that case `sentMql` is NOT the executed query text.
   */
  serverExpanded?: boolean;
  /** Catalog text for the same path — shown only when serverExpanded. */
  catalogRawMxql?: string;
  param?: Record<string, string>;
  stime: number;
  etime: number;
  limit?: number;
  pageKey?: string;
  /** Rows before / after metadata+error filtering. */
  rawRowCount: number;
  dataRowCount: number;
  /** Error rows that filtering removed — never drop these silently. */
  serverNotes?: string[];
}

const MXQL_ECHO_MAX_CHARS = 1200;

function fenceMxql(src: string): string {
  const compact = src.replace(/\n{3,}/g, "\n\n").trim();
  const shown =
    compact.length <= MXQL_ECHO_MAX_CHARS
      ? compact
      : compact.slice(0, MXQL_ECHO_MAX_CHARS) +
        `\n… (truncated; ${compact.length} chars total)`;
  return "```mxql\n" + shown + "\n```";
}

function fmtWindow(stime: number, etime: number): string {
  const iso = (ms: number) =>
    new Date(ms).toISOString().replace("T", " ").slice(0, 19);
  const kst = (ms: number) =>
    new Date(ms + 9 * 3_600_000).toISOString().replace("T", " ").slice(0, 19);
  return (
    `${stime} → ${etime}\n` +
    `  UTC: ${iso(stime)} → ${iso(etime)}\n` +
    `  KST: ${kst(stime)} → ${kst(etime)}`
  );
}

export function buildNoDataResponse(opts: {
  toolName: string;
  projectCode: number;
  timeRange?: string;
  category?: string;
  echo?: QueryEcho;          // ← 추가. 없으면 기존과 동일한 축약 응답
}): McpResponse {
  const e = opts.echo;
  const lines: string[] = [
    "**No rows returned.**",
    e
      ? "The request reached the server and came back without an error and without rows."
      : "The request completed without rows. (Execution details were not captured for this call site.)",
    "",
  ];

  if (e) {
    lines.push("**What was executed**", "");
    lines.push(`- Endpoint: \`${e.endpoint}\``);
    lines.push(
      `- Project: ${opts.projectCode}` +
        (opts.timeRange ? ` | timeRange: "${opts.timeRange}"` : "")
    );
    lines.push(`- Window (epoch ms): ${fmtWindow(e.stime, e.etime)}`);
    if (e.limit != null) lines.push(`- limit: ${e.limit}`);
    if (e.pageKey) lines.push(`- pageKey: ${e.pageKey}`);
    lines.push(
      `- param: ${e.param && Object.keys(e.param).length > 0 ? JSON.stringify(e.param) : "(none)"}`
    );
    lines.push(
      `- Rows: ${e.rawRowCount} returned, ${e.dataRowCount} after metadata filtering`
    );
    lines.push("");

    if (e.serverExpanded) {
      lines.push(
        `Sent \`mql\`: \`${e.sentMql}\` — a path reference. ` +
          "The server expands the .mql file, so the executed text is not visible to this client."
      );
      if (e.catalogRawMxql) {
        lines.push("", "Catalog source for this path (server-expanded, not the executed text):");
        lines.push(fenceMxql(e.catalogRawMxql));
      }
    } else {
      lines.push("Executed MXQL (sent verbatim to the server):");
      lines.push(fenceMxql(e.sentMql));
    }

    if (e.serverNotes && e.serverNotes.length > 0) {
      lines.push("", "**Server notes returned alongside the rows:**");
      for (const n of e.serverNotes) lines.push(`- ${n}`);
    }
    lines.push("");
  }

  // ── 원인 단정 → 확인/미확인 구분 ──
  lines.push("**What this tells you**", "");
  lines.push(
    "- Known: this query, over this window, returned zero rows.",
    "- Not known: whether the metric is collected at all, whether agents are running, " +
      "and whether the query is well-formed for this project.",
    "- **Do not report this as \"not measured\", \"not collected\", or \"no agents\".** " +
      "This response is not evidence for any of those."
  );
  if (e && !e.serverExpanded && /<%[\s\S]*?%>/.test(e.sentMql)) {
    lines.push(
      "- The MXQL above still contains unresolved `<% … %>` template markers. " +
        "It could not have matched anything. Treat this result as **query not executed as intended**, not as absent data."
    );
  }
  if (opts.category && CATEGORY_PLATFORMS[opts.category]) {
    lines.push(
      `- Context: \`${opts.category}\` is typically populated by ${CATEGORY_PLATFORMS[opts.category]} projects. ` +
        "This is a catalog convention, not a measurement of this project."
    );
  }
  lines.push("");

  lines.push("**To narrow it down**", "");
  lines.push(
    `- \`whatap_data_availability(projectCode=${opts.projectCode})\` — probes live categories.`
  );
  if (opts.timeRange) {
    lines.push(`- Re-run with a wider timeRange (current: "${opts.timeRange}").`);
  }
  lines.push(
    `- \`whatap_list_agents(projectCode=${opts.projectCode})\` — confirms agents are reporting.`
  );
  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}
```

`CATEGORY_PLATFORMS` 힌트는 삭제하지 않되 **"카탈로그 관례이지 이 프로젝트에 대한 측정이 아니다"** 라는 단서를 붙였다. 원래 문구는 이것을 원인 후보로 제시했고, 보고자가 지적한 세 거짓 중 하나가 여기서 나왔다.

### 3.3 호출부 — before / after

#### `src/tools/yard.ts` MXQL 분기 (`:870-947`)

**Before**

```ts
        const catalogInfo = describeMql(path);
        const rawMxql = catalogInfo?.raw;

        let result;
        if (rawMxql) {
          result = await client.executeMxqlText(projectCode, {
            stime, etime, mql: rawMxql, limit, param: params,
          });
        } else {
          const mqlPath = path.startsWith("/") ? path : `/${path}`;
          result = await client.executeMxqlPath(projectCode, {
            stime, etime, mql: mqlPath, limit, param: params,
          });
        }

        if (Array.isArray(result) && result.length === 0) {
          return buildNoDataResponse({
            toolName: "whatap_query_data", projectCode, timeRange,
          });
        }
        …
        if (dataRows.length === 0) {
          return buildNoDataResponse({
            toolName: "whatap_query_data", projectCode, timeRange,
            category: describeMql(path)?.entry.baseCategories[0],
          });
        }
```

**After** — `client.ts`는 손대지 않는다. 요청 객체를 분기 밖으로 끌어올리는 것으로 끝난다.

```ts
        // 접두사 정규화: 툴 설명은 "v2/…", 카탈로그 키는 "mxql/v2/…"
        // (descriptions.ts:281 이 이미 같은 정규화를 한다)
        const catalogInfo = describeMql(path) ?? describeMql(`mxql/${path}`);
        const rawMxql = catalogInfo?.raw || undefined;

        const usedTextEndpoint = Boolean(rawMxql);
        const sentMql = usedTextEndpoint
          ? rawMxql!
          : (path.startsWith("/") ? path : `/${path}`);
        const request = {
          stime, etime, mql: sentMql, limit, param: params,
        };

        const result = usedTextEndpoint
          ? await client.executeMxqlText(projectCode, request)
          : await client.executeMxqlPath(projectCode, request);

        const rows = Array.isArray(result) ? result : [];
        const dataRows = rows.filter(
          (r: Record<string, unknown>) => !r["_head_"] && !r["error"]
        );
        // 필터로 버려질 에러 행을 먼저 회수한다 (yard.ts:937 의 소거 문제)
        const serverNotes = rows
          .filter((r: Record<string, unknown>) => r["error"])
          .map((r) => String((r as Record<string, unknown>).error));

        const echo: QueryEcho = {
          endpoint: usedTextEndpoint ? "mxql/text" : "mxql/path",
          sentMql,
          serverExpanded: !usedTextEndpoint,
          catalogRawMxql: usedTextEndpoint ? undefined : catalogInfo?.raw || undefined,
          param: params,
          stime, etime, limit,
          pageKey: MXQL_PAGE_KEY,          // client.ts 에서 export 한 상수
          rawRowCount: rows.length,
          dataRowCount: dataRows.length,
          serverNotes: serverNotes.length > 0 ? serverNotes : undefined,
        };

        // … 여기서 요청 1 의 "not found" / 에러 패스스루 분기 (echo 를 함께 전달) …

        if (dataRows.length === 0) {
          return buildNoDataResponse({
            toolName: "whatap_query_data",
            projectCode,
            timeRange,
            category: catalogInfo?.entry.baseCategories[0],
            echo,
          });
        }
```

부수 효과 세 가지를 의도적으로 얻는다. (1) `:899`와 `:940`의 중복된 두 no-data 분기가 하나로 합쳐진다. (2) `describeMql`이 두 번 호출되던 것(`:874`, `:945`)이 한 번이 된다. (3) 접두사 정규화로 340개 `v2/…` 경로가 text 분기로 옮겨가 **원문 에코가 가능해지고 `category`도 채워진다.** 단 (3)은 실행 엔드포인트를 바꾸는 변경이라 별도 검증이 필요하다 — §5 참조.

`client.ts`에는 상수 하나만 추가하면 된다.

```ts
// src/api/client.ts
export const MXQL_PAGE_KEY = "mxql";
…
    const payload = { pageKey: MXQL_PAGE_KEY, ...params };   // :176, :207
```

#### `src/tools/log.ts` count 모드 (`:292-327`)

**Before**

```ts
        const result = await client.executeMxqlText(projectCode, {
          stime: range.stime, etime: range.etime, mql, limit: effectiveLimit,
        });

        if (mode === "count") {
          let text = formatMxqlResponse(result, { … });
```

→ 빈 결과는 `format.ts:39`가 `"No data found for the specified time range."` 한 줄로 삼킨다.

**After**

```ts
        const request = {
          stime: range.stime, etime: range.etime, mql, limit: effectiveLimit,
        };
        const result = await client.executeMxqlText(projectCode, request);

        const rows = Array.isArray(result) ? result : [];
        const dataRows = rows.filter((r) => !r["_head_"] && !r["error"]);
        if (dataRows.length === 0) {
          return buildNoDataResponse({
            toolName: "whatap_log_search",
            projectCode,
            timeRange,
            category: cat,
            echo: {
              endpoint: "mxql/text",
              sentMql: mql,               // buildLogMql 이 만든 그 문자열 (:280)
              stime: range.stime,
              etime: range.etime,
              limit: effectiveLimit,
              pageKey: MXQL_PAGE_KEY,
              rawRowCount: rows.length,
              dataRowCount: 0,
              serverNotes: rows
                .filter((r) => r["error"])
                .map((r) => String(r["error"])),
            },
          });
        }

        if (mode === "count") { … 이하 동일 … }
```

로그 검색은 MQL이 **MCP가 직접 조립한 것**이므로(`buildLogMql`, `:86-117`) 에코의 가치가 가장 높다. `LogTag { key:level, value:"ERROR" }` 가 그대로 보이면 필터 오타를 LLM이 즉시 잡는다.

### 3.4 렌더링된 응답 — 상태 A, 분기 A(text)

````markdown
**No rows returned.**
The request reached the server and came back without an error and without rows.

**What was executed**

- Endpoint: `mxql/text`
- Project: 3730 | timeRange: "5m"
- Window (epoch ms): 1757483100000 → 1757483400000
  UTC: 2026-09-10 05:45:00 → 2026-09-10 05:50:00
  KST: 2026-09-10 14:45:00 → 2026-09-10 14:50:00
- limit: 100
- pageKey: mxql
- param: {"oid":"12345"}
- Rows: 0 returned, 0 after metadata filtering

Executed MXQL (sent verbatim to the server):

```mxql
-- 에이전트별 호스트 CPU%, 5초값
INJECT timepast
HEADER {cpu$:'%'}
CATEGORY {"app_host_resource":6h, "app_host_resource{m5}":3d, "app_host_resource{h1}":unlimit }
OIDSET {oid:$oid, okind:$okind, onode:$onode}
TAGLOAD
SELECT [time, oid, oname, cpu]
CREATE {key:_id_, from:oid}
CREATE {key:_name_, from:oname}
DELETE [oid,oname]
ROWNUM
```

**What this tells you**

- Known: this query, over this window, returned zero rows.
- Not known: whether the metric is collected at all, whether agents are running, and whether the query is well-formed for this project.
- **Do not report this as "not measured", "not collected", or "no agents".** This response is not evidence for any of those.
- Context: `app_host_resource` is typically populated by APM (JAVA, NODEJS, PYTHON, etc.) projects. This is a catalog convention, not a measurement of this project.

**To narrow it down**

- `whatap_data_availability(projectCode=3730)` — probes live categories.
- Re-run with a wider timeRange (current: "5m").
- `whatap_list_agents(projectCode=3730)` — confirms agents are reporting.
````

### 3.5 렌더링된 응답 — 상태 A, 분기 B(path, 서버 전개)

````markdown
**No rows returned.**
The request reached the server and came back without an error and without rows.

**What was executed**

- Endpoint: `mxql/path`
- Project: 3730 | timeRange: "5m"
- Window (epoch ms): 1757483100000 → 1757483400000
  UTC: 2026-09-10 05:45:00 → 2026-09-10 05:50:00
  KST: 2026-09-10 14:45:00 → 2026-09-10 14:50:00
- limit: 100
- pageKey: mxql
- param: (none)
- Rows: 0 returned, 0 after metadata filtering

Sent `mql`: `/v2/apm/stat/error_stat` — a path reference. The server expands the .mql file, so the executed text is not visible to this client.

Catalog source for this path (server-expanded, not the executed text):

```mxql
CATEGORY <%CATEGORY%>
TAGLOAD
<% FILTER %>
GROUP { timeunit:<%TIMEUNIT%>, pk:oid, merge:[error] }
SELECT [time, oid, error]
<% ORDER1 %>
<% LIMIT1 %>
```

**What this tells you**

- Known: this query, over this window, returned zero rows.
- Not known: whether the metric is collected at all, whether agents are running, and whether the query is well-formed for this project.
- **Do not report this as "not measured", "not collected", or "no agents".** This response is not evidence for any of those.

**To narrow it down**

- `whatap_data_availability(projectCode=3730)` — probes live categories.
- Re-run with a wider timeRange (current: "5m").
- `whatap_list_agents(projectCode=3730)` — confirms agents are reporting.
````

(위 MXQL 본문은 마커 형태를 보이기 위한 **예시**다. `<% … %>` 마커의 실재와 빈도는 §1.6에서 실측했으나, 이 특정 경로의 정확한 원문은 §5의 미확인 항목으로 남긴다.)

### 3.6 문구 변경 자체가 산출물인 이유

바뀐 것을 항목별로 못 박아 둔다.

| 현행 (`response.ts:179-194`) | 문제 | 대체 |
|---|---|---|
| `**No data found.**` | "데이터가 없다"는 세계에 대한 주장. 실제로는 "이 응답에 행이 없다"뿐 | `**No rows returned.**` — 관측된 사실만 |
| `**Possible causes:**` | 뒤따르는 항목을 원인 후보로 승격시킴. LLM은 목록의 첫 항목을 결론으로 채택하는 경향 | `**What this tells you**` — 아는 것/모르는 것 이분 |
| `- Time range may be too narrow or no data was collected in this window.` | 두 개의 서로 다른 주장을 `or`로 묶어 검증 불가능하게 만듦. 후자는 근거 없음 | "Not known" 목록으로 이동 |
| `- No active agents sending data for this category.` | 에이전트 상태를 조회한 적이 없는데 단정 | `whatap_list_agents`로 **확인하라는 행동 지시**로 강등 |
| (해당 없음) | 하류 LLM이 "미수집"으로 옮겨 적는 것을 막는 장치가 전무 | `**Do not report this as "not measured"…**` 명시 금지문 |

이 금지문 한 줄이 티켓이 지목한 피해(확신에 찬 잘못된 인과 주장이 검토 없이 보고서로 유입)를 직접 겨냥한다.

### 3.7 토큰 비용

- 헤더 블록(엔드포인트·창·param·행 수): 약 90–130 토큰.
- MXQL 펜스: 카탈로그 raw 중앙값이 대략 600–900자이므로 200–300 토큰. `MXQL_ECHO_MAX_CHARS = 1200`에서 잘라 상한 약 400 토큰.
- 아는 것/모르는 것 + 다음 행동: 약 90 토큰.
- **합계 상한 약 600 토큰이며, 오직 빈 결과일 때만 발생한다.** 정상 응답 경로의 토큰 비용은 0이다. 현재는 빈 응답이 약 110 토큰이고 그 대가로 하류에 오정보를 심는다.
- 절약 규칙: 3줄 이상 연속 공백 압축, 1200자 초과 시 절단 + 총 길이 표기, `param`이 비면 `(none)` 한 단어.

---

## 4. 이웃 작업과의 관계 — 에코는 여전히 값을 하는가

요청 1(에러 패스스루, `yard.ts:916/934/940` 주변)과 요청 2(마커 사전 검증)가 반영되면:

- 상태 **B**는 요청 1이 흡수한다 — 보고서의 22건 에러 메시지.
- 상태 **C**는 요청 2가 흡수한다 — 마커를 가진 100개 경로가 아예 전송되지 않는다.
- 상태 **A**는 **누구도 흡수하지 못한다** — 보고서의 75건 빈 배열이 여기 남는다.

75건 중 일부는 요청 2가 전송 전에 걸러 C로 재분류될 것이다(마커 경로가 분기 A로 흐르므로 겹친다). 그러나 마커가 없는데도 0행인 잔여분 — 잘못된 `param`, 프로젝트에 존재하지 않는 `oid`, 카테고리 보존기간을 벗어난 시간창, 실제로 데이터가 없는 정상 케이스 — 은 **정의상 A에 남고, 이들을 서로 구별하는 유일한 단서가 실행 에코와 시간창이다.**

또한 요청 1·2가 반영되어도 **문구 문제는 자동으로 해결되지 않는다.** `response.ts:191-194`의 두 단정문은 상태 A 전용 코드이며 요청 1·2 어느 쪽도 그 줄을 건드리지 않는다. 티켓이 보고한 피해(세 원인이 전부 거짓이었다)는 정확히 이 두 줄에서 나왔다. 요청 3이 없으면 **에러와 미실행만 고쳐지고, 실제로 보고된 그 응답은 그대로 남는다.**

역방향 의존: `buildNoDataResponse`가 `serverNotes`를 받으려면 요청 1이 에러 행을 삼키지 않아야 하고, `serverExpanded` 판정에 §3.3의 접두사 정규화가 얽힌다. 세 작업은 `yard.ts:870-947` 한 블록을 공유하므로 **머지 순서를 정하고 한 사람이 그 블록을 재작성하는 편이 안전하다.**

---

## 5. 미확인 / 가정

1. **API를 한 번도 호출하지 않았다.** 토큰이 없어 정적 분석만 수행했다. 서버가 빈 결과와 에러를 실제로 어떤 JSON 모양으로 돌려주는지는 `src/api/client.ts:189-198`, `:219-228`의 방어 코드로부터 **역추론**했을 뿐 관측하지 않았다. 특히 "배열 안에 `error` 키를 가진 행"이 어떤 상황에서 나오는지는 `yard.ts:907-916`의 주석(`server returns 200 with error in body`)을 근거로 삼았다.
2. **보고서의 75 / 22 / 3 분해는 재현하지 않았다.** 카탈로그 마커 100개 경로는 §1.6에서 독립 실측해 일치를 확인했으나, 그 100개를 실제 전송했을 때의 응답 분포는 확인할 수 없었다.
3. **§3.5의 예시 MXQL은 마커 형태를 보이기 위한 합성 예시다.** `<% CATEGORY %>`·`<%TIMEUNIT%>` 등 마커의 실재와 빈도는 실측했지만(`<% AGENT %>` 102회 등), 예시로 든 특정 경로의 원문 전체를 그대로 옮기지는 않았다.
4. **접두사 정규화(§3.3의 `describeMql(\`mxql/${path}\`)`)는 실행 엔드포인트를 바꾸는 변경이다.** 340개 `v2/…` 경로가 path 엔드포인트에서 text 엔드포인트로 옮겨간다. 그중 마커를 가진 것들은 지금까지 서버가 전개해 정상 동작하던 것이 **깨질 수 있다.** 요청 2의 마커 가드가 함께 있어야 안전하며, 순서상 요청 2가 먼저다. 이 사실을 §3.3 본문에도 적어 두었지만 여기서 다시 못 박는다. 에코만 원한다면 정규화 없이도 가능하며(분기 B는 요청 본문만 에코), 정규화는 **선택 가능한 별건**이다.
5. **KST 변환은 고정 +9시간 오프셋으로 계산했다.** 한국은 서머타임이 없으므로 안전하지만, 다른 타임존 사용자에게는 의미가 없다. 서버 응답의 기준 타임존이 UTC라는 것은 `src/utils/format.ts:307-309`(`toISOString` + `" UTC"` 접미)와 `format-log.ts:140-142`가 같은 규칙을 쓰는 데서 유추했다.
6. **`limit`이 서버에서 어떻게 해석되는지 모른다.** `format.ts:81-83`의 주석은 "API applies limit server-side"라고 하지만 확인하지 않았다. 에코는 보낸 값을 그대로 표기할 뿐 의미를 주장하지 않는다.
7. **mesh.ts의 `Promise.all` → `allSettled` 전환은 제안일 뿐 설계하지 않았다.** 부분 실패 시 무엇을 "분석 가능"으로 볼지(4개 중 몇 개면 충분한지)는 `analyzeApmAnomalies`의 계약을 봐야 정할 수 있고, 이는 요청 3의 범위를 넘는다.
8. **작업 트리에 미커밋 수정이 있다.** `src/utils/response.ts`(+4줄, `NEXT_STEPS`에 `whatap_log_search` 추가), `src/tools/index.ts`(+2줄), 그리고 미추적 파일 `src/tools/log.ts`·`src/utils/format-log.ts`·`tests/log.test.ts`. **본 문서의 모든 행 번호는 이 상태의 디스크 파일 기준**이며, 커밋 `c6e1f8a`와는 다르다. `log.ts`는 아직 git에 없으므로 인용 행이 리뷰 시점에 이동해 있을 수 있다.

---

## 6. 테스트

### 6.1 응답 문구를 건드리는 기존 테스트

| 위치 | 내용 | 이 변경의 영향 |
|---|---|---|
| `tests/response.test.ts:7-45` | `classifyAndBuildError` 4종 | 영향 없음 |
| `tests/response.test.ts:47-57` | `appendNextSteps` 2종 | 영향 없음 |
| `tests/response.test.ts` 전체 | **`buildNoDataResponse` 테스트가 0건** | 신규 작성 필요 |
| `tests/format.test.ts:9-12` | `formatMxqlResponse([])` → `"No data"` 포함 | `format.ts`를 건드리지 않으면 통과. §2.4대로 포매터는 그대로 둔다 |
| `tests/mcp-protocol/test.ts:102` | `if (text.includes("No data") \|\| text.length < 50) throw` | **깨진다기보다 조용히 무력화된다.** 새 문구가 `"No rows returned"`이므로 이 검사는 더 이상 빈 결과를 잡지 못하고 항상 통과한다. 반드시 함께 갱신 |
| `tests/log.test.ts:114-141` | 가짜 client(`executeMxqlText` 캡처) 하네스 | **재사용 가능** — 에코 테스트의 기반 |

`tests/mcp-protocol/test.ts:102`는 라이브 API가 필요한 스모크 테스트라 CI에서 돌지 않을 가능성이 높다. 그래서 더 위험하다 — 사람이 수동으로 돌릴 때 "통과"를 보고 안심하게 된다. 조건을 `text.includes("No rows returned") || text.includes("No data")`로 넓히는 것을 권한다.

### 6.2 신규 테스트

`tests/response.test.ts`에 추가:

1. `echo` 없이 호출 → `"No rows returned"` 포함, `"Possible causes"` **미포함**, `isError` 없음.
2. `echo` 있고 `serverExpanded: false` → 본문에 ```` ```mxql ```` 펜스와 `sentMql` 전문이 포함.
3. `echo.serverExpanded: true` → `"server expands"` 문구 포함, `catalogRawMxql`이 `"Catalog source"` 라벨과 함께 표시되고 **실행문으로 표기되지 않음**.
4. 1200자 초과 MXQL → `"truncated"` 및 총 문자 수 포함, 응답 전체 길이가 상한 이내.
5. `sentMql`에 `<% AGENT %>` 포함 → `"query not executed as intended"` 경고 줄 출현.
6. 시간창 렌더링 → epoch ms 원값과 UTC·KST 문자열이 모두 출현.
7. `serverNotes` 전달 시 각 메시지가 본문에 그대로 출현(요청 1과의 접합면).
8. 금지문 회귀 테스트 — 응답에 `"no data was collected"`, `"No active agents sending data"` 문자열이 **없을 것**. 문구 퇴행을 잡는 가장 값싼 방어선.

`tests/log.test.ts` 하네스(`:120-132`)를 재사용해 추가:

9. `executeMxqlText`가 `[]`를 돌려줄 때 `whatap_log_search`(count) 응답에 `buildLogMql` 결과 문자열이 그대로 들어 있을 것.
10. 같은 조건에서 `LogTag { key:level, value:"ERROR"` 부분이 응답에 보일 것 — 필터 오타를 LLM이 잡을 수 있음을 보장.

`yard.ts`용 신규 파일 `tests/yard-query.test.ts` (현재 없음):

11. 가짜 client로 `path="mxql/v2/app/cpu_oid"` → text 엔드포인트가 호출되고 빈 결과 시 raw MXQL이 에코될 것.
12. `path="v2/app/cpu_oid"`(접두사 없음) → §3.3 정규화 **미적용** 시 path 엔드포인트 + `serverExpanded: true`, **적용** 시 text 엔드포인트. 이 테스트가 §5-4의 위험을 가시화한다.
13. 결과가 `[{ error: "syntax error near GROUP" }]` 한 행일 때 `"No rows returned"`가 **아니라** 에러 응답이 나올 것 — `yard.ts:934-947` 소거 경로의 회귀 방지.
