# 2026-09-10 — [MCP] "No data found" 오진단 분석 · 요청 1: 서버가 준 오류 전달

> 대상 저장소: `whatap-open-mcp` (npm `whatap-mcp` v1.2.1) · 기준 커밋 `c6e1f8a` · 작업 트리 기준(`src/tools/yard.ts`, `src/utils/response.ts`의 no-data 경로는 HEAD와 동일, 미커밋 변경 없음)
> 범위: **요청 1(서버가 준 오류를 그대로 오류로 전달)만** 다룬다. 카탈로그의 미해결 마커(`<% AGENT %>` 등) 치환은 별도 요청 소관이며 여기서는 원인 맥락으로만 언급한다.

## 요약 (5줄)

1. 신고 내용은 **사실이며 재현 경로가 코드상 확정**된다. 서버가 HTTP 200 + `[{"error": "..."}]` 형태로 돌려준 실행 오류가, 메시지에 `"not found"`가 없다는 이유만으로 오류 분기를 통과하지 못하고 그대로 "데이터 없음"으로 뒤바뀐다.
2. 책임 코드는 `src/tools/yard.ts:908-931`(단일 행 + `"not found"` 문자열 조건)과 `src/tools/yard.ts:934-947`(오류 행을 `!r["error"]`로 조용히 버리는 필터 → `buildNoDataResponse`)이며, `buildNoDataResponse`(`src/utils/response.ts:173-207`)는 `isError`를 절대 세우지 않는다.
3. 동일 실패 양식이 yard.ts 한 곳이 아니라 **최소 7곳**에 복제되어 있다(`yard.ts:414-431`, `yard.ts:819-831`, `mesh.ts:23-27`을 쓰는 두 도구, `log.ts` 전 경로, `format.ts:71-78`, `format-promql.ts:36-42`, `format-log.ts:44-46`). 특히 `whatap_log_search`는 오류 행 검사 자체가 없어 서버 오류 문구가 **완전히 소실**된다.
4. `src/tools/promql.ts:137-160`은 이미 **올바른 패턴**(배열 전체에서 오류 행 탐색 → 메시지 내용 무관 `isError: true`)을 구현하고 있다. 즉 수정은 새 설계가 아니라 이 패턴을 공용 헬퍼로 승격시켜 전 호출부에 적용하는 일이다.
5. MCP 프로토콜 측은 문제가 없다. `isError: true`는 `tools/call`의 `result` 안에 그대로 직렬화되어 클라이언트에 도달한다(`src/mcp/server.ts:107-117`, `src/mcp/protocol.ts:91-101`, `src/mcp/types.ts:71-74`). 즉 **고칠 지점은 전적으로 도구/유틸 계층**이다.

---

## 1. 책임 코드 (path:line)

모든 줄 번호는 현재 작업 트리(`git status` 기준 `src/tools/yard.ts`, `src/api/client.ts`, `src/mcp/*`는 미변경) 확인값이다.

### 1-A. 핵심 결함 — `whatap_query_data`의 MXQL path 실행 경로

**(1) 오류 행 검사가 "단일 행 + `not found` 문자열"로 이중 제한** — `src/tools/yard.ts:908-931`

```ts
        // Detect "not found" returned as a data row (server returns 200 with error in body)
        if (
          Array.isArray(result) &&
          result.length === 1 &&                       // :910  ← 1행일 때만
          typeof result[0] === "object" &&
          result[0] !== null &&
          "error" in result[0]
        ) {
          const errorMsg = String((result[0] as Record<string, unknown>).error);   // :915
          if (errorMsg.includes("not found")) {                                    // :916  ← 문자열 조건
            ...
            return { content: [...], isError: true };                              // :929
          }
        }
```

`errorMsg`가 `"not found"`를 포함하지 않으면 **아무 것도 하지 않고 아래로 흘러내린다**. 신고자가 지목한 `:916`은 정확하다(`result[0].error` 추출은 한 줄 위 `:915`).

**(2) 흘러내린 오류 행을 메타데이터 취급하여 폐기** — `src/tools/yard.ts:934-947`

```ts
        // Check for no data after filtering metadata rows
        const dataRows = Array.isArray(result)
          ? result.filter(
              (r: Record<string, unknown>) =>
                !r["_head_"] && !r["error"]     // :937  ← 오류 행이 여기서 사라진다
            )
          : [];
        if (dataRows.length === 0) {            // :940
          return buildNoDataResponse({          // :941
            toolName: "whatap_query_data",
            projectCode,
            timeRange,
            category: describeMql(path)?.entry.baseCategories[0],
          });
        }
```

신고자의 `:934`(필터), `:940`(`buildNoDataResponse` 호출 진입)은 정확하다. 실제 `buildNoDataResponse(` 호출 줄은 `:941`이다.

**(3) no-data 응답이 `isError`를 세우지 않음** — `src/utils/response.ts:173-207`

```ts
export function buildNoDataResponse(opts: {...}): McpResponse {
  const lines: string[] = ["**No data found.**", ""];          // :179
  lines.push("**Possible causes:**");                          // :182
  lines.push(
    "- Time range may be too narrow or no data was collected in this window.",  // :192
    "- No active agents sending data for this category."                        // :193
  );
  ...
  return { content: [{ type: "text" as const, text: lines.join("\n") }] };      // :207  ← isError 없음
}
```

타입 정의상으로도 `type McpResponse = { content: McpTextContent[]; isError?: true };`(`src/utils/response.ts:7`)이며 `buildNoDataResponse`는 이 필드를 세우는 코드가 없다. 신고자가 인용한 문구는 `:179`, `:192`, `:193`에서 그대로 생성된다.

### 1-B. 같은 실패 양식이 복제된 지점 (요청 1의 진짜 범위)

| # | 위치 | 증상 | `isError` |
|---|---|---|---|
| a | `src/tools/yard.ts:414-431` (`whatap_describe_query`, OpenMetrics 모드) | `!r["_head_"] && !r["error"]`로 오류 행 폐기 후 `**No data found for metric "..."**` 출력. 오류 행 검사 자체가 없음 | 없음 (`:421-430`) |
| b | `src/tools/yard.ts:819-831` (`whatap_query_data`, PromQL 실행 모드) | 동일 필터(`:821`) → `buildNoDataResponse`(`:826`). PromQL 경로에는 `promql.ts`에 있는 오류 행 탐색이 **누락** | 없음 |
| c | `src/tools/mesh.ts:22-27` `cleanMxqlRows` → `whatap_apm_anomaly`(`:368-392`), `whatap_service_topology`(`:490-...`) | 4개 MXQL을 병렬 실행 후 오류 행을 전부 버리고 `totalRows === 0`이면 "No APM data found." / "No NPM topology data found." | 없음 (`:376-391`, `:492-...`) |
| d | `src/tools/log.ts:292-350` (`whatap_log_search`) | `executeMxqlText` 결과를 오류 행 검사 **없이** 그대로 포매터에 전달 | 없음 |
| e | `src/utils/format.ts:71-78` | `dataRows` 필터 후 `"No data found for the specified time range."` 문자열 반환 (문자열 반환이라 `isError`를 표현할 방법 자체가 없음) | 표현 불가 |
| f | `src/utils/format-promql.ts:36-42` | 동일 (`"No OpenMetrics data found..."`) | 표현 불가 |
| g | `src/utils/format-log.ts:44-46` | 동일 (`"No log lines matched the filter in this window."`) | 표현 불가 |

`d`는 가장 나쁜 경우다. 오류 행이 `format.ts:72` / `format-log.ts:45`에서 걸러지고, 포매터는 **문자열**을 돌려주므로 도구 콜백은 오류였다는 사실 자체를 알 수 없다. 결과적으로 "No data found for the specified time range." 한 줄만 남고 서버 메시지는 로그에도 남지 않는다.

### 1-C. 이미 올바른 참고 구현 — `src/tools/promql.ts:137-160`

```ts
        if (Array.isArray(result)) {
          const errorRow = result.find(
            (r) => r && typeof r === "object" && "error" in r     // :138-140  ← 배열 전체, 위치 무관
          );
          if (errorRow) {
            const errMsg = String((errorRow as Record<string, unknown>).error);   // :142-144
            return {
              content: [{ type: "text" as const, text: `**Query validation failed**: ${errMsg}\n\n...` }],
              isError: true,                                       // :158  ← 메시지 내용 무관
            };
          }
        }
```

수정 설계의 근거는 이것이다. 프로젝트 안에 이미 정답이 있고, 나머지 호출부가 따라오지 못한 상태다.

### 1-D. API 클라이언트 — 오류가 도구 계층까지 살아남는가

`src/api/client.ts`:

```ts
    const data = await res.json();
    // Response is a flat array of row objects
    if (Array.isArray(data)) return data;                        // :189 (text) / :219 (path)
    // Detect error objects returned as non-array JSON
    if (data && typeof data === "object") {
      const errMsg = data.error || data.message || data.msg;     // :192 / :221
      if (errMsg) {
        throw new Error(`MXQL query error for project ${pcode}: ${errMsg}`);   // :194-196 / :223-225
      }
    }
    return [];                                                    // :199 / :228
```

정리하면 클라이언트가 오류를 살려 보내는 경우와 죽이는 경우가 갈린다.

- **HTTP 비-2xx**: `fetchProject`(`src/api/client.ts:365-370`) / `fetchAccount`(`:339-344`)가 `WhaTap API error (<status>) for project <pcode>: <body>` 로 `throw`한다 → 도구의 `catch`에 잡혀 `classifyAndBuildError` → `isError: true`. **정상 동작.**
- **본문이 JSON이 아님**: `res.json()`이 `SyntaxError`를 던진다 → 역시 `catch`로 간다. **정상 동작.** (단 `classifyAndBuildError`의 기본 분기(`response.ts:103-110`)로 떨어져 "whatap_query_data failed: Unexpected token ..." 같은 저품질 메시지가 된다.)
- **비배열 JSON 객체 + `error`/`message`/`msg` 필드**: `:194` / `:223`에서 `throw`. **정상 동작.**
- **비배열 JSON 객체인데 오류 필드 이름이 다름**(`err`, `errorMessage`, `reason`, 또는 `{"status":"fail"}` 류): `:199` / `:228`에서 **빈 배열로 뭉개진다**. → `yard.ts:899-905`의 `result.length === 0` 조기 반환 → `buildNoDataResponse`. 오류가 여기서 완전히 소실된다.
- **배열 + 오류 행**(`[{"error":"A JSONObject text must begin with '{' ..."}]`): `:189` / `:219`에서 **그대로 통과**한다. 즉 오류는 도구 계층까지 살아 있고, 이후 처리 실패는 전적으로 `yard.ts`의 몫이다. **이번 티켓의 실제 경로.**

> 신고자가 보고한 오류 문구 `A JSONObject text must begin with '{' at 1 [character 2 line 1]`은 Java `org.json`의 파서 메시지로, 서버가 요청을 200으로 받아들인 뒤 MXQL 본문을 파싱하다 실패해 응답 본문에 담아 돌려준 것으로 보인다. 우리 쪽 `res.json()`이 던진 예외가 아니다(브라우저/undici의 메시지 형태와 다르다).

### 1-E. 파생 결함 — `probeCategory`의 무조건 삼킴

`src/api/client.ts:257-267`

```ts
    try {
      const result = await this.executeMxqlText(pcode, {...});
      return Array.isArray(result) && result.length > 0;
    } catch {
      return false;                                    // :266
    }
```

`whatap_data_availability`(`src/tools/yard.ts:170`)가 이 결과를 "데이터 없음"으로 표시한다. 인증 실패·타임아웃·서버 오류가 모두 `hasData=false`로 동일하게 렌더링되므로, 사용자가 "데이터가 없다"는 잘못된 진단을 **두 번** 받게 되는 구조다(질의에서 한 번, 가용성 목록에서 또 한 번). 요청 1의 직접 범위는 아니나 같은 병증이다.

### 1-F. 원인 맥락 (요청 1 범위 밖)

실패 질의의 raw MXQL은 카탈로그에 템플릿 마커가 남은 채 저장되어 있다 — `src/data/mxql-catalog.ts:24051`:

```
"src/main/resources/mxql/apm/stat/transaction_diff": "CATEGORY db3_stat_tx\n<% AGENT %>\nFLEXLOAD\n<% FILTER %>\nGROUP { ... }"
```

`describeMql`(`src/yard/catalog.ts:114-136`)은 이 문자열을 그대로 `raw`로 돌려주고, `yard.ts:878-886`이 치환 없이 서버로 전송한다. 저장소 전체에 `<%` 마커를 처리하는 코드는 존재하지 않는다(`grep -rn '<%' src/yard/*.ts src/tools/yard.ts` → 0건). **요청 1은 이 마커를 고치는 것이 아니라, 마커든 다른 원인이든 서버가 오류라고 말했으면 오류로 전달하는 것이다.**

---

## 2. 실패 케이스 제어 흐름 추적

입력: `whatap_query_data(projectCode=<P>, path="src/main/resources/mxql/apm/stat/transaction_diff", timeRange="6h")`

| 단계 | 위치 | 동작 |
|---|---|---|
| 1 | `yard.ts:783` | 콜백 진입. `savedQuery` 없음(`:785`), `query` 없음이므로 PromQL 분기(`:809`) 건너뜀 |
| 2 | `yard.ts:858` | `path` 존재 → 오류 반환 안 함 |
| 3 | `yard.ts:871` | `parseTimeRange("6h")` → `{stime, etime}` |
| 4 | `yard.ts:874-875` | `describeMql(path)` → 카탈로그 적중, `raw`에 `<% AGENT %>` 포함 문자열 |
| 5 | `yard.ts:878-886` | `rawMxql` truthy → **text 엔드포인트** `client.executeMxqlText(...)` 호출 (path 엔드포인트로 가지 않음) |
| 6 | `client.ts:177-187` | `POST /open-mcp/api/flush/mxql/text`. 서버는 **HTTP 200** 응답 → `fetchProject:365`의 `!res.ok` 통과 |
| 7 | `client.ts:187-189` | `res.json()` → `[{ "error": "A JSONObject text must begin with '{' at 1 [character 2 line 1]" }]`. 배열이므로 `:189`에서 **그대로 반환** |
| 8 | `yard.ts:899` | `result.length === 0`? → **아니오**(길이 1). 통과 |
| 9 | `yard.ts:908-914` | 단일 행이고 `"error" in result[0]` → 조건 **성립**, 블록 진입 |
| 10 | `yard.ts:915-916` | `errorMsg = "A JSONObject text must begin with '{' ..."`. `errorMsg.includes("not found")` → **false** → **아무 것도 반환하지 않고 블록 탈출** ← **결함 지점 1** |
| 11 | `yard.ts:934-939` | `result.filter(r => !r["_head_"] && !r["error"])` → 유일한 행이 `error`를 가지므로 제거. `dataRows.length === 0` ← **결함 지점 2** |
| 12 | `yard.ts:940-947` | `buildNoDataResponse({...})` 호출 |
| 13 | `response.ts:179-207` | `**No data found.** / Possible causes: Time range may be too narrow... / No active agents...` 생성, `isError` **미설정** ← **결함 지점 3** |
| 14 | `server.ts:109` | 콜백이 정상 반환했으므로 예외 래핑 없음. 결과 객체가 그대로 `tools/call` 결과가 됨 |
| 15 | `protocol.ts:92-97` | `{jsonrpc, id, result}`로 직렬화되어 클라이언트로 전송. LLM은 "데이터가 없다"로 읽는다 |

**서버가 준 진단 문자열은 10단계에서 마지막으로 존재했고 11단계에서 소멸한다.** 사용자에게 전달된 세 가지 원인(시간 범위, 데이터 미수집, 활성 에이전트 없음)은 모두 코드가 상수로 만들어낸 추측이며 응답과 무관하다.

`length === 1` 제약 때문에 생기는 **추가 사각지대**: 서버가 `[{"_head_": ...}, {"error": ...}]`처럼 헤더 행과 함께 오류를 돌려주면 `:910`에서 이미 조건이 깨져, `"not found"`인 경우조차 오류로 처리되지 않는다. 현재는 fuzzy 경로 제안 기능(`:917-928`)까지 함께 죽는다.

---

## 3. 프로토콜 측 검증 — `isError`는 제대로 도달하는가

- 타입: `src/mcp/types.ts:71-74` `McpToolResult { content: McpTextContent[]; isError?: boolean }`.
- 도구 실행: `src/mcp/server.ts:107-117` — 콜백이 던진 예외만 `isError: true`로 감싸고(`:112-115`), 콜백이 반환한 객체는 **손대지 않고 그대로 반환**(`:109`).
- 전송: `src/mcp/protocol.ts:91-97` — 핸들러 반환값을 `result`에 그대로 실어 보낸다. 필드 필터링이나 스키마 검증 없음.

결론: `isError: true`를 붙이면 클라이언트에 그대로 전달된다. MCP 사양상으로도 **도구 실행 오류는 JSON-RPC error가 아니라 결과 안의 `isError`로 보고**하는 것이 맞으므로 현재 아키텍처가 옳고, 유일한 문제는 도구 계층이 그 플래그를 세우지 않는 것이다. `src/utils/response.ts:7`의 `isError?: true` 리터럴 타입도 호환된다.

---

## 4. 제안 (fix design)

### 4-0. 설계 원칙

1. **판정 기준을 메시지 내용이 아니라 응답 구조로 바꾼다.** `"not found"` 문자열 매칭은 fuzzy 경로 제안이라는 *부가 기능*의 트리거로만 남기고, 오류 여부 판정에서 분리한다.
2. **공용 헬퍼로 승격**한다. `yard.ts` raw 분기만 고치면 §1-B의 7개 지점이 그대로 남는다.
3. **"데이터 없음"과 "질의 실패"를 서로 다른 응답 유형으로 유지**한다. 빈 배열은 여전히 `buildNoDataResponse`(요청 1의 대상이 아님), 오류 행은 새 `buildServerErrorResponse`.

### 4-1. 공용 헬퍼 추가 — `src/utils/response.ts` (파일 끝, `buildNoDataResponse` 뒤)

**After (신규):**

```ts
// ---------- Server-reported Error Rows ----------

// Field names WhaTap/Yard responses have been observed to use for in-body errors.
const ERROR_ROW_KEYS = ["error", "err", "errorMessage", "error_message", "msg"] as const;

/**
 * Extract a server-supplied error message from an MXQL/PromQL response.
 * The server can return HTTP 200 with an error row inside the array, at any
 * position and alongside other rows. Returns null when no error row is present.
 */
export function extractServerError(result: unknown): string | null {
  if (!Array.isArray(result)) return null;
  for (const row of result) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    for (const key of ERROR_ROW_KEYS) {
      if (!(key in r)) continue;
      const v = r[key];
      if (v == null || v === "" || v === false) continue;
      return typeof v === "string" ? v : JSON.stringify(v);
    }
  }
  return null;
}

/**
 * Build an isError response that shows the server's own message verbatim.
 * Never inspects the message content — any error row is an error.
 */
export function buildServerErrorResponse(opts: {
  toolName: string;
  serverMessage: string;
  projectCode?: number;
  path?: string;
  timeRange?: string;
}): McpResponse {
  const lines: string[] = [
    `**Query failed on the WhaTap server.**`,
    "",
    `**Server message**: ${opts.serverMessage}`,
    "",
    "This is a query execution failure, **not** an absence of data. " +
      "Do not conclude that the project has no data for this time range.",
  ];
  const ctx: string[] = [];
  if (opts.path) ctx.push(`- **Path**: \`${opts.path}\``);
  if (opts.projectCode != null) ctx.push(`- **Project**: ${opts.projectCode}`);
  if (opts.timeRange) ctx.push(`- **Time range**: ${opts.timeRange}`);
  if (ctx.length > 0) lines.push("", "**Context:**", ...ctx);
  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
    isError: true,
  };
}
```

`ERROR_ROW_KEYS`가 `"msg"`를 포함하는 점은 의도적이다 — `client.ts:192`/`:221`이 비배열 응답에서 이미 `error || message || msg`를 오류로 취급하므로 기준을 맞춘다. 다만 `"message"`는 정상 데이터 컬럼명으로 쓰일 수 있어 **배열 행 판정에서는 제외**했다(로그 계열 응답의 오탐 방지). 이 선택은 §6의 미확인 항목이다.

### 4-2. `whatap_query_data` MXQL path 경로 교체 — `src/tools/yard.ts:899-947`

**Before (현행):**

```ts
        if (Array.isArray(result) && result.length === 0) {
          return buildNoDataResponse({ toolName: "whatap_query_data", projectCode, timeRange });
        }

        // Detect "not found" returned as a data row (server returns 200 with error in body)
        if (
          Array.isArray(result) &&
          result.length === 1 &&
          typeof result[0] === "object" &&
          result[0] !== null &&
          "error" in result[0]
        ) {
          const errorMsg = String((result[0] as Record<string, unknown>).error);
          if (errorMsg.includes("not found")) {
            const suggestions = fuzzyMatch(path, 5);
            ...
            return { content: [...], isError: true };
          }
        }

        const dataRows = Array.isArray(result)
          ? result.filter((r) => !r["_head_"] && !r["error"])
          : [];
        if (dataRows.length === 0) {
          return buildNoDataResponse({ ... });
        }
```

**After:**

```ts
        if (Array.isArray(result) && result.length === 0) {
          return buildNoDataResponse({ toolName: "whatap_query_data", projectCode, timeRange });
        }

        // Server returned HTTP 200 with an error row in the body.
        // Any error row is an error — the message content is NOT a gate.
        const serverError = extractServerError(result);
        if (serverError !== null) {
          // "not found" additionally gets fuzzy path suggestions (nice-to-have,
          // layered on top of the error — it no longer gates whether we report one).
          if (serverError.includes("not found")) {
            const suggestions = fuzzyMatch(path, 5);
            const lines = [`**Error**: MXQL path "${path}" not found on the server.`];
            if (suggestions.length > 0) {
              lines.push("", "**Did you mean:**");
              for (const s of suggestions) {
                const desc = s.description
                  ? ` — ${translateDescription(s.path, s.description)}`
                  : "";
                lines.push(`- \`${s.path}\`${desc}`);
              }
            }
            lines.push("", `**Server message**: ${serverError}`);
            lines.push("", `Use \`whatap_data_availability(projectCode=${projectCode})\` to see available paths.`);
            return { content: [{ type: "text" as const, text: lines.join("\n") }], isError: true };
          }
          return buildServerErrorResponse({
            toolName: "whatap_query_data",
            serverMessage: serverError,
            projectCode,
            path,
            timeRange,
          });
        }

        const dataRows = Array.isArray(result)
          ? result.filter((r) => !r["_head_"] && !r["error"])
          : [];
        if (dataRows.length === 0) {
          return buildNoDataResponse({ ... });   // 이제 진짜 "데이터 없음"만 도달한다
        }
```

핵심 변화 세 가지: (a) `result.length === 1` 제약 제거 → 다중 행/헤더 동반 응답에서도 동작, (b) `"not found"`가 **오류 보고의 게이트가 아니라 표현 방식의 분기**로 강등, (c) `not found` 경로도 서버 원문을 함께 노출.

### 4-3. 동일 패치를 적용할 나머지 호출부

| 위치 | 삽입 지점 | 비고 |
|---|---|---|
| `src/tools/yard.ts:819` 직전 (PromQL 실행 모드) | `extractServerError(result)` → `buildServerErrorResponse` | `promql.ts:137-160`과 동작 일치시킴 |
| `src/tools/yard.ts:414` 직전 (`describe_query` OpenMetrics) | 동일 | 현재 오류 검사 전무 |
| `src/tools/log.ts:299` 직전 (포매터 호출 전) | 동일 | **최우선**. 현재 오류가 완전 소실 |
| `src/tools/mesh.ts:368` / `:490` 직전 | 4개 응답 각각에 대해 검사, 하나라도 오류면 어느 질의가 실패했는지 명시 | 부분 실패 표기 필요 |
| `src/tools/promql.ts:137-160` | `extractServerError`로 치환(동작 동일, 중복 제거) | 리팩터링 성격 |

포매터 3곳(`format.ts:71-78`, `format-promql.ts:36-42`, `format-log.ts:44-46`)은 **문자열을 반환하는 함수라 `isError`를 표현할 수 없다**. 시그니처를 바꾸는 대신 **호출부에서 포매터 진입 전에 차단**하는 위 방식이 옳다. 포매터의 기존 필터는 방어선으로 남긴다.

### 4-4. 최소 수정 vs 올바른 수정

- **최소 수정 (1줄급)**: `yard.ts:916`의 `if (errorMsg.includes("not found"))`를 제거하고 무조건 `isError` 반환. 티켓의 재현 케이스는 해결되지만 `length === 1` 제약과 §1-B의 7개 지점이 남는다. **핫픽스로만 권장.**
- **올바른 수정**: §4-1 + §4-2 + §4-3. 판정 기준을 구조로 옮기고 전 호출부에 동일 적용. 권장안.
- **선택 사항(별도 티켓 권장)**: `client.ts:199`/`:228`의 `return []`을 오류 보존으로 바꾸기, `probeCategory`의 `catch { return false }`(`client.ts:265-267`)를 3-상태(`hasData` / `noData` / `probeFailed`)로 승격하기. 요청 1의 정신에는 부합하나 `whatap_data_availability`의 출력 포맷 변경을 수반하므로 분리한다.

### 4-5. 호환성 리스크

1. **응답 텍스트 변경.** 지금까지 "No data found."를 받던 케이스 일부가 "Query failed on the WhaTap server."로 바뀐다. 문자열을 매칭하는 소비자가 있다면 영향을 받는다(현재 저장소 내 테스트에는 그런 매칭이 없다).
2. **`isError: true`에 대한 클라이언트 반응.** 일부 MCP 클라이언트는 `isError` 결과를 재시도하거나 사용자에게 붉게 표시한다. 서버 파싱 오류는 재시도해도 동일 실패이므로, 본문에 "Do not retry with the same parameters." 취지의 문구를 넣거나 `buildErrorResponse`의 `retryable: false` 표현(`response.ts:33-37`)을 재사용하는 편이 안전하다.
3. **오탐 위험 — 정상 데이터에 `error`라는 컬럼이 있는 경우.** 이것이 이 수정의 유일한 실질적 위험이다. 다만 현재 코드도 이미 `!r["error"]`로 그런 행을 데이터에서 **제외**하고 있어(`yard.ts:937`, `format.ts:72`, `mesh.ts:25`, `format-promql.ts:37`, `format-log.ts:45`) 그런 컬럼은 이미 표시되지 않는다. 즉 이번 변경은 "조용히 버리던 것"을 "시끄럽게 보고하는 것"으로 바꿀 뿐 새 데이터 손실을 만들지 않는다. 그럼에도 `ERROR_ROW_KEYS`를 넓히는 것(특히 `"message"` 추가)은 오탐을 키우므로 권장하지 않는다.
4. **`_head_` 동반 응답의 동작 변화.** 지금까지 `length !== 1`이라 조용히 통과하던 오류 응답이 이제 오류로 잡힌다. 의도된 개선이지만 "이전에는 그럭저럭 결과가 나오던 질의"가 오류로 바뀌어 보일 수 있다(실제로는 데이터가 0행이던 케이스).

---

## 5. 테스트 계획

### 5-1. 현존 테스트 현황

- `tests/response.test.ts` — `classifyAndBuildError` 4건 + `appendNextSteps` 2건. **`buildNoDataResponse`에 대한 테스트는 전무.**
- `tests/tool-registration.test.ts` — 도구 11개 등록 여부만 확인(`:17`, `:19-31`). 응답 내용은 검증하지 않음.
- `tests/log.test.ts:120-132` — `setupTool()`이 `executeMxqlText`를 가짜로 주입하고 `(server as any)._tools.get(name).callback`을 직접 호출하는 패턴. **이번 수정의 테스트 하니스로 그대로 재사용 가능**하며, `registerYardTools`도 `src/tools/yard.ts:125`에서 export되어 있어 동일 방식이 가능하다.
- 회귀 위험이 있는 기존 테스트: `tests/format.test.ts:9-11`(빈 배열 → "No data"). 이번 수정은 포매터를 건드리지 않으므로 **영향 없음**.

### 5-2. 추가할 테스트

**A. `tests/response.test.ts` — 유닛**

1. `extractServerError([{ error: "A JSONObject text must begin with '{' at 1" }])` → 해당 문자열 반환
2. `extractServerError([{ _head_: true }, { error: "boom" }])` → `"boom"` (다중 행 + 헤더 동반)
3. `extractServerError([{ time: 1, value: 2 }])` → `null`
4. `extractServerError([])` / `extractServerError(null)` → `null`
5. `extractServerError([{ error: "" }])` → `null` (빈 문자열은 오류 아님)
6. `buildServerErrorResponse({...})` → `isError === true`이고 `content[0].text`가 서버 원문을 포함하며 `"No data found"`를 **포함하지 않음**
7. `buildNoDataResponse({...})` → `isError`가 `undefined` (의도된 구분의 회귀 방지)

**B. `tests/yard.test.ts` (신규) — 콜백 통합**

`log.test.ts:120-132` 패턴으로 `executeMxqlText`를 주입해 `whatap_query_data` 콜백을 직접 호출한다.

8. **티켓 재현 케이스**: `executeMxqlText`가 `[{ error: "A JSONObject text must begin with '{' at 1 [character 2 line 1]" }]`를 반환 → `res.isError === true`, `res.content[0].text`가 `"JSONObject"`를 포함, `"No data found"`를 **포함하지 않음**. (수정 전에는 이 테스트가 실패해야 한다 — 반드시 먼저 red를 확인할 것)
9. `[{ error: "MXQL path not found: xxx" }]` → `isError === true`이고 `"Did you mean"`(fuzzy 제안)을 포함 → 기존 기능 회귀 방지
10. `[{ _head_: true, time: "T" }, { error: "boom" }]` → `isError === true` (`length === 1` 제약 제거 검증)
11. `[]` → `isError`가 `undefined`이고 `"No data found"` 포함 → **"데이터 없음"은 오류가 아니다**는 구분 유지
12. `[{ time: 1, oid: 5, value: 3 }]` → 정상 포맷 경로, `isError` 미설정
13. `executeMxqlText`가 `throw new Error("WhaTap API error (500) ...")` → `isError === true` (기존 `catch` 경로 회귀 방지)

**C. `tests/log.test.ts` 확장**

14. `setupTool({ result: [{ error: "boom" }] })` → `whatap_log_search`가 `isError === true` 및 `"boom"` 포함 (현재는 조용히 "No log lines matched..."를 반환하므로 명확한 red)

**D. `tests/acceptance/`**

`tests/acceptance/prompts.json`에 `apm/stat/transaction_diff` 6h 케이스를 추가해, 실 토큰 환경에서 응답이 `isError`이고 서버 원문을 담는지 확인한다. (토큰 없이는 실행 불가 — §6 참조)

---

## 6. 미확인 / 가정

API 토큰이 없어 라이브 호출을 하지 않았다. 아래는 **코드에서 확정한 것이 아니라 추론한 부분**이다.

1. **오류 응답의 정확한 와이어 형태.** 신고자가 받은 응답이 `[{"error": "..."}]`(배열 안 오류 행)라는 것은 **역추론**이다. 근거: (a) 비배열 오류 객체였다면 `client.ts:194`/`:223`이 `throw`해서 이미 `isError`로 보고되었을 것이고, (b) HTTP 비-2xx였다면 `fetchProject:365-370`이 `throw`했을 것이며, (c) 비-JSON 본문이었다면 `res.json()`이 던졌을 것이다. 세 경우 모두 신고된 증상("No data found"로 표시)이 나올 수 없다. 남는 유일한 경로가 배열 안 오류 행이다. **실제 본문 캡처로 확인 권장.**
2. **오류 행의 필드명이 `error`인지.** `yard.ts:913`의 기존 코드가 `"error" in result[0]`을 검사하고 있고 신고자가 `result[0].error`를 지목했으므로 `error`로 가정했다. `err`/`errorMessage` 등 다른 이름을 쓰는 응답이 있는지는 미확인 — §4-1의 `ERROR_ROW_KEYS`는 방어적 확장이며 실측 근거가 있는 것은 `error`뿐이다.
3. **`_head_`와 오류 행이 동시에 오는지.** `length === 1` 제약이 실제로 사각지대를 만드는지는 서버 동작에 달렸다. 코드상 결함인 것은 확실하나 실제 발생 빈도는 미확인.
4. **75건의 빈 배열이 진짜 "데이터 없음"인지.** 서버가 오류를 빈 배열로 삼키고 있을 가능성(예: 비배열 오류 객체 + 인식 못한 필드명 → `client.ts:199`/`:228`)을 배제하지 못했다. 요청 1의 범위 밖이지만, 이 가정이 틀리면 오진단 규모가 더 커진다.
5. **`message`/`msg` 컬럼의 오탐 가능성.** 로그 계열 응답에 `msg`가 정상 데이터 컬럼으로 존재하는지 확인하지 못했다. 존재한다면 §4-1의 `ERROR_ROW_KEYS`에서 `"msg"`를 빼야 한다. **머지 전 실 응답으로 확인 필요.**
6. **클라이언트별 `isError` 처리.** Claude Desktop / Gemini CLI 등이 `isError: true` 결과를 재시도하는지, 사용자에게 어떻게 표시하는지는 미검증. §4-5의 2번 리스크가 실제로 문제되는지는 실사용 확인이 필요하다.
7. **`dist/index.js` 재빌드.** 작업 트리에 `dist/index.js`의 미커밋 변경이 있다. 소스 수정 후 dist 재생성이 필요하며, 이번 분석에서는 `dist`를 검토 대상에서 제외하고 `src`만 근거로 삼았다.
