# "No data found" 진단 가능성 개선 — 설계

- 날짜: 2026-09-10
- 대상: `whatap-open-mcp` 1.2.1 (main HEAD `c6e1f8a`)
- 티켓: [MCP] "No data found"이 쿼리 미실행인지 데이터 부재인지 구분되게 해 주십시오 (요청 1·2·3)
- 선행 분석: [00-overview](../analysis/2026-09-10-mcp-nodata-00-overview.md) · [req1](../analysis/2026-09-10-mcp-nodata-req1-error-passthrough.md) · [req2](../analysis/2026-09-10-mcp-nodata-req2-marker-paths.md) · [req3](../analysis/2026-09-10-mcp-nodata-req3-empty-result-mxql-echo.md)
- 상태: 설계 확정 대기 (구현 미착수)

---

## 1. 문제

MCP 도구가 데이터가 존재하는 프로젝트에 대해 다음을 반환한다.

```
**No data found.**

**Possible causes:**
- Time range may be too narrow or no data was collected in this window.
- No active agents sending data for this category.
```

제시된 원인 3개는 모두 사실이 아니었다. 실제로는 카탈로그에 실려 있던 **미치환 템플릿**이 서버로 전송됐고, 서버는 `A JSONObject text must begin with '{'` 라는 **파싱 오류**를 돌려줬으며, 그 메시지를 코드가 삭제한 뒤 **하드코딩된 추측**으로 대체했다.

MCP는 LLM이 호출한다. 이 응답은 사람 검토 없이 "미실측", "수집 안 됨" 같은 결론의 근거가 되어 분석과 보고서로 넘어간다. **틀린 답보다 틀린 근거가 더 비싸다** — 이것이 이 설계가 해결하려는 피해다.

### 1.1 왜 세 요청이 모두 필요한가

한 응답 안에 독립적인 세 결함이 겹쳐 있고, 각각이 서로 다른 응답 집합을 담당한다.

| 층 | 결함 | 위치 | 담당 요청 | 커버 범위 |
|---|---|---|---|---|
| 실행 전 | 미치환 마커 원문을 그대로 전송 | `src/tools/yard.ts:873-886` | 요청 2 | 마커 경로 100개 전부 |
| 실행 후 | 서버 오류 행을 삭제 | `src/tools/yard.ts:915-916`, `:937` | 요청 1 | 오류 응답 22건 |
| 응답 생성 | 빈자리를 추측으로 채움 | `src/utils/response.ts:191-194` | 요청 3 | 정상 실행 · 0행 (빈 배열 75건 포함) |

요청 1·2만 반영하면 `response.ts:191-194`의 단정문은 손대지 않으므로 **신고된 그 문구가 그대로 남는다**. 요청 3만 반영하면 오류가 여전히 "빈 결과"로 위장된다. 셋은 대체 관계가 아니다.

---

## 2. 설계 목표

1. **응답 하나가 자기 상태를 스스로 증명한다.** 실행됐는지, 실행돼서 비었는지, 실행 중 실패했는지, 아예 전송되지 않았는지가 응답 텍스트만으로 구분되어야 한다.
2. **모르는 것을 아는 것처럼 말하지 않는다.** 원인 단정을 제거하고 "확인된 사실 / 확인되지 않은 것"을 나눈다.
3. **판정 기준을 메시지 내용이 아니라 응답 구조로 옮긴다.** `"not found"` 문자열 매칭 같은 내용 기반 게이트를 오류 판정에서 분리한다.
4. **LLM이 다음 행동을 고를 수 있게 한다.** 실패 응답은 재시도 가부와 실행 가능한 대안을 반드시 포함한다.

### 2.1 비목표 (명시적으로 하지 않는 것)

- **PLAT-854를 MCP에서 대체하지 않는다.** MCP 안에서 빈 배열을 오류로 간주하는 것은 정상적인 0행과 구분 불가능하다. 서버가 문법 오류에 오류를 반환하게 되면 그 응답은 상태 B로 자동 흡수된다.
- **`<% %>` 치환을 MCP에 복제하지 않는다.** 치환 규칙을 재구현하면 틀린 데이터로 조용히 답하게 되며, yard와의 이중 유지보수 부채가 된다. 마커 경로는 실행하지 않고 차단한다.
- **`client.ts`의 반환 타입을 바꾸지 않는다.** 에코에 필요한 값은 호출부에서 요청 객체를 지역 변수로 끌어올리면 전부 확보된다.

---

## 3. 응답 계약 — 4-상태

이 설계의 중심이다. 모든 데이터 조회 도구는 아래 네 상태 중 하나로 응답한다.

| 상태 | 판정 조건 | 현재 | 목표 | `isError` |
|---|---|---|---|---|
| **A. executed-ok-empty** | 2xx, 배열, 오류 행 없음, 데이터 행 0 | `No data found.` + 원인 3종 단정 | `No rows returned.` + 실행 에코 + 아는 것/모르는 것 구분 | 없음 |
| **B. executed-error** | 2xx이나 본문에 오류 행 | `"not found"`만 처리, 나머지는 A로 위장 | 서버 원문 그대로 + 실행 에코 | `true` |
| **C. not-executed-invalid** | 원문에 `<% … %>` 잔존 — **전송 전** 판정 | 그대로 전송 → A로 보고 | 전송 안 함. 마커 열거 + 실행 가능한 대체 경로 | `true` |
| **D. transport failure** | non-2xx, timeout, 토큰 없음 | `classifyAndBuildError` (적절) | 유지 + 시도한 요청 에코 첨부 | `true` |

**A와 C는 LLM에게 정반대의 결론을 지시해야 한다.** A는 "이 창에서는 행이 없었다"이고, C는 "이 질문에 대해 아무것도 측정하지 않았다". 지금은 둘 다 같은 문장으로 나가며, 그 문장이 A를 C처럼 읽히게 만든다.

---

## 4. 변경 대상

### 신규 (2)

| 파일 | 역할 |
|---|---|
| `src/yard/markers.ts` | `scanMarkers()` — 원문의 미치환 `<% NAME %>` 탐지 (상태 C) |
| `tests/markers.test.ts` | 마커 스캐너 단위 테스트 |

### 수정 (핵심)

| 파일 | 라인 | 변경 |
|---|---|---|
| `src/utils/response.ts` | `:173-208` | `buildNoDataResponse` 재작성 + `QueryEcho` 도입 (상태 A) |
| `src/utils/response.ts` | 파일 끝 | `extractServerError()` / `buildServerErrorResponse()` 신설 (상태 B) |
| `src/tools/yard.ts` | `:873-886` | 실행 전 마커 가드 (상태 C) |
| `src/tools/yard.ts` | `:899-947` | 오류 판정 교체 + 에코 배선 |
| `src/tools/yard.ts` | `:819-831` | PromQL 분기 동일 적용 |
| `src/tools/yard.ts` | `:669-698` | `describe_query` 마커 경고 + 예시 억제 |
| `src/tools/log.ts` | `:292-300` | 오류 행 검사 신설 (**현재 전무 — 최우선**) |
| `src/tools/mesh.ts` | `:349-366` | `Promise.all` → `allSettled` + 부분 실패 표기 |
| `src/tools/promql.ts` | `:137-160` | 공용 헬퍼로 치환 (동작 동일, 중복 제거) |

### 수정 (예방, 별도 PR)

| 파일 | 라인 | 변경 |
|---|---|---|
| `src/yard/types.ts` | `CatalogEntry` | `hasUnresolvedMarkers` / `unresolvedMarkers` 필드 |
| `scripts/generate-catalog.ts` | `:43-47`, `:63-84` | `target/classes/` 제외 + 마커 플래그 채움 |
| `src/yard/catalog.ts` | `:85`, `:138`, `:71` | 탐색 표면에서 실행 불가 경로 제외 |

---

## 5. 상세 설계

### 5.1 상태 C — `src/yard/markers.ts` (신규)

```ts
// src/yard/markers.ts
// Detects unsubstituted yard template markers (<% NAME %>) in raw MXQL.
// These are filled in by the yard service when serving a query BY PATH; they
// never reach the MXQL engine. Sending such raw text to /flush/mxql/text
// produces HTTP 200 + [] or a parser error (see PLAT-854), which the tool
// used to misreport as "No data found".

const MARKER_RE = /<%([\s\S]*?)%>/g;

export interface MarkerScan {
  hasMarkers: boolean;
  /** Marker names in first-seen order, whitespace-trimmed, de-duplicated. */
  markers: string[];
}

export function scanMarkers(raw: string): MarkerScan {
  const names = new Set<string>();
  for (const line of raw.split("\n")) {
    if (line.trim().startsWith("--")) continue; // comments are inert
    for (const m of line.matchAll(MARKER_RE)) {
      const name = m[1].trim();
      if (name) names.add(name);
    }
  }
  return { hasMarkers: names.size > 0, markers: [...names] };
}
```

설계 판단 두 가지:

- **이름을 정규화하지 않는다.** 카탈로그에 `<%OID%>`와 `<% AGENT %>`가 공존한다(공백·대소문자 혼재, 70개 토큰 형태 / 66개 이름). 사용자에게는 발견된 문자열을 그대로 보여준다.
- **주석 줄(`--`)은 무시한다.** 주석에만 마커가 있는 경로는 실측 결과 0건이지만, 스캐너가 오탐을 만들지 않도록 규칙에 넣는다.

`matchAll`은 `g` 플래그를 요구하고 `lastIndex` 상태를 남기지 않으므로 모듈 상수 재사용이 안전하다.

### 5.2 상태 B — `src/utils/response.ts` 헬퍼 (신규)

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
  echo?: QueryEcho;
}): McpResponse {
  const lines: string[] = [
    "**Query failed on the WhaTap server.**",
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
  if (opts.echo) lines.push("", ...renderEcho(opts.echo));
  lines.push("", "Do NOT retry with the same parameters.");
  return {
    content: [{ type: "text" as const, text: lines.join("\n") }],
    isError: true,
  };
}
```

`ERROR_ROW_KEYS`에 `"msg"`를 포함한 것은 `client.ts:191`/`:220`이 비배열 응답에서 이미 `error || message || msg`를 오류로 취급하는 것과 기준을 맞추기 위함이다. 반면 **`"message"`는 배열 행 판정에서 제외**했다 — 로그 계열 응답의 정상 컬럼명으로 쓰일 수 있어 오탐 위험이 크다. §9-1 참조.

### 5.3 상태 A — `buildNoDataResponse` 재작성

`QueryEcho`가 이 설계의 자료구조다. "무엇이 실행됐는가"를 응답 생성 시점까지 운반한다.

```ts
/** How a query reached the server, for echoing back on an empty result. */
export interface QueryEcho {
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
```

렌더링 규칙:

```ts
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
  const iso = (ms: number) => new Date(ms).toISOString().replace("T", " ").slice(0, 19);
  const kst = (ms: number) => new Date(ms + 9 * 3_600_000).toISOString().replace("T", " ").slice(0, 19);
  return `${stime} → ${etime}\n  UTC: ${iso(stime)} → ${iso(etime)}\n  KST: ${kst(stime)} → ${kst(etime)}`;
}
```

시간창을 epoch-ms와 UTC/KST로 함께 찍는 이유: 시간대 오해가 "데이터 없음"의 실제 원인인 경우를 LLM이 스스로 판별할 수 있어야 한다.

본문 구조는 세 블록으로 고정한다.

```ts
export function buildNoDataResponse(opts: {
  toolName: string;
  projectCode: number;
  timeRange?: string;
  category?: string;
  echo?: QueryEcho;          // ← 추가. 없으면 축약 응답(기존 호출부 무수정 동작)
}): McpResponse {
  const e = opts.echo;
  const lines: string[] = [
    "**No rows returned.**",
    e
      ? "The request reached the server and came back without an error and without rows."
      : "The request completed without rows. (Execution details were not captured for this call site.)",
    "",
  ];

  if (e) lines.push("**What was executed**", "", ...renderEcho(e), "");

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
        "It could not have matched anything. Treat this as **query not executed as intended**, not as absent data."
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
  lines.push(`- \`whatap_data_availability(projectCode=${opts.projectCode})\` — probes live categories.`);
  if (opts.timeRange) lines.push(`- Re-run with a wider timeRange (current: "${opts.timeRange}").`);
  lines.push(`- \`whatap_list_agents(projectCode=${opts.projectCode})\` — confirms agents are reporting.`);
  return { content: [{ type: "text" as const, text: lines.join("\n") }] };
}
```

세 가지가 의도적이다.

- `echo`는 **선택적**이다. 배선하지 않은 호출부는 컴파일이 깨지지 않고 축약 응답을 낸다. 단계적 적용이 가능하다.
- `CATEGORY_PLATFORMS` 힌트는 **삭제하지 않되 성격을 명시**한다. 원래 문구는 이것을 원인 후보로 제시했고, 신고자가 지적한 거짓 셋 중 하나가 여기서 나왔다. 카탈로그 관례라는 사실은 유용하므로 라벨만 바로잡는다.
- 마커 잔존 검사가 상태 A 안에도 **이중으로** 들어간다. 상태 C 가드가 우선 차단하지만, 가드를 우회한 경로(예: 카탈로그 밖 경로)가 생기면 마지막 방어선이 된다.

### 5.4 호출부 배선 — `whatap_query_data` MXQL 분기

**Before** (`src/tools/yard.ts:870-947`, 요약)

```ts
        const catalogInfo = describeMql(path);
        const rawMxql = catalogInfo?.raw;

        let result;
        if (rawMxql) {
          result = await client.executeMxqlText(projectCode, { stime, etime, mql: rawMxql, limit, param: params });
        } else {
          const mqlPath = path.startsWith("/") ? path : `/${path}`;
          result = await client.executeMxqlPath(projectCode, { stime, etime, mql: mqlPath, limit, param: params });
        }

        if (Array.isArray(result) && result.length === 0) {
          return buildNoDataResponse({ toolName: "whatap_query_data", projectCode, timeRange });
        }

        if (Array.isArray(result) && result.length === 1 && … && "error" in result[0]) {
          const errorMsg = String((result[0] as Record<string, unknown>).error);
          if (errorMsg.includes("not found")) { … return { …, isError: true }; }
        }

        const dataRows = Array.isArray(result) ? result.filter((r) => !r["_head_"] && !r["error"]) : [];
        if (dataRows.length === 0) {
          return buildNoDataResponse({ toolName: "whatap_query_data", projectCode, timeRange,
            category: describeMql(path)?.entry.baseCategories[0] });
        }
```

**After**

```ts
        const catalogInfo = describeMql(path);
        const rawMxql = catalogInfo?.raw;

        // ── State C: pre-execution guard ────────────────────────────────
        // A template that still carries yard markers cannot be executed as raw
        // text. Fail loudly BEFORE the first network call instead of reporting
        // "no data" afterwards.
        if (rawMxql) {
          const scan = scanMarkers(rawMxql);
          if (scan.hasMarkers) {
            return buildMarkerErrorResponse(path, scan, projectCode);
          }
        }

        // ── Hoist the request so the no-data path can echo it ────────────
        const usingText = Boolean(rawMxql);
        const mqlPath = path.startsWith("/") ? path : `/${path}`;
        const sentMql = usingText ? rawMxql! : mqlPath;
        const requestEcho: Omit<QueryEcho, "rawRowCount" | "dataRowCount"> = {
          endpoint: usingText ? "mxql/text" : "mxql/path",
          sentMql,
          serverExpanded: !usingText,
          catalogRawMxql: usingText ? undefined : catalogInfo?.raw || undefined,
          param: params,
          stime,
          etime,
          limit,
          pageKey: MXQL_PAGE_KEY,      // exported from src/api/client.ts
        };

        const result = usingText
          ? await client.executeMxqlText(projectCode, { stime, etime, mql: sentMql, limit, param: params })
          : await client.executeMxqlPath(projectCode, { stime, etime, mql: sentMql, limit, param: params });

        const rawRowCount = Array.isArray(result) ? result.length : 0;

        // ── State B: any error row is an error. Message content is NOT a gate.
        const serverError = extractServerError(result);
        if (serverError !== null) {
          // "not found" additionally gets fuzzy path suggestions — layered on
          // top of the error, no longer gating whether we report one.
          if (serverError.includes("not found")) {
            return buildPathNotFoundResponse(path, projectCode, serverError);
          }
          return buildServerErrorResponse({
            toolName: "whatap_query_data",
            serverMessage: serverError,
            projectCode,
            path,
            timeRange,
            echo: { ...requestEcho, rawRowCount, dataRowCount: 0 },
          });
        }

        // ── State A: genuinely empty ─────────────────────────────────────
        const dataRows = Array.isArray(result)
          ? result.filter((r: Record<string, unknown>) => !r["_head_"] && !r["error"])
          : [];
        if (dataRows.length === 0) {
          return buildNoDataResponse({
            toolName: "whatap_query_data",
            projectCode,
            timeRange,
            category: catalogInfo?.entry.baseCategories[0],
            echo: { ...requestEcho, rawRowCount, dataRowCount: 0 },
          });
        }
```

부수 개선 셋이 여기 포함된다.

- `result.length === 0` 조기 반환(현행 `:899-905`)이 사라진다. 빈 배열도 같은 상태 A 경로로 흘러 **에코를 받는다**. 현행 코드는 이 경우 `category`조차 넘기지 않았다.
- `describeMql(path)`가 두 번 호출되던 것(`:874`, `:945`)을 `catalogInfo` 재사용으로 정리한다.
- `pageKey` 상수는 `client.ts:176`/`:207`에 리터럴로 박혀 있다. `export const MXQL_PAGE_KEY = "mxql"` 로 승격해 한 곳에서 참조한다.

### 5.5 상태 C 응답 빌더

```ts
function buildMarkerErrorResponse(path: string, scan: MarkerScan, projectCode: number): McpResponse {
  // Suggest only paths that are actually executable.
  const alternatives = fuzzyMatch(path, 12)
    .filter((e) => e.path !== path && !scanMarkers(CATALOG_RAW[e.path] ?? "").hasMarkers)
    .slice(0, 5);

  const lines = [
    `**Error**: \`${path}\` is a yard **template**, not an executable query. It was NOT sent to the server.`,
    "",
    `**Unresolved markers** (${scan.markers.length}): ` + scan.markers.map((m) => `\`<%${m}%>\``).join(", "),
    "",
    "These markers are filled in by the WhaTap yard service, not by this MCP server, " +
      "and they cannot be supplied via `params`. Executing this path would return an " +
      "empty result that does **not** mean the project has no data.",
  ];

  if (alternatives.length > 0) {
    lines.push("", "**Use one of these executable paths instead:**");
    for (const a of alternatives) {
      const desc = a.description ? ` — ${translateDescription(a.path, a.description)}` : "";
      lines.push(`- \`${a.path}\`${desc}`);
    }
  }
  lines.push(
    "",
    `Or call \`whatap_data_availability(projectCode=${projectCode}, search="<keyword>")\` to list executable paths.`,
    "",
    "Do NOT retry this path with different params or a wider time range."
  );
  return { content: [{ type: "text" as const, text: lines.join("\n") }], isError: true };
}
```

**대체 경로 제시가 필수인 이유**: 마커 100개 중 97개가 `$param` 선언 자체가 없고, 나머지 3개도 `$stime`/`$etime`(`kind:"auto"`)뿐이다. caller가 채울 수 있는 마커는 0개다. "이 값을 주면 됩니다" 안내는 LLM이 값을 지어내 재시도하게 만들 뿐이다. 막다른 골목이 아니라 **다른 길**을 줘야 한다 — `mxql/` 트리 699개는 전부 정상이므로 대체재는 항상 존재한다.

### 5.6 나머지 호출부

| 위치 | 삽입 | 비고 |
|---|---|---|
| `src/tools/yard.ts:819` 직전 (PromQL 모드) | `extractServerError` + 에코(`endpoint: "openmx/text"`, `sentMql: \`OPENMX ${query}\``) | `client.ts:124`의 래퍼로 재구성 |
| `src/tools/yard.ts:414` 직전 (describe OpenMetrics) | `extractServerError` | 현재 오류 검사 전무 |
| `src/tools/log.ts:299` 직전 | `extractServerError` | **최우선**. 현재 오류가 완전 소실되고 `isError`도 없음 |
| `src/tools/mesh.ts:349-366` | `Promise.all` → `allSettled`, 서브쿼리별 상태 표기 | 현재 1개 실패 시 성공한 3개까지 버려짐 |
| `src/tools/promql.ts:137-160` | 공용 헬퍼로 치환 | 이미 올바른 패턴 — 중복 제거 성격 |

포매터 3곳(`format.ts:71-78`, `format-promql.ts:36-42`, `format-log.ts:44-46`)은 **문자열을 반환하므로 `isError`를 표현할 수 없다**. 시그니처를 바꾸지 않고 호출부에서 진입 전 차단한다. 포매터의 기존 필터는 방어선으로 남긴다.

### 5.7 탐색 표면 — 실행 불가 경로를 애초에 권하지 않기

`describe_query`가 지금 **실패가 보장된 호출을 예시로 출력한다**(`yard.ts:690-698`). `parser.ts:96-100`이 `$param`만 인식해 마커가 안 보이므로 `parameters: []`가 "인자 불필요"로 읽히기 때문이다.

```ts
        const scan = scanMarkers(metadata.raw);
        if (scan.hasMarkers) {
          lines.push(
            "> **NOT EXECUTABLE.** This path is a yard template with " +
              `${scan.markers.length} unresolved marker(s): ` +
              scan.markers.map((m) => `\`<%${m}%>\``).join(", ") + ". " +
              "`whatap_query_data` will reject it. The markers are filled in " +
              "server-side and cannot be passed via `params`.",
            ""
          );
        }
        …
        // Example call — only for executable paths
        if (!scan.hasMarkers) {
          lines.push("", "### Example", "", "```",
            `whatap_query_data(projectCode=<PCODE>, path="${path}", timeRange="5m")`, "```");
        }
```

그리고 `searchEntries()`(`catalog.ts:85`)에 실행 가능성 필터를 기본 적용한다 — 이것이 노출도를 가장 크게 줄인다. `search="transaction"`은 현재 18건을 돌려주는데 **100%가 마커 경로**다(useragent 100%, httpc 92%, inventory 80%).

```ts
export function searchEntries(opts: {
  domain?: string; search?: string; category?: string;
  /** Include template paths that cannot be executed as raw text. Default: false. */
  includeNonExecutable?: boolean;
}): CatalogEntry[] {
  …
  if (!opts.includeNonExecutable) {
    results = results.filter((e) => !e.hasUnresolvedMarkers);
  }
  return results;
}
```

`fuzzyMatch()`(`:138`)와 `getDomainSummary()`(`:71`)에도 동일 적용.

> **선행 조건**: 이 필터는 §5.8의 카탈로그 정리 뒤에 켜야 한다. 지금 켜면 `transaction` 검색이 18건에서 **0건**이 된다. `mxql/` 트리에 트랜잭션 통계 대체 경로가 있는지 확인이 선행되어야 한다(§10-3).

### 5.8 카탈로그 정리 (예방)

런타임 검사와 생성 시점 플래그는 **배타적 선택이 아니다**. 플래그는 *무엇을 보여줄지*(데이터), 런타임 스캔은 *무엇을 보낼지*(집행)를 결정한다. 전송되는 것은 `CATALOG_RAW[path]`이므로 마지막 방어선은 반드시 원문을 봐야 한다.

```ts
// src/yard/types.ts — CatalogEntry에 추가
  /** Raw MXQL still contains yard template markers (<% NAME %>) — not executable as text. */
  hasUnresolvedMarkers: boolean;
  /** Marker names found, for diagnostics. Empty when hasUnresolvedMarkers is false. */
  unresolvedMarkers: string[];
```

```ts
// scripts/generate-catalog.ts:43-47 — 빌드 산출물 제외
const EXCLUDED_DIR_RE = /(^|\/)target\/classes(\/|$)/;   // build output, duplicates src/main
    if (s.isDirectory()) {
      if (EXCLUDED_DIR_RE.test(fullPath.replace(/\\/g, "/"))) continue;
      await scanDir(fullPath, entries);
    }
```

`target/classes/` 116건은 `src/main/resources/` 116건의 완전한 복제다(접두사 정규화 후 대칭차 0). 제거하면 카탈로그가 **931 → 815**로 줄고 `fuzzyMatch` 후보 중복도 사라진다. `src/main/resources/` 쪽은 16개가 마커 없이 정상이므로 통째 제외 대신 플래그로 다룬다.

---

## 6. 렌더링 결과 — 티켓의 그 케이스

`whatap_query_data(projectCode=<PCODE>, path="src/main/resources/mxql/apm/stat/transaction_diff", timeRange="6h")`

**현재 (신고된 응답)**

```
**No data found.**

**Possible causes:**
- Time range may be too narrow or no data was collected in this window.
- No active agents sending data for this category.

**Recovery steps:**
- `whatap_data_availability(projectCode=…)` to see which categories have active data.
- Try a wider time range (current: "6h").
- `whatap_list_agents(projectCode=…)` to verify agents are running.
```

**개선 후 (상태 C — 전송조차 되지 않음)**

```
**Error**: `src/main/resources/mxql/apm/stat/transaction_diff` is a yard template,
not an executable query. It was NOT sent to the server.

**Unresolved markers** (2): `<%AGENT%>`, `<%FILTER%>`

These markers are filled in by the WhaTap yard service, not by this MCP server,
and they cannot be supplied via `params`. Executing this path would return an
empty result that does **not** mean the project has no data.

**Use one of these executable paths instead:**
- `mxql/v2/app/tx_error_pcode` — …
- `mxql/v2/app/tps_pcode` — …

Or call `whatap_data_availability(projectCode=…, search="<keyword>")` to list executable paths.

Do NOT retry this path with different params or a wider time range.
```

가드를 우회해 서버까지 갔다면 **상태 B**로 잡힌다.

```
**Query failed on the WhaTap server.**

**Server message**: A JSONObject text must begin with '{' at 1 [character 2 line 1]

This is a query execution failure, **not** an absence of data.
Do not conclude that the project has no data for this time range.
```

마커도 없고 오류도 없이 진짜 0행이면 **상태 A**다.

~~~
**No rows returned.**
The request reached the server and came back without an error and without rows.

**What was executed**

- Endpoint: `mxql/text`
- Project: 12345 | timeRange: "6h"
- Window (epoch ms): 1757462400000 → 1757484000000
    UTC: 2026-09-10 00:00:00 → 2026-09-10 06:00:00
    KST: 2026-09-10 09:00:00 → 2026-09-10 15:00:00
- limit: 100
- param: (none)
- Rows: 0 returned, 0 after metadata filtering

Executed MXQL (sent verbatim to the server):
```mxql
CATEGORY db3_stat_tx
FLEXLOAD
GROUP { timeunit:5m, merge: [tx_count, tx_error, tx_time_sum], pk:[oid] }
UPDATE { key: [tx_count, tx_error, tx_time_sum], value:sum}
```

**What this tells you**

- Known: this query, over this window, returned zero rows.
- Not known: whether the metric is collected at all, whether agents are running,
  and whether the query is well-formed for this project.
- **Do not report this as "not measured", "not collected", or "no agents".**
  This response is not evidence for any of those.

**To narrow it down**
…
~~~

---

## 7. 구현 계획 (PR 분할)

| PR | 범위 | 의존 | 검증 기준 |
|---|---|---|---|
| **PR1 — 요청 1** | `extractServerError` / `buildServerErrorResponse` 신설, `yard.ts` MXQL·PromQL 분기, `log.ts`, `promql.ts` 치환 | 없음 | 오류 행 응답이 `isError: true` + 서버 원문 노출, 본문에 "No data" 부재 |
| **PR2 — 요청 2** | `markers.ts` 신설, `query_data` 실행 전 가드, `describe_query` 경고·예시 억제 | 없음 (파일 겹침 최소) | 마커 경로 호출 시 네트워크 호출 0회 + `isError` + 대체 경로 제시 |
| **PR3 — 요청 3** | `QueryEcho` + `buildNoDataResponse` 재작성, 호출부 에코 배선, `mesh.ts` `allSettled` | PR1 (동일 라인 충돌 회피) | 상태 A 응답에 실행 MXQL·시간창·행수 포함, 원인 단정문 제거 |
| **PR4 — 예방** | `CatalogEntry` 플래그, 제너레이터 `target/classes/` 제외, 카탈로그 재생성, `searchEntries` 필터 | PR2 + §10-3 확인 | 검색 결과에 실행 불가 경로 0건, 카탈로그 931→815 |

**PR1~2만으로도 신고된 증상은 사라진다.** PR3은 남은 75건의 빈 배열을 진단 가능하게 만들고, PR4는 애초에 잘못된 경로를 고르지 않게 하는 예방이다.

PR2를 PR1보다 먼저 머지해도 무방하다 — `yard.ts` 내 삽입 위치가 `:873-886`(가드)과 `:899-947`(오류 판정)로 분리되어 있다. 다만 PR3은 PR1이 재작성한 블록을 다시 건드리므로 순서를 지킨다.

---

## 8. 테스트 계획

### 8.1 반드시 먼저 고칠 함정 2개

1. **`tests/mcp-protocol/test.ts:102`**
   ```ts
   if (text.includes("No data") || text.length < 50) throw new Error("No data returned");
   ```
   문구를 `"No rows returned."`로 바꾸면 이 검사는 **깨지지 않고 조용히 항상 통과**한다. 실패 신호가 사라지는 쪽이 더 위험하다. PR3과 **같은 커밋**에서 갱신한다.

2. **회귀 테스트 "검색 결과에 실행 불가 경로 없음"은 오늘 실패한다.** `transaction` 히트 18건이 전부 마커 경로라, 숨기면 0건이 된다. PR4의 선행 조건(§10-3).

### 8.2 신규 테스트

| 파일 | 케이스 |
|---|---|
| `tests/markers.test.ts` | `<% A %>`/`<%A%>` 공백 변형, 주석 줄 무시, 마커 없는 원문, 다중 마커 중복 제거 |
| `tests/response.test.ts` | `extractServerError`: 단일 행 / 다중 행 / `_head_` 동반 / 오류 없음 / 비배열. `buildNoDataResponse`: 에코 유무, 마커 잔존 경고, 단정문 부재 (**현재 이 파일에 `buildNoDataResponse` 테스트 0건**) |
| `tests/query-data.test.ts` (신규) | 4-상태 각각의 종단 응답. `log.test.ts:120-132`의 fake-client 하니스 재사용 (`registerYardTools`는 `yard.ts:125`에서 export됨) |
| `tests/catalog-integrity.test.ts` | `hasUnresolvedMarkers`가 `CATALOG_RAW` 재스캔과 일치 |

**재현 테스트는 수정 전에 red를 확인한다** — `[{"error":"A JSONObject text must begin with '{' …"}]` 를 돌려주는 fake client에 대해 `isError === true` 이고 본문에 `"No data"`가 없을 것.

---

## 9. 리스크

1. **정상 데이터에 `error` 컬럼이 있는 경우 오탐.** 이 수정의 유일한 실질 위험이다. 다만 현행 코드도 이미 `!r["error"]`로 그런 행을 데이터에서 **제외**하고 있어(`yard.ts:937`, `format.ts:72`, `mesh.ts:25`, `format-promql.ts:37`, `format-log.ts:45`) 표시되지 않는다. 이번 변경은 "조용히 버리던 것"을 "시끄럽게 보고하는 것"으로 바꿀 뿐 새 데이터 손실을 만들지 않는다. `ERROR_ROW_KEYS`를 더 넓히는 것(특히 `"message"`)은 권장하지 않는다.
2. **응답 텍스트 변경.** `"No data found."`를 문자열 매칭하던 소비자가 있다면 영향을 받는다. 저장소 내에서는 §8.1의 한 곳뿐이다.
3. **`isError: true`에 대한 클라이언트 반응.** 일부 MCP 클라이언트는 오류를 자동 재시도한다. 파싱 오류는 재시도해도 동일 실패이므로 본문에 재시도 금지를 명시한다(`response.ts:33-37`의 `retryable: false` 표현 재사용).
4. **`_head_` 동반 응답의 동작 변화.** `length !== 1`이라 조용히 통과하던 오류 응답이 이제 오류로 잡힌다. 의도된 개선이지만 "그럭저럭 결과가 나오던 질의"가 오류로 보일 수 있다(실제로는 0행이던 케이스).
5. **토큰 비용.** 상태 A 응답이 길어진다. `MXQL_ECHO_MAX_CHARS = 1200` 절단으로 상한을 둔다. 빈 결과는 드물게 발생하므로 정상 경로의 비용은 증가하지 않는다.
6. **`dist/`가 저장소에 커밋되어 있다.** 릴리스 시 `npm run build` 산출물을 포함해야 하며, 현재 작업 트리에 이미 미커밋 `dist/` 변경이 있다 — 착수 전 정리 필요.

롤백: PR 단위로 독립적이며, 각 PR은 응답 텍스트 생성부만 바꾸고 질의 실행 자체는 변경하지 않는다(PR2의 가드만 예외 — 되돌리면 종전 동작).

---

## 10. 착수 전 확인 필요 (라이브 토큰)

1. **오류 행의 실제 와이어 형태.** "배열 안 오류 행"은 소거법 역추론이다. `curl`로 한 번 캡처하면 `ERROR_ROW_KEYS` 범위가 확정된다.
2. **path 엔드포인트가 마커 경로 100개를 해석하는지.** 개연성은 낮다고 판단했으나(이 "경로"들은 다른 yard 모듈의 파일시스템 경로다), 확인되면 §5.4 가드에 폴백 분기를 넣을 여지가 생긴다.
3. **`mxql/` 트리에 트랜잭션 통계 대체 경로가 있는가.** PR4(`searchEntries` 필터)의 선행 조건. 없으면 필터가 검색 결과를 0건으로 만든다.
4. **75(빈 배열) / 22(오류) 분해의 경로별 매핑.** 두 부류는 원인이 같아(마커 잔존) 제안한 가드가 동일하게 차단하므로 설계에는 영향이 없으나, 수정 후 효과 측정에는 필요하다.
5. **`<% %>` 치환 주체.** yard 저장소에서 확인되면 각 마커의 확장 형태를 알 수 있다. 다만 §2.1의 판단(MCP에서 치환 금지)은 유지 권고다.
