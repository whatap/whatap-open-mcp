# 2026-09-10 · MCP "No data found" 원인 규명 — 요청 2: 마커가 남은 경로는 실행 전에 오류로 답하기

- 대상 저장소: `/home/hsnam/git_hub/whatap-open-mcp` (npm `whatap-mcp` 1.2.1, main HEAD `c6e1f8a`)
- 담당 범위: 요청 2 — "마커가 남은 경로는 실행 전에 오류로 답해 주십시오"
- 작성일: 2026-09-10
- 작업 유형: 분석 전용 (소스 미수정, 빌드·네트워크 호출 없음). 모든 근거는 체크인된 카탈로그와 코드에서 나왔습니다.

---

## 요약 (판정)

1. **재현됨.** 신고자가 센 100 / 48 / 27 / 22 / 3은 정확히 재현됩니다. 다만 그것은 절반입니다 — 카탈로그에는 동일한 100개가 `target/classes/` 접두어로 한 벌 더 실려 있어 **실제 마커 경로는 200개**입니다.
2. **원인은 단일 지점입니다.** `src/tools/yard.ts:873-886`의 "Local catalog priority" 분기가, 카탈로그에 원문이 있으면 무조건 그 원문을 **그대로** `/open-mcp/api/flush/mxql/text`로 보냅니다. 마커는 문자 그대로 전송됩니다.
3. **MCP가 치환하는 마커는 하나도 없습니다.** `src/` 전체에서 `<% %>`를 다루는 코드는 0곳입니다. `$param`은 서버가 `param` 페이로드로 치환하는 별개 계층이고, `<% %>`는 yard(Java) 쪽 템플릿 계층이라 MCP까지 내려오면 이미 실패가 확정된 문자열입니다.
4. **caller가 채울 수 있는 마커도 없습니다.** 마커 경로 100개 중 97개는 `$param`을 아예 선언하지 않고, 나머지 3개가 선언한 것은 `$stime`/`$etime`(도구가 자동 설정)뿐입니다. 따라서 "누락 파라미터를 알려주고 재시도시키는" 설계는 성립하지 않습니다.
5. **권고: (a) 하드 에러 + (b) 실행 가능한 대체 경로 제시 조합, 그리고 생성 시점 차단 병행.** 경로 엔드포인트로의 폴백((c))은 권고하지 않습니다 — 이 100개의 "경로"는 API 경로가 아니라 **다른 yard 모듈의 파일시스템 경로**이기 때문입니다.

가장 아픈 실측 하나: 카탈로그에서 `transaction`이 들어간 경로는 **18개 전부가 마커 경로**입니다. LLM이 "트랜잭션 통계"를 찾으면 실행 가능한 경로를 단 하나도 만나지 못합니다.

---

## 1. 책임 코드

### 1.1 마커 원문을 그대로 서버로 보내는 지점 (핵심)

`src/tools/yard.ts:873-896`

```ts
        // Local catalog priority: if raw MXQL exists in catalog, use text endpoint
        const catalogInfo = describeMql(path);
        const rawMxql = catalogInfo?.raw;

        let result;
        if (rawMxql) {
          // Local catalog has the raw MXQL — execute via text endpoint (no server deployment needed)
          result = await client.executeMxqlText(projectCode, {
            stime,
            etime,
            mql: rawMxql,          // ← <% AGENT %> 등이 그대로 실린다
            limit,
            param: params,
          });
        } else {
          // Not in local catalog — fallback to path endpoint
          const mqlPath = path.startsWith("/") ? path : `/${path}`;
          result = await client.executeMxqlPath(projectCode, {
```

`rawMxql`에 대한 검증은 존재 여부(`if (rawMxql)`)뿐입니다. 내용 검사는 없습니다.

### 1.2 원문을 무조건 돌려주는 카탈로그 조회

`src/yard/catalog.ts:114-122`

```ts
export function describeMql(path: string): (MqlMetadata & { entry: CatalogEntry }) | null {
  const entry = byPath().get(path);
  if (!entry) return null;

  const raw = CATALOG_RAW[path];
  if (raw) {
    const metadata = parseMqlFile(raw);
    return { ...metadata, entry };
  }
```

`CATALOG_RAW`는 931개 경로 전부에 대해 값이 있으므로, `describeMql()`은 항상 `raw`를 채워 돌려줍니다. 결과적으로 §1.1의 `else` 분기(경로 엔드포인트)는 **카탈로그 경로에 대해서는 절대 실행되지 않는 사실상 죽은 코드**입니다.

### 1.3 마커를 인지하지 못하는 파서

`src/yard/parser.ts:96-100`

```ts
    // Scan for $parameters in non-comment lines
    const paramMatches = trimmed.matchAll(/\$(\w+)/g);
    for (const m of paramMatches) {
      parameters.add(`$${m[1]}`);
    }
```

파서가 인식하는 변수 문법은 `$\w+` 하나뿐입니다. `<% ... %>`는 어느 분기에도 걸리지 않고 조용히 통과합니다. 그래서 `CatalogEntry.parameters`가 `[]`가 되고, `whatap_describe_query`는 "파라미터 없음 = 그냥 실행하면 됨"으로 읽히는 문서를 출력합니다.

### 1.4 마커를 보존한 채 카탈로그를 생성하는 빌드 스크립트

`scripts/generate-catalog.ts:43-47` (스캔), `:63-64` (경로 산출), `:84` (원문 저장)

```ts
    if (s.isDirectory()) {
      await scanDir(fullPath, entries);
    } else if (item.endsWith(".mql")) {
      entries.push(fullPath);
    }
```

```ts
    const relPath = relative(YARD_PATH, file).replace(/\\/g, "/").replace(/\.mql$/, "");
    const domain = dirname(relPath).replace(/\\/g, "/");
```

```ts
    rawMap[relPath] = content;
```

필터가 "확장자가 `.mql`인가" 하나뿐이라, yard 저장소의 소스 트리(`src/main/resources/...`)와 **빌드 산출물 트리(`target/classes/...`)가 둘 다** 카탈로그에 들어왔습니다. `content`는 무가공으로 저장됩니다.

### 1.5 실패를 "데이터 없음"으로 오역하는 응답 빌더

`src/utils/response.ts:173-194`

```ts
export function buildNoDataResponse(opts: {
  toolName: string;
  projectCode: number;
  timeRange?: string;
  category?: string;
}): McpResponse {
  const lines: string[] = ["**No data found.**", ""];

  // List possible causes without picking one confidently
  lines.push("**Possible causes:**");
  ...
  lines.push(
    "- Time range may be too narrow or no data was collected in this window.",
    "- No active agents sending data for this category."
  );
```

호출 지점은 `src/tools/yard.ts:826`, `:900`, `:941` 세 곳입니다. 신고자가 "세 가지 원인이 모두 사실이 아니었다"고 지적한 문구가 바로 이 함수의 고정 텍스트입니다. 서버가 문법 오류에 대해 200 + 빈 배열을 주므로(§4) `:900`의 `result.length === 0` 분기가 그대로 타집니다.

### 1.6 마커 경로를 그대로 노출하는 탐색 표면

- `src/yard/catalog.ts:85-112` `searchEntries()` — `CATALOG_ENTRIES` 전체를 대상으로 하며 실행 가능성 필터가 없습니다.
- `src/yard/catalog.ts:138-160` `fuzzyMatch()` — 오류 응답의 "Did you mean" 후보에도 마커 경로가 섞입니다.
- `src/tools/yard.ts:58-83` `formatPathEntry()` — 목록 출력에 경고 표식이 없습니다.
- `src/utils/descriptions.ts:18-20` `PARAM_MXQL_PATH` — 도구 설명이 "yard의 MXQL 경로"라고만 안내하고 실행 불가 하위 집합의 존재를 알리지 않습니다.

### 1.7 참고: 다른 원문 소비자

`grep -rn "executeMxqlText|executeMxqlPath|CATALOG_RAW" src/` 결과, 사용자가 지정한 임의 경로의 카탈로그 원문을 실행하는 곳은 `src/tools/yard.ts:880` 한 곳뿐입니다. `src/tools/mesh.ts:350,354,358,362,483`은 하드코딩된 `/v2/...` 경로를 **경로 엔드포인트**로 호출하고, `src/tools/log.ts:292`는 MQL을 직접 조립합니다. 즉 이번 결함의 폭발 반경은 `whatap_query_data`의 MXQL 모드에 한정됩니다.

---

## 2. 실측

### 2.1 사용한 스크립트

카탈로그(`src/data/mxql-catalog.ts`, 24,258줄)는 `JSON.stringify` 산출물이므로 두 개의 리터럴을 잘라 `JSON.parse` 했습니다.

```js
// load.js — 카탈로그 로더
const fs = require('fs');
const src = fs.readFileSync('src/data/mxql-catalog.ts', 'utf8');
function slice(name) {
  const i = src.indexOf('export const ' + name);
  const j = src.indexOf('=', i);
  const end = name === 'CATALOG_ENTRIES' ? src.indexOf('\n];', j) + 3
                                         : src.lastIndexOf('\n};') + 3;
  let body = src.slice(j + 1, end).trim();
  if (body.endsWith(';')) body = body.slice(0, -1);
  return JSON.parse(body);
}
module.exports = { entries: slice('CATALOG_ENTRIES'), raw: slice('CATALOG_RAW') };
```

```js
// 마커 경로 집계 — 신고자 버킷과 동일 규칙
const c = require('./load.js'), raw = c.raw;
const marked = Object.keys(raw).filter(p => /<%[\s\S]*?%>/.test(raw[p]));
const norm = p => p.replace(/^src\/main\/resources\//, '').replace(/^target\/classes\//, '');
const sm = marked.filter(p => p.startsWith('src/main/resources/'));
const b = { apmstat: 0, dbx: 0, infra: 0, other: 0 };
for (const p of sm) {
  const n = norm(p).replace(/^mxql\//, '');
  if (n.startsWith('apm/stat/')) b.apmstat++;
  else if (n.startsWith('dbx/')) b.dbx++;
  else if (n.startsWith('infra/')) b.infra++;
  else b.other++;
}
console.log(sm.length, b);   // → 100 { apmstat: 48, dbx: 27, infra: 22, other: 3 }
```

**카운팅 규칙:** "마커 경로"는 `CATALOG_RAW[path]`에 `<% ... %>` 토큰이 한 번이라도 나타나는 경로입니다. 도메인 버킷은 `mxql/` 접두어를 제거한 뒤의 **첫 세그먼트**(`apm/stat`만 두 세그먼트)로 나눴습니다.

### 2.2 카탈로그 전체 구조

| 항목 | 값 |
|---|---:|
| `CATALOG_ENTRIES` / `CATALOG_RAW` 항목 수 | 931 / 931 |
| 서로 다른 원문(content) 수 | 794 |
| 중복 그룹 | 2중복 135쌍, 3중복 1건 |
| 접두어 `mxql/` | 699 |
| 접두어 `src/main/resources/` | 116 |
| 접두어 `target/classes/` | 116 |

`src/main/resources/`의 116개 중 **어느 것도 `mxql/` 트리와 원문이 겹치지 않습니다**(교집합 0). 즉 이 232개(= 116 × 2)는 `mxql/` 트리와 다른 별개의 yard 모듈이며, 그 중 소스 트리와 빌드 산출물 트리가 통째로 중복 수록된 것입니다.

### 2.3 마커 경로 집계 — 신고자 수치와의 대조

| 버킷 | 신고자 | 본 실측 (`src/main/resources/`) | 일치 |
|---|---:|---:|:--:|
| 전체 | 100 | **100** | ✅ |
| apm/stat | 48 | **48** | ✅ |
| dbx | 27 | **27** | ✅ |
| infra | 22 | **22** | ✅ |
| 그 외 | 3 | **3** | ✅ |

"그 외 3건"의 정체도 확인했습니다: `event/select-options`, `server/inventory/join`, `server/tmp_cube/tmp_category_filter`.

**단, 신고자 수치는 카탈로그의 절반만 셉니다.** 동일한 100개가 `target/classes/` 접두어로 한 벌 더 존재하며, 접두어를 정규화하면 두 집합은 **완전히 동일**(대칭차 0)합니다.

| 접두어 | 마커 경로 수 |
|---|---:|
| `src/main/resources/` | 100 |
| `target/classes/` | 100 |
| `mxql/` | **0** |
| **합계** | **200** |

→ 실제로 가드가 막아야 하는 카탈로그 경로는 **931개 중 200개(21.5%)**입니다. 반대로 말하면, `mxql/` 트리 699개에는 마커가 단 하나도 없습니다. **결함은 `mxql/` 트리가 아니라 통째로 잘못 딸려 들어온 yard 모듈 하나에 국한**됩니다.

### 2.4 마커 토큰 형태

`src/main/resources/` 마커 경로 100개 기준:

- 서로 다른 토큰 형태: **70개** (공백/대소문자 변형 포함)
- 서로 다른 마커 이름: **66개**
- 다른 템플릿 문법: `{{ ... }}` **0개**, `${ ... }` **1경로**뿐이며 그마저 `${<%REQUEST_ORDER_KEY%>}`처럼 `<% %>`를 감싼 중첩 형태(`dbx/wait/wait_sql_list_1`)입니다.

즉 **탐지해야 할 문법은 `<% ... %>` 단 하나**입니다. 상위 빈도(괄호 안은 해당 마커를 포함한 경로 수):

```
 48  <% AGENT %>        16  <% FILTER_PARAM %>       6  <%SQL_HASH_FIELD_NAME%>
 43  <% FILTER %>       16  <%TIMEUNIT%>             5  <% CATEGORY_NAME %>
 26  <% LIMIT2 %>       14  <% LIMIT1 %>             5  <% ORDER_PARAM %>
 26  <% ORDER2 %>       14  <% ORDER1 %>             5  <%FILTER_NUMBER%>
 21  <%OID%>             6  <%CATEGORY%>             5  <%FILTER_TEXT%>
```
전체 70종은 부록 B에 있습니다.

`<% AGENT %>`와 `<%OID%>`처럼 **공백 유무와 대소문자가 섞여** 있으므로, 검출 정규식은 이름을 정규화해서는 안 되고 토큰 자체를 잡아야 합니다.

### 2.5 마커가 주석에만 있는 경우는 없음

100개 전부가 **주석(`--`)이 아닌 실행 라인**에 마커를 갖습니다(주석 전용 0건). 따라서 "주석 안 마커는 무해하니 예외 처리" 같은 완화는 필요 없습니다. 다만 검증기는 원칙적으로 주석 라인을 건너뛰는 편이 미래의 오탐을 막습니다.

### 2.6 MCP가 치환하는 마커 = 0개

이것이 분석의 핵심입니다. 세 가지 독립적 근거:

1. **코드 부재.** `grep -rn '<%' src/ --include=*.ts`에서 `src/data/mxql-catalog.ts`(데이터 파일)를 제외하면 **결과 0건**입니다. `marker|placeholder|unresolved|template` 검색도 무관한 1건(`src/data/install-guides.ts:3` 주석)뿐입니다. MCP에는 `<% %>` 치환 엔진이 존재하지 않습니다.
2. **전송 경로 확인.** `src/api/client.ts:170-186`의 `executeMxqlText()`는 `{ pageKey: "mxql", ...params }`를 그대로 직렬화합니다. `mql` 문자열에 대한 전처리가 없습니다.
3. **`$param`과는 다른 계층.** `$oid` 류는 `param` 페이로드로 서버가 치환하며(`src/utils/descriptions.ts:66-90` `MXQL_PARAM_REGISTRY`가 `auto`/`filter`/`query`로 분류), MCP 도구 스키마에도 `params` 인자로 노출됩니다. `<% %>`는 그 통로가 없습니다.

**caller가 채울 수 있는가?** 아닙니다.

| 항목 | 값 |
|---|---:|
| 마커 경로 100개 중 `$param`을 하나라도 선언한 것 | **3** |
| 그 3개가 선언한 파라미터 | `$etime` / `$etime` / `$stime`,`$etime` (전부 `kind: "auto"`) |
| caller가 지정 가능한(`kind: "filter"`/`"query"`) 파라미터를 가진 마커 경로 | **0** |

해당 3개는 `infra/file-systems-by-group-and-keys`, `infra/get-server-inventories-with-metric`, `infra/metric-by-oid-list`입니다.

또한 마커 경로 100개는 **description이 100/100 비어 있고**, 49개는 `selectFields`도 비어 있습니다. `whatap_describe_query`가 보여줄 만한 메타데이터 자체가 거의 없습니다.

### 2.7 사용자 관점 노출도 — 왜 자주 밟히는가

`searchEntries()`가 경로/설명 부분 일치로 동작하므로, 흔한 검색어의 결과가 마커 경로로 오염됩니다.

| 검색어 | 총 히트 | 마커 경로 | 오염률 |
|---|---:|---:|---:|
| `transaction` | 18 | 18 | **100%** |
| `useragent` | 8 | 8 | **100%** |
| `httpc` | 13 | 12 | 92% |
| `inventory` | 20 | 16 | 80% |
| `wait` | 41 | 28 | 68% |
| `error` | 24 | 12 | 50% |
| `sql` | 77 | 26 | 34% |

`transaction`은 히트 18개가 전부 `src/main/resources/...` 또는 `target/classes/...`입니다. LLM이 "트랜잭션 통계 경로"를 검색해서 고르면 **무엇을 고르든 반드시 "No data found"** 를 받습니다. 신고자가 "데이터가 있는 프로젝트인데 없다고 답한다"고 한 현상의 재현 경로가 이것입니다.

### 2.8 신고자 예시 재현

`src/main/resources/mxql/apm/stat/transaction_diff`의 `CATALOG_RAW` 원문 — 신고 내용과 문자 단위로 일치합니다.

```
CATEGORY db3_stat_tx
<% AGENT %>
FLEXLOAD
<% FILTER %>
GROUP { timeunit:5m, merge: [tx_count, tx_error, tx_time_sum], pk:[oid] }
UPDATE { key: [tx_count, tx_error, tx_time_sum], value:sum}

CREATE { key: timeAvg, expr: "tx_time_sum/tx_count" }
RENAME [[tx_time_sum, timeSum]
       ,[tx_count, count]
       ,[tx_error, error]
]
```

이에 대응하는 `CatalogEntry`:

```json
{
  "path": "src/main/resources/mxql/apm/stat/transaction_diff",
  "domain": "src/main/resources/mxql/apm/stat",
  "description": "",
  "categories": ["db3_stat_tx"],
  "baseCategories": ["db3_stat_tx"],
  "parameters": [],
  "headerTypes": {},
  "selectFields": [],
  "joins": [],
  "loadType": "FLEXLOAD"
}
```

`parameters: []`이므로 `whatap_describe_query`는 "파라미터 불필요"로 읽히는 문서를 출력하고, 예시 호출(`src/tools/yard.ts:690-698`)로 `whatap_query_data(projectCode=<PCODE>, path="...")`를 그대로 제시합니다. **도구가 실패하는 호출을 스스로 권유합니다.**

---

## 3. 왜 text 엔드포인트는 실패하고 path 엔드포인트는 다를 수 있는가

두 엔드포인트의 계약이 다릅니다.

| | `/open-mcp/api/flush/mxql/text` | `/open-mcp/api/flush/mxql/path` |
|---|---|---|
| 보내는 것 | MXQL **원문 전체** | 서버에 배포된 **쿼리 경로 문자열** |
| 마커 해석 주체 | 없음 — 그대로 MXQL 파서로 감 | 서버가 자기 템플릿 계층에서 먼저 해석 |
| MCP 코드 | `src/api/client.ts:170`, 호출 `src/tools/yard.ts:880` | `src/api/client.ts:202`, 호출 `src/tools/yard.ts:890` |

`<% %>`는 yard 서비스(Java)가 **경로로 서빙할 때** 채워 넣는 조각(fragment) 문법입니다. 조각의 내용과 치환 규칙은 그 Java 코드 안에 있고, `.mql` 파일 어디에도 없습니다. 그래서 같은 파일이라도 "경로로 요청"은 성립할 수 있고 "원문 전송"은 성립할 수 없습니다.

**그렇다면 폴백으로 path 엔드포인트를 쓰면 되지 않나?** — 이 100개에 대해서는 권고하지 않습니다.

- 카탈로그의 `path` 값은 API 경로가 아니라 **생성 스크립트가 만든 파일시스템 상대 경로**입니다(`scripts/generate-catalog.ts:63`). `src/main/resources/mxql/apm/stat/transaction_diff`나 `target/classes/mxql/...`가 서버 라우팅 테이블에 존재할 개연성은 낮습니다.
- `mesh.ts:350` 등 기존의 정상 path 호출은 모두 `/v2/...` 형태를 씁니다. 형태가 다릅니다.
- 설령 일부가 우연히 맞더라도, `target/classes/`(빌드 산출물) 접두어까지 API 경로로 유효할 리는 없습니다.

따라서 폴백은 "실패 방식을 200+빈배열에서 404로 바꾸는" 효과에 그칠 가능성이 큽니다. 다만 이는 토큰 없이 단정할 수 없으므로 §6에 미확인으로 남깁니다. **가드는 폴백 여부와 무관하게 필요**합니다 — 어느 쪽이든 "데이터 없음"이라고 답해서는 안 되기 때문입니다.

---

## 4. PLAT-854와의 경계 — 여기서 고치면 안 되는 것

- **서버가 문법 오류 MXQL에 대해 HTTP 200 + 빈 배열을 주는 것**은 Yard/OpenAPI 결함이며 PLAT-854 소관입니다. MCP에서 "빈 배열을 오류로 간주"하는 식으로 우회해서는 **안 됩니다** — 정상 쿼리의 정당한 빈 결과와 구분이 불가능해집니다.
- **`<% %>`를 MCP에서 치환하려는 시도**도 범위 밖입니다. 치환 규칙은 yard Java 코드가 소유하며, MCP가 추측해 채우면 조용히 틀린 데이터를 답하게 됩니다. 지금의 "빈 결과"보다 나쁩니다.
- MCP가 책임질 것은 **보내기 전에 알아채고 정직하게 실패하는 것** 하나입니다.

---

## 5. 제안

### 5.1 설계 판단: (a) 하드 에러 + (b) 안내 조합, (c) 폴백은 제외

- **(b) 누락 파라미터 목록 제시 — 단독으로는 무효.** §2.6에서 확인했듯 caller가 채울 수 있는 마커는 0개입니다. "이 값들을 주면 됩니다"라고 안내하면 LLM은 값을 지어내 재시도하고, 그 재시도도 실패합니다.
- **(c) path 엔드포인트 라우팅 — 근거 부족.** §3 참조.
- **(a) 하드 에러가 정답이되, 막다른 골목이면 안 됩니다.** 마커 목록은 "왜 못 하는지"의 증거로 제시하고, 실제 행동 지침은 **실행 가능한 대체 경로**여야 합니다. `mxql/` 트리 699개는 전부 정상이므로 대체재가 항상 존재합니다.
- `isError: true` + `retryable: false`로 응답해 **동일 인자 재시도를 금지**합니다.

### 5.2 새 모듈: `src/yard/markers.ts`

```ts
// src/yard/markers.ts
// Detects unsubstituted yard template markers (<% NAME %>) in raw MXQL.
// These are filled in by the yard service when serving a query BY PATH; they
// never reach the MXQL engine. Sending such raw text to /flush/mxql/text
// produces HTTP 200 + [] (see PLAT-854), which the tool used to misreport as
// "No data found".

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

주의점 두 가지:
- `matchAll`은 `g` 플래그가 필요하고 `lastIndex`를 공유하지 않으므로 모듈 상수 재사용이 안전합니다(`test()`/`exec()`와 달리 상태가 남지 않습니다).
- 이름을 정규화하지 않습니다 — `<%OID%>`와 `<% OID %>`가 공존하므로(§2.4) 사용자에게는 발견된 이름을 그대로 보여줍니다.

### 5.3 실행 전 가드 — `whatap_query_data`

**Before** (`src/tools/yard.ts:873-886`)

```ts
        // Local catalog priority: if raw MXQL exists in catalog, use text endpoint
        const catalogInfo = describeMql(path);
        const rawMxql = catalogInfo?.raw;

        let result;
        if (rawMxql) {
          result = await client.executeMxqlText(projectCode, {
            stime, etime, mql: rawMxql, limit, param: params,
          });
        } else {
```

**After**

```ts
        // Local catalog priority: if raw MXQL exists in catalog, use text endpoint
        const catalogInfo = describeMql(path);
        const rawMxql = catalogInfo?.raw;

        // Pre-execution guard: a template that still carries yard markers cannot
        // be executed as raw text. Fail loudly instead of reporting "no data".
        if (rawMxql) {
          const scan = scanMarkers(rawMxql);
          if (scan.hasMarkers) {
            return buildMarkerErrorResponse(path, scan, projectCode);
          }
        }

        let result;
        if (rawMxql) {
          result = await client.executeMxqlText(projectCode, {
            stime, etime, mql: rawMxql, limit, param: params,
          });
        } else {
```

가드는 `parseTimeRange()` 뒤, 첫 네트워크 호출 앞에 놓입니다. 토큰 발급(`getProjectToken`)도 일어나지 않으므로 불필요한 왕복이 사라집니다.

응답 빌더(같은 파일 상단 또는 `src/utils/response.ts`):

```ts
function buildMarkerErrorResponse(
  path: string,
  scan: MarkerScan,
  projectCode: number
) {
  // Suggest only paths that are actually executable.
  const alternatives = fuzzyMatch(path, 12)
    .filter((e) => e.path !== path && !scanMarkers(CATALOG_RAW[e.path] ?? "").hasMarkers)
    .slice(0, 5);

  const lines = [
    `**Error**: \`${path}\` is a yard **template**, not an executable query. ` +
      `It was NOT sent to the server.`,
    "",
    `**Unresolved markers** (${scan.markers.length}): ` +
      scan.markers.map((m) => `\`<%${m}%>\``).join(", "),
    "",
    "These markers are filled in by the WhaTap yard service, not by this MCP " +
      "server, and they cannot be supplied via `params`. Executing this path " +
      "would return an empty result that does **not** mean the project has no data.",
  ];

  if (alternatives.length > 0) {
    lines.push("", "**Use one of these executable paths instead:**");
    for (const a of alternatives) {
      const desc = a.description
        ? ` — ${translateDescription(a.path, a.description)}`
        : "";
      lines.push(`- \`${a.path}\`${desc}`);
    }
  }
  lines.push(
    "",
    `Or call \`whatap_data_availability(projectCode=${projectCode}, search="<keyword>")\` ` +
      "to list executable paths.",
    "",
    "Do NOT retry this path with different params or a wider time range."
  );

  return { content: [{ type: "text" as const, text: lines.join("\n") }], isError: true };
}
```

LLM 관점의 요건 셋을 모두 담았습니다: (1) **왜** 실패했는지가 "데이터 없음"과 명시적으로 구분됨, (2) **무엇을 대신 할지**가 구체적 경로로 주어짐, (3) **재시도 금지**가 명시됨.

### 5.4 `whatap_describe_query` 표면화

**Before** (`src/tools/yard.ts:490` 이후, 문서 조립부)

```ts
        const { entry, ...metadata } = result;
        const lines = [`## MXQL: ${path}`, ""];
```

**After**

```ts
        const { entry, ...metadata } = result;
        const lines = [`## MXQL: ${path}`, ""];

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
```

동시에 파일 하단의 예시 블록(`src/tools/yard.ts:690-698`)은 마커가 있으면 **출력하지 않아야** 합니다. 지금은 실패가 보장된 호출을 예시로 제시하고 있습니다.

```ts
        // Example call — only for executable paths
        if (!scan.hasMarkers) {
          lines.push("", "### Example", "", "```",
            `whatap_query_data(projectCode=<PCODE>, path="${path}", timeRange="5m")`,
            "```");
        }
```

### 5.5 `whatap_data_availability` — 목록에서 제외

가장 효과가 큰 변경입니다. §2.7의 오염률을 0으로 만듭니다.

`src/yard/catalog.ts:85`의 `searchEntries()`에 실행 가능성 필터를 기본 적용합니다.

```ts
export function searchEntries(opts: {
  domain?: string;
  search?: string;
  category?: string;
  /** Include template paths that cannot be executed as raw text. Default: false. */
  includeNonExecutable?: boolean;
}): CatalogEntry[] {
  ...
  if (!opts.includeNonExecutable) {
    results = results.filter((e) => !e.hasUnresolvedMarkers);
  }
  return results;
}
```

`fuzzyMatch()`(`src/yard/catalog.ts:138`)와 `getDomainSummary()`(`:71`)에도 같은 필터를 적용합니다. 도메인 요약도 정리됩니다: 마커 항목만 걸러도 도메인이 **72 → 50**, §5.6의 `target/classes/` 제외까지 적용하면 **43**이 됩니다(`src/main/resources/` 쪽 16개 정상 경로가 남으므로 36까지 줄지는 않습니다).

### 5.6 생성 시점 대안 (요청 5)

**권고: 런타임 검사와 생성 시점 플래그를 둘 다 둡니다. 배타적 선택이 아닙니다.**

`src/yard/types.ts`의 `CatalogEntry`에 필드를 추가합니다.

```ts
export interface CatalogEntry {
  ...
  loadType: "TAGLOAD" | "FLEXLOAD" | "LogCountLoad" | "unknown";
  /** Raw MXQL still contains yard template markers (<% NAME %>) — not executable as text. */
  hasUnresolvedMarkers: boolean;
  /** Marker names found, for diagnostics. Empty when hasUnresolvedMarkers is false. */
  unresolvedMarkers: string[];
}
```

`scripts/generate-catalog.ts:71-83`에서 채웁니다.

```ts
    const markerScan = scanMarkers(content);

    catalogEntries.push({
      path: relPath,
      ...
      loadType: metadata.loadType,
      hasUnresolvedMarkers: markerScan.hasMarkers,
      unresolvedMarkers: markerScan.markers,
    });
```

| | 생성 시점 플래그 | 런타임 검사 |
|---|---|---|
| 비용 | 카탈로그 재생성 1회, 파일 크기 소폭 증가 | 실행당 문자열 스캔 1회(수 KB, 무시 가능) |
| 이득 | **인덱싱/필터링이 가능** — 검색·도메인 요약에서 사전 제외, 테스트로 고정 | **실제로 전송되는 문자열을 검사** — 플래그와 원문이 어긋날 수 없음 |
| 약점 | 카탈로그를 손으로 고치면 거짓말이 됨 | 이미 목록에 노출된 뒤라 LLM이 한 번은 밟음 |

플래그는 **데이터**(무엇을 보여줄지), 런타임 검사는 **집행**(무엇을 보낼지)입니다. 전송되는 것은 `CATALOG_RAW[path]`이므로 마지막 방어선은 반드시 원문을 봐야 합니다.

**추가 권고 — 제너레이터에서 아예 걸러내기.** `scripts/generate-catalog.ts:43-47`의 스캔에 제외 규칙을 넣습니다.

```ts
const EXCLUDED_DIR_RE = /(^|\/)target\/classes(\/|$)/;   // build output, duplicates src/main
...
    if (s.isDirectory()) {
      if (EXCLUDED_DIR_RE.test(fullPath.replace(/\\/g, "/"))) continue;
      await scanDir(fullPath, entries);
    }
```

`target/classes/` 116건은 `src/main/resources/` 116건의 **완전한 복제**이므로(§2.2, 대칭차 0) 순수 낭비입니다. 제거하면 카탈로그가 **931 → 815**로 줄고 `fuzzyMatch` 후보 중복도 사라집니다. `src/main/resources/` 쪽은 16개가 정상 실행 가능하므로 통째 제외 대신 마커 플래그로 다루는 편이 안전합니다.

### 5.7 회귀 테스트

`tests/catalog-integrity.test.ts`(현재 9 케이스)에 추가합니다.

```ts
import { scanMarkers } from '../src/yard/markers.ts';
import { CATALOG_RAW } from '../src/data/mxql-catalog.ts';

it('hasUnresolvedMarkers matches a fresh scan of CATALOG_RAW', () => {
  for (const entry of CATALOG_ENTRIES) {
    const raw = CATALOG_RAW[entry.path] ?? '';
    expect(entry.hasUnresolvedMarkers).toBe(scanMarkers(raw).hasMarkers);
  }
});

it('searchEntries() never returns a non-executable path by default', () => {
  const results = searchEntries({ search: 'transaction' });
  expect(results.length).toBeGreaterThan(0);          // 현재는 18건 전부 마커 → 0건이 되면 안 됨
  expect(results.every((e) => !e.hasUnresolvedMarkers)).toBe(true);
});
```

두 번째 테스트는 **현재 상태에서 반드시 실패**합니다(`transaction` 히트 18건이 전부 마커 경로, §2.7). 이는 §5.6의 제너레이터 정리와 `mxql/` 트리 쪽 대체 경로 확보가 함께 이루어져야 함을 드러냅니다 — 마커 경로를 숨기기만 하면 "트랜잭션 통계"에 대한 검색 결과가 0건이 되기 때문입니다. 이 지점은 요청 2의 범위를 넘어서지만, 가드 도입과 동시에 검토되어야 합니다.

### 5.8 적용 순서 제안

1. `src/yard/markers.ts` 신설 + 단위 테스트 (외부 영향 0)
2. `whatap_query_data` 실행 전 가드 (§5.3) — **결함의 직접 차단**
3. `whatap_describe_query` 경고 + 예시 억제 (§5.4)
4. `CatalogEntry` 플래그 + 카탈로그 재생성 + `target/classes/` 제외 (§5.6)
5. `searchEntries`/`fuzzyMatch`/`getDomainSummary` 필터 (§5.5) — 4번 이후
6. 회귀 테스트 (§5.7)

1~3만으로도 신고자가 본 증상("데이터가 있는데 없다고 답함")은 사라집니다. 4~5는 애초에 잘못된 경로를 고르지 않게 하는 예방입니다.

---

## 6. 미확인 / 가정

토큰 없이, 그리고 yard 저장소 없이 확정할 수 없는 항목입니다.

1. **신고자의 "오류 22건 / 빈 배열 75건" 분류를 마커 경로별로 매핑하지 못했습니다.** `A JSONObject text must begin with '{'`는 마커가 JSON 리터럴이 와야 할 위치를 차지했을 때(예: `GROUP <%GROUP_MERGE%>`) 발생하는 것으로 보이나, 실제 서버 파서 동작 없이는 단정할 수 없습니다. **다만 두 반응은 원인이 같습니다** — 마커가 실행 문자열에 남아 있다는 사실 하나입니다. 제안한 가드는 두 부류를 똑같이 차단합니다. (신고자 집계 100 = 75 + 22 + 3(제외)이므로 세 부류의 합이 마커 경로 전체와 일치합니다.)
2. **path 엔드포인트가 이 100개 경로를 해석할 수 있는지 미확인.** §3의 근거로 개연성이 낮다고 판단했으나, 라이브 토큰으로 `src/main/resources/mxql/apm/stat/transaction_diff`를 `/flush/mxql/path`에 보내 확인하면 폴백 옵션의 가부가 확정됩니다. 확인 방법: `whatap_query_data`의 else 분기를 임시로 강제하거나, `curl`로 직접 호출.
3. **`<% %>` 치환 규칙의 소유자를 코드로 확인하지 못했습니다.** yard(Java) 서비스가 경로 서빙 시 채운다는 것은 이 저장소에 치환 코드가 전무하다는 사실(§2.6)로부터의 **추론**입니다. yard 저장소를 열면 각 마커가 어떤 조각으로 확장되는지 확정할 수 있고, 그 경우 §4의 판단(MCP에서 치환 금지)을 재검토할 여지가 생깁니다 — 다만 규칙 복제는 유지보수 부채가 되므로 여전히 권고하지 않습니다.
4. **`src/main/resources/` 트리가 왜 카탈로그에 들어왔는지** — 카탈로그 생성 시 `<yard-path>` 인자로 저장소 루트를 지정해 소스 트리와 빌드 산출물을 함께 훑은 결과로 보입니다. 생성 명령의 실제 인자는 기록이 없어 미확인입니다.
5. **16개의 마커 없는 `src/main/resources/` 경로**(`apm/daily/app_counter`, `infra/get-custom-field-keys` 등)가 실제로 실행 가능한지는 검증하지 못했습니다. 마커가 없으므로 text 엔드포인트 문법 오류는 나지 않겠으나, 카테고리가 해당 설치에 존재하는지는 별개 문제입니다.
6. **회귀 테스트 §5.7의 두 번째 케이스는 현재 실패합니다.** 이는 의도된 지적이며, 통과시키려면 `mxql/` 트리에 트랜잭션 통계 대체 경로가 있는지 확인이 필요합니다(미확인).

---

## 부록 A. 마커 경로 전체 목록 (100건)

`src/main/resources/` 접두어 기준입니다. 각 항목은 `target/classes/` 접두어로 동일한 쌍이 하나씩 더 존재하므로, 실제 카탈로그 상 대상은 200건입니다.

### A.1 apm/stat (48건)

| # | 경로 (`src/main/resources/` 접두어 생략) | 미치환 마커 | 마커 수 |
|---:|---|---|---:|
| 1 | `apm/stat/error_diff` | `<%AGENT%>` `<%FILTER%>` | 2 |
| 2 | `apm/stat/error_diff_1h` | `<%AGENT%>` `<%FILTER%>` | 2 |
| 3 | `apm/stat/error_series` | `<%AGENT%>` `<%FILTER%>` | 2 |
| 4 | `apm/stat/error_series_1h` | `<%AGENT%>` `<%FILTER%>` | 2 |
| 5 | `apm/stat/error_stat` | `<%AGENT%>` `<%ORDER1%>` `<%LIMIT1%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 6 |
| 6 | `apm/stat/error_stat_1h` | `<%AGENT%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 4 |
| 7 | `apm/stat/httpc_diff` | `<%AGENT%>` `<%FILTER%>` | 2 |
| 8 | `apm/stat/httpc_diff_1h` | `<%AGENT%>` `<%FILTER%>` | 2 |
| 9 | `apm/stat/httpc_series` | `<%AGENT%>` `<%FILTER%>` | 2 |
| 10 | `apm/stat/httpc_series_1h` | `<%AGENT%>` `<%FILTER%>` | 2 |
| 11 | `apm/stat/httpc_stat` | `<%AGENT%>` `<%ORDER1%>` `<%LIMIT1%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 6 |
| 12 | `apm/stat/httpc_stat_1h` | `<%AGENT%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 4 |
| 13 | `apm/stat/ip_stat` | `<%AGENT%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 4 |
| 14 | `apm/stat/ip_stat_1h` | `<%AGENT%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 4 |
| 15 | `apm/stat/ip_url_stat` | `<%AGENT%>` `<%ORDER1%>` `<%LIMIT1%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 6 |
| 16 | `apm/stat/ip_url_stat_1h` | `<%AGENT%>` `<%ORDER1%>` `<%LIMIT1%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 6 |
| 17 | `apm/stat/sql_diff` | `<%AGENT%>` `<%FILTER%>` | 2 |
| 18 | `apm/stat/sql_diff_1h` | `<%AGENT%>` `<%FILTER%>` | 2 |
| 19 | `apm/stat/sql_series` | `<%AGENT%>` `<%FILTER%>` | 2 |
| 20 | `apm/stat/sql_series_1h` | `<%AGENT%>` `<%FILTER%>` | 2 |
| 21 | `apm/stat/sql_stat` | `<%AGENT%>` `<%ORDER1%>` `<%LIMIT1%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 6 |
| 22 | `apm/stat/sql_stat_1h` | `<%AGENT%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 4 |
| 23 | `apm/stat/sql_stat_join` | `<%TIME_1H%>` `<%AGENT%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` `<%TIME_5M%>` `<%ORDER1%>` `<%LIMIT1%>` | 8 |
| 24 | `apm/stat/transaction_diff` | `<%AGENT%>` `<%FILTER%>` | 2 |
| 25 | `apm/stat/transaction_diff_1h` | `<%AGENT%>` `<%FILTER%>` | 2 |
| 26 | `apm/stat/transaction_quantile_stat` | `<%AGENT%>` `<%ORDER1%>` `<%LIMIT1%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 6 |
| 27 | `apm/stat/transaction_quantile_stat_1h` | `<%AGENT%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 4 |
| 28 | `apm/stat/transaction_series` | `<%AGENT%>` `<%FILTER%>` | 2 |
| 29 | `apm/stat/transaction_series_1h` | `<%AGENT%>` `<%FILTER%>` | 2 |
| 30 | `apm/stat/transaction_stat` | `<%AGENT%>` `<%ORDER1%>` `<%LIMIT1%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 6 |
| 31 | `apm/stat/transaction_stat_1h` | `<%AGENT%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 4 |
| 32 | `apm/stat/transaction_stat_join` | `<%AGENT%>` `<%ORDER1%>` `<%LIMIT1%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 6 |
| 33 | `apm/stat/tx_caller_stat` | `<%AGENT%>` `<%ORDER1%>` `<%LIMIT1%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 6 |
| 34 | `apm/stat/tx_caller_stat_1h` | `<%AGENT%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 4 |
| 35 | `apm/stat/tx_domain_series` | `<%AGENT%>` `<%DOMAIN%>` `<%URL%>` | 3 |
| 36 | `apm/stat/tx_domain_series_1h` | `<%AGENT%>` `<%DOMAIN%>` `<%URL%>` | 3 |
| 37 | `apm/stat/tx_domain_stat` | `<%AGENT%>` `<%ORDER1%>` `<%LIMIT1%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 6 |
| 38 | `apm/stat/tx_domain_stat_1h` | `<%AGENT%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 4 |
| 39 | `apm/stat/tx_login_stat` | `<%AGENT%>` `<%ORDER1%>` `<%LIMIT1%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 6 |
| 40 | `apm/stat/tx_login_stat_1h` | `<%AGENT%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 4 |
| 41 | `apm/stat/tx_referer_series` | `<%AGENT%>` `<%REFERER%>` `<%URL%>` | 3 |
| 42 | `apm/stat/tx_referer_series_1h` | `<%AGENT%>` `<%REFERER%>` `<%URL%>` | 3 |
| 43 | `apm/stat/tx_referer_stat` | `<%AGENT%>` `<%ORDER1%>` `<%LIMIT1%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 6 |
| 44 | `apm/stat/tx_referer_stat_1h` | `<%AGENT%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 4 |
| 45 | `apm/stat/useragent_series` | `<%AGENT%>` `<%HASH%>` | 2 |
| 46 | `apm/stat/useragent_series_1h` | `<%AGENT%>` `<%HASH%>` | 2 |
| 47 | `apm/stat/useragent_stat` | `<%AGENT%>` `<%ORDER1%>` `<%LIMIT1%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 6 |
| 48 | `apm/stat/useragent_stat_1h` | `<%AGENT%>` `<%FILTER%>` `<%ORDER2%>` `<%LIMIT2%>` | 4 |

### A.2 dbx (27건)

| # | 경로 (`src/main/resources/` 접두어 생략) | 미치환 마커 | 마커 수 |
|---:|---|---|---:|
| 1 | `dbx/linkages/apm2db` | `<%flexload%>` | 1 |
| 2 | `dbx/linkages/db2apm` | `<%category%>` `<%keyName%>` `<%value%>` | 3 |
| 3 | `dbx/linkages/db2apm_oracle` | `<%category%>` `<%filter1%>` `<%filter2%>` `<%filter3%>` | 4 |
| 4 | `dbx/parameter-history` | `<%DB_TYPE%>` `<%OID%>` | 2 |
| 5 | `dbx/planchange/chart` | `<%SQLSTAT_CATEGORY%>` `<%OID%>` `<%PLAN_CHANGE_CATEGORY%>` `<%SQL_HASH_FIELD%>` | 4 |
| 6 | `dbx/planchange/history` | `<%PLAN_CHANGE_CATEGORY%>` `<%OID%>` `<%SQL_HASH_FIELD%>` | 3 |
| 7 | `dbx/planchange/summary` | `<%SQLSTAT_CATEGORY%>` `<%OID%>` `<%PLAN_CHANGE_CATEGORY%>` `<%SQL_HASH_FIELD%>` | 4 |
| 8 | `dbx/stat/each_sql` | `<%CATEGORY%>` `<%GROUP_KEY%>` `<%UNFOLD%>` `<%ADD_GROUPS%>` `<%SQL_HASH_FIELD_NAME%>` `<%ADD_HVTEXT%>` `<%GROUP_VALUE%>` `<%OIDS%>` `<%GROUP_MERGE%>` `<%SQL_HASH_FIELD_NAME_2%>` `<%FILTER_TEXT%>` `<%FILTER_NUMBER%>` `<%ORDER_KEY%>` `<%LIMIT%>` | 14 |
| 9 | `dbx/stat/each_sql_main` | `<%CATEGORY%>` `<%UNFOLD%>` `<%ADD_GROUPS%>` `<%USER_FIELD_HASH%>` `<%SQL_HASH_FIELD_NAME%>` `<%OIDS%>` `<%USER_FIELD_NAME%>` `<%ADD_HVTEXT%>` `<%GROUP_MERGE%>` `<%FILTER_TEXT%>` `<%FILTER_NUMBER%>` `<%ORDER_KEY%>` `<%LIMIT%>` | 13 |
| 10 | `dbx/stat/merged_sql` | `<%CATEGORY%>` `<%GROUP_KEY%>` `<%UNFOLD%>` `<%SQL_HASH_FIELD_NAME%>` `<%OIDS%>` `<%GROUP_MERGE%>` `<%SQL_HASH_FIELD_NAME_2%>` `<%FILTER_TEXT%>` `<%FILTER_NUMBER%>` | 9 |
| 11 | `dbx/stat/sql_stat_raw` | `<%CATEGORY%>` `<%OID%>` `<%UNFOLD_FIELDS%>` `<%ADD_GROUPS%>` `<%SQL_HASH_FIELD_NAME%>` `<%ADD_HVTEXT%>` `<%SELECT_FIELDS%>` | 7 |
| 12 | `dbx/stat/summary_chart_all` | `<%CATEGORY%>` `<%OID%>` `<%SQL_HASH_FIELD_NAME%>` `<%REQUEST_FIELD%>` `<%FILTER%>` `<%TIMEUNIT%>` | 6 |
| 13 | `dbx/stat/summary_chart_group` | `<%CATEGORY%>` `<%OID%>` `<%SQL_HASH_FIELD_NAME%>` `<%REQUEST_GROUP%>` `<%REQUEST_FIELD%>` `<%FILTER%>` `<%TIMEUNIT%>` | 7 |
| 14 | `dbx/wait/group_name` | `<%TIMEUNIT%>` `<%OID%>` | 2 |
| 15 | `dbx/wait/wait_analysis_chart_class` | `<%TIMEUNIT%>` `<%OID%>` | 2 |
| 16 | `dbx/wait/wait_analysis_chart_cpu` | `<%TIMEUNIT%>` `<%OID%>` | 2 |
| 17 | `dbx/wait/wait_analysis_chart_enqueue` | `<%TIMEUNIT%>` `<%OID%>` | 2 |
| 18 | `dbx/wait/wait_analysis_chart_latch` | `<%TIMEUNIT%>` `<%OID%>` | 2 |
| 19 | `dbx/wait/wait_analysis_chart_mem` | `<%TIMEUNIT%>` `<%OID%>` | 2 |
| 20 | `dbx/wait/wait_analysis_chart_session` | `<%TIMEUNIT%>` `<%OID%>` | 2 |
| 21 | `dbx/wait/wait_analysis_chart_stat` | `<%TIMEUNIT%>` `<%OID%>` | 2 |
| 22 | `dbx/wait/wait_analysis_chart_waitcount` | `<%TIMEUNIT%>` `<%OID%>` | 2 |
| 23 | `dbx/wait/wait_analysis_chart_waittime` | `<%TIMEUNIT%>` `<%OID%>` | 2 |
| 24 | `dbx/wait/wait_sql_list_1` | `<%TIMEUNIT%>` `<%OID%>` `<%REQUEST_ORDER_KEY%>` `<%FILTER_TEXT%>` `<%FILTER_NUMBER%>` | 5 |
| 25 | `dbx/wait/wait_sql_list_2` | `<%OID%>` `<%REQUEST_EVENT_NAME%>` `<%TIMEUNIT%>` `<%FILTER_TEXT%>` `<%FILTER_NUMBER%>` | 5 |
| 26 | `dbx/wait/wait_summary` | `<%TIMEUNIT%>` `<%OID%>` | 2 |
| 27 | `dbx/wait/wait_top_n` | `<%OID%>` `<%FILTER_CLASS_NAME%>` `<%TIMEUNIT%>` | 3 |

### A.3 infra (22건)

| # | 경로 (`src/main/resources/` 접두어 생략) | 미치환 마커 | 마커 수 |
|---:|---|---|---:|
| 1 | `infra/file-systems-by-group-and-keys` | `<%FILTER_PARAM%>` | 1 |
| 2 | `infra/get-event-id-list` | `<%FILTER_PARAM%>` | 1 |
| 3 | `infra/get-fold-category-desc-fields` | `<%CATEGORY_NAME%>` `<%FILTER_PARAM%>` | 2 |
| 4 | `infra/get-inventory-keywords` | `<%FILTER_PARAM%>` `<%COLUMN_NAME%>` `<%CATEGORY_NAME%>` | 3 |
| 5 | `infra/get-server-inventories-for-status` | `<%FILTER_PARAM%>` | 1 |
| 6 | `infra/get-server-inventories-with-metric` | `<%FILTER_PARAM%>` `<%GROUP_FIELDS%>` `<%ORDER_PARAM%>` | 3 |
| 7 | `infra/get-server-ostype-version` | `<%FILTER_PARAM%>` | 1 |
| 8 | `infra/hostnames-by-all` | `<%FILTER_PARAM%>` | 1 |
| 9 | `infra/hostnames-by-oid-list` | `<%FILTER_PARAM%>` `<%OID_LIST_PARAM%>` | 2 |
| 10 | `infra/inventory/check-exist-gpu` | `<%FILTER_GROUP_OIDS%>` | 1 |
| 11 | `infra/inventory/get-active-gpu-list` | `<%FILTER_OIDS%>` | 1 |
| 12 | `infra/inventoryV2/gpu-search-agent-join` | `<%FILTER_PARAM%>` `<%ORDER_PARAM%>` | 2 |
| 13 | `infra/inventoryV2/gpu-search-snapshot` | `<%FILTER_PARAM%>` `<%ORDER_PARAM%>` `<%SNAPSHOT_DATE%>` | 3 |
| 14 | `infra/inventoryV2/server-search-agent-join` | `<%FILTER_PARAM%>` `<%ORDER_PARAM%>` | 2 |
| 15 | `infra/inventoryV2/server-search-snapshot` | `<%FILTER_PARAM%>` `<%ORDER_PARAM%>` `<%SNAPSHOT_DATE%>` | 3 |
| 16 | `infra/metric-by-oid-list` | `<%CATEGORY_NAME%>` `<%FILTER_OID_LIST%>` `<%FIELD_NAME%>` | 3 |
| 17 | `infra/oid-list-by-filters` | `<%FILTER_PARAM%>` | 1 |
| 18 | `infra/oid-list-by-top-n` | `<%OID_LIST_PARAM%>` | 1 |
| 19 | `infra/os-type-by-oids` | `<%FILTER_PARAM%>` `<%OID_LIST_PARAM%>` | 2 |
| 20 | `infra/process-list-by-oid` | `<%OID_PARAM%>` | 1 |
| 21 | `infra/servers-by-group-and-keys` | `<%FILTER_PARAM%>` | 1 |
| 22 | `infra/v4series/select-fold-category` | `<%CATEGORY_NAME%>` `<%OID_FILTER%>` `<%FIELD_LIST%>` `<%SUB_KEY_FILTER%>` | 4 |

### A.4 그 외 (3건)

| # | 경로 (`src/main/resources/` 접두어 생략) | 미치환 마커 | 마커 수 |
|---:|---|---|---:|
| 1 | `event/select-options` | `<%TIMEUNIT%>` `<%CATEGORY%>` `<%UNFOLD%>` `<%SELECT%>` `<%PK%>` | 5 |
| 2 | `server/inventory/join` | `<%FILTER%>` | 1 |
| 3 | `server/tmp_cube/tmp_category_filter` | `<%CATEGORY_NAME%>` `<%FILTER_PARAMS%>` | 2 |

## 부록 B. 마커 토큰 형태별 빈도 (src/main/resources 100건 기준)

토큰 형태 70종 / 이름 66종. 같은 이름이라도 공백 유무·대소문자가 다르면 별도 형태로 셌습니다.

| # | 토큰 형태 | 포함 경로 수 |
|---:|---|---:|
| 1 | `<% AGENT %>` | 48 |
| 2 | `<% FILTER %>` | 43 |
| 3 | `<% LIMIT2 %>` | 26 |
| 4 | `<% ORDER2 %>` | 26 |
| 5 | `<%OID%>` | 21 |
| 6 | `<% FILTER_PARAM %>` | 16 |
| 7 | `<%TIMEUNIT%>` | 16 |
| 8 | `<% LIMIT1 %>` | 14 |
| 9 | `<% ORDER1 %>` | 14 |
| 10 | `<%CATEGORY%>` | 6 |
| 11 | `<%SQL_HASH_FIELD_NAME%>` | 6 |
| 12 | `<% CATEGORY_NAME %>` | 5 |
| 13 | `<% ORDER_PARAM %>` | 5 |
| 14 | `<%FILTER_NUMBER%>` | 5 |
| 15 | `<%FILTER_TEXT%>` | 5 |
| 16 | `<% URL %>` | 4 |
| 17 | `<% OID_LIST_PARAM %>` | 3 |
| 18 | `<%ADD_GROUPS%>` | 3 |
| 19 | `<%ADD_HVTEXT%>` | 3 |
| 20 | `<%GROUP_MERGE%>` | 3 |
| 21 | `<%OIDS%>` | 3 |
| 22 | `<%PLAN_CHANGE_CATEGORY%>` | 3 |
| 23 | `<%SQL_HASH_FIELD%>` | 3 |
| 24 | `<%UNFOLD%>` | 3 |
| 25 | `<% DOMAIN %>` | 2 |
| 26 | `<% HASH %>` | 2 |
| 27 | `<% REFERER %>` | 2 |
| 28 | `<% SNAPSHOT_DATE %>` | 2 |
| 29 | `<%category%>` | 2 |
| 30 | `<%FILTER%>` | 2 |
| 31 | `<%GROUP_KEY%>` | 2 |
| 32 | `<%LIMIT%>` | 2 |
| 33 | `<%ORDER_KEY%>` | 2 |
| 34 | `<%REQUEST_FIELD%>` | 2 |
| 35 | `<%SQL_HASH_FIELD_NAME_2%>` | 2 |
| 36 | `<%SQLSTAT_CATEGORY%>` | 2 |
| 37 | `<% CATEGORY %>` | 1 |
| 38 | `<% COLUMN_NAME %>` | 1 |
| 39 | `<% FIELD_LIST %>` | 1 |
| 40 | `<% FIELD_NAME %>` | 1 |
| 41 | `<% FILTER_GROUP_OIDS %>` | 1 |
| 42 | `<% FILTER_OID_LIST %>` | 1 |
| 43 | `<% FILTER_OIDS %>` | 1 |
| 44 | `<% FILTER_PARAMS %>` | 1 |
| 45 | `<% GROUP_FIELDS %>` | 1 |
| 46 | `<% OID_FILTER %>` | 1 |
| 47 | `<% OID_PARAM %>` | 1 |
| 48 | `<% PK %>` | 1 |
| 49 | `<% SELECT %>` | 1 |
| 50 | `<% SUB_KEY_FILTER %>` | 1 |
| 51 | `<% TIME_1H %>` | 1 |
| 52 | `<% TIME_5M %>` | 1 |
| 53 | `<% TIMEUNIT %>` | 1 |
| 54 | `<% UNFOLD %>` | 1 |
| 55 | `<%DB_TYPE%>` | 1 |
| 56 | `<%FILTER_CLASS_NAME%>` | 1 |
| 57 | `<%filter1%>` | 1 |
| 58 | `<%filter2%>` | 1 |
| 59 | `<%filter3%>` | 1 |
| 60 | `<%flexload%>` | 1 |
| 61 | `<%GROUP_VALUE%>` | 1 |
| 62 | `<%keyName%>` | 1 |
| 63 | `<%REQUEST_EVENT_NAME%>` | 1 |
| 64 | `<%REQUEST_GROUP%>` | 1 |
| 65 | `<%REQUEST_ORDER_KEY%>` | 1 |
| 66 | `<%SELECT_FIELDS%>` | 1 |
| 67 | `<%UNFOLD_FIELDS%>` | 1 |
| 68 | `<%USER_FIELD_HASH%>` | 1 |
| 69 | `<%USER_FIELD_NAME%>` | 1 |
| 70 | `<%value%>` | 1 |
