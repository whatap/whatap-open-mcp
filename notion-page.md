# whatap-mcp — WhaTap MCP Server

> WhaTap 모니터링 데이터를 AI 어시스턴트에서 자연어로 조회할 수 있는 오픈소스 MCP 서버

|  |  |
| --- | --- |
| **GitHub** | https://github.com/whatap/whatap-open-mcp |
| **npm** | `whatap-mcp` (배포 예정) |
| **버전** | 1.0.0 |
| **라이선스** | MIT |
| **런타임 의존성** | 0개 (Node.js만 필요) |
| **담당** | 남형석 (hsnam) |

---

## 1. 배경 및 목적

### 왜 만들었나

일본 고객으로부터 "WhaTap 모니터링 데이터를 AI로 요약하고 싶다"는 요청을 받았습니다. WhaTap Open API는 이미 존재하지만, AI 어시스턴트가 직접 호출할 수 있는 인터페이스가 없었습니다.

**MCP(Model Context Protocol)** 는 AI 어시스턴트가 외부 도구를 호출하는 표준 프로토콜로, 현재 주요 AI 클라이언트가 모두 지원합니다:

- **Anthropic**: Claude Desktop, Claude Code
- **OpenAI**: Codex CLI
- **Google**: Gemini CLI

이 프로토콜로 WhaTap API를 래핑하면, 사용자는 자연어 한 줄로 서버 CPU, APM TPS, K8s Pod 상태 등을 조회할 수 있습니다.

### 전략적 가치

| 관점 | 가치 |
| --- | --- |
| **고객 편의** | 대시보드 클릭 없이 자연어로 데이터 조회 — 진입 장벽 대폭 감소 |
| **플랫폼 점착도** | WhaTap 데이터에 대한 AI 접근성 → 사용자 lock-in 강화 |
| **개발자 커뮤니티** | 오픈소스 공개 → GitHub 노출, npm 생태계 진입 |
| **경쟁 선점** | 주요 APM 벤더 중 MCP 서버를 공식 제공하는 곳이 아직 드뭄 |
| **글로벌 확장** | 영어 기반 AI 어시스턴트 생태계 — 해외 고객 접점 확대 |

---

## 2. 무엇을 할 수 있나

### 지원 AI 클라이언트

| 클라이언트 | 제공사 | 설정 방식 |
| --- | --- | --- |
| Claude Desktop | Anthropic | JSON 설정 파일 |
| Claude Code | Anthropic | CLI 한 줄 명령 |
| Codex CLI | OpenAI | CLI 명령 또는 TOML 설정 |
| Gemini CLI | Google | CLI 명령 또는 JSON 설정 |

### 8개 도구

**Core Tools (프로젝트 관리)**

| 도구 | 설명 | Description |
| --- | --- | --- |
| `whatap_list_projects` | 전체 모니터링 프로젝트 목록 조회 | List all monitoring projects |
| `whatap_project_info` | 특정 프로젝트 상세 정보 | Get project details |
| `whatap_list_agents` | 에이전트/인스턴스 목록 | List agents in a project |

**Data Discovery (데이터 탐색)**

| 도구 | 설명 | Description |
| --- | --- | --- |
| `whatap_data_availability` | 640개 쿼리 카탈로그 탐색 및 라이브 데이터 확인 | Browse 640 queries, probe live data |
| `whatap_describe_mxql` | 쿼리 상세 설명 (파라미터, 필드, MXQL) | Describe query params and fields |
| `whatap_query_mxql` | MXQL 쿼리 실행 및 결과 반환 | Execute query and return results |

**Composite Analysis (복합 분석)**

| 도구 | 설명 | Description |
| --- | --- | --- |
| `whatap_apm_anomaly` | APM 이상 탐지 (TPS, 응답시간, 에러, Active TX) | Multi-query anomaly detection |
| `whatap_service_topology` | 서비스 간 연결 맵 및 병목 탐지 (NPM 필요) | Service topology with bottleneck detection |

### 지원 모니터링 영역

640개 MXQL 쿼리 카탈로그가 내장되어 있으며, 다음 영역을 커버합니다:

| 영역 | 쿼리 수 | 주요 메트릭 |
| --- | --- | --- |
| Server/Infrastructure | 43 | CPU, Memory, Disk, Network, Process, Load |
| APM | 39 | TPS, Response Time, Error, Apdex, Active TX, Heap, GC |
| Kubernetes | 46 | Pod, Node, Container, Event |
| Database | 38 | Session, Wait Event, Replication, Counter |
| AWS CloudWatch | 61 | 각종 AWS 서비스 메트릭 |
| Container (CPM) | 52 | 컨테이너 성능 메트릭 |
| Dashboard | 112 | 대시보드용 집계 쿼리 |
| MongoDB / Redis | 49 | DB별 전용 메트릭 |
| RUM | 20 | Page Load, Resource Timing, AJAX |
| 기타 (NPM, Log, HA 등) | 180+ | 네트워크, 로그, 고가용성 |

### 데모 프롬프트 예시

고객 미팅이나 영업 데모에서 바로 사용할 수 있는 프롬프트:

```
"내 WhaTap 프로젝트 목록 보여줘"
"프로젝트 12345의 최근 1시간 CPU 사용률은?"
"Java APM 프로젝트의 TPS 추이를 보여줘"
"최근 5분간 이상 징후가 있는 에이전트는?"
"Kubernetes Pod 상태 확인해줘"
"서비스 간 네트워크 병목이 있어?"
"프로젝트 12345에서 조회 가능한 데이터가 뭐가 있어?"
```

---

## 3. 설치 및 설정

### 사전 요구사항

- **Node.js 18** 이상 (`node --version`으로 확인)
- **WhaTap 계정** 및 API 토큰

### API 토큰 발급

1. [WhaTap Console](https://service.whatap.io/) 로그인
2. 우측 상단 프로필 아이콘 → **계정 관리**
3. **API 토큰** 섹션에서 토큰 복사

> 이 토큰은 계정 레벨 토큰으로, 해당 계정의 모든 프로젝트에 접근 가능합니다. Read-only 작업만 수행합니다.

### AI 클라이언트별 설정

**Claude Desktop** — `claude_desktop_config.json` 편집:

```json
{
  "mcpServers": {
    "whatap": {
      "command": "npx",
      "args": ["-y", "whatap-mcp"],
      "env": {
        "WHATAP_API_TOKEN": "발급받은_토큰"
      }
    }
  }
}
```

설정 파일 위치:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**Claude Code** — 터미널에서:

```bash
claude mcp add whatap \
  -e WHATAP_API_TOKEN=발급받은_토큰 \
  -- npx -y github:whatap/whatap-open-mcp
```

**Codex CLI** — 터미널에서:

```bash
codex mcp add whatap \
  --env WHATAP_API_TOKEN=발급받은_토큰 \
  -- npx -y github:whatap/whatap-open-mcp
```

**Gemini CLI** — 터미널에서:

```bash
gemini mcp add whatap \
  -e WHATAP_API_TOKEN=발급받은_토큰 \
  -- npx -y github:whatap/whatap-open-mcp
```

### 리전별 API URL

| 환경 | URL | 설정 |
| --- | --- | --- |
| SaaS (기본) | `https://api.whatap.io` | 별도 설정 불필요 |
| Government | `https://api.gov.whatap.io` | `WHATAP_API_URL` 환경변수 설정 |
| On-premises | 고객사 내부 URL | `WHATAP_API_URL` 환경변수 설정 |

> SaaS 환경에서는 서울, 도쿄, 자카르타, 뭄바이, 싱가폴, 캘리포니아, 버지니아, 프랑크푸르트 모든 리전이 동일한 API URL을 사용합니다. 리전별 라우팅은 서버에서 자동 처리됩니다.

---

## 4. 기술 아키텍처

### 시스템 구조

```
사용자
  │  자연어 프롬프트
  ▼
AI 어시스턴트 (Claude / Codex / Gemini)
  │  MCP 프로토콜 (stdio, JSON-RPC 2.0)
  ▼
whatap-mcp 서버 (Node.js)
  ├─ MCP Server (자체 구현, 673줄, 의존성 0)
  ├─ 8개 Tool (project 3 + yard 3 + mesh 2)
  ├─ MXQL Catalog (640 entries, 빌드타임 생성)
  ├─ Semantic Layer (결과 분류, 배지, 필드 가이드)
  │  HTTPS
  ▼
WhaTap Open API (api.whatap.io)
```

### 핵심 설계 결정

| 결정 | 이유 |
| --- | --- |
| **런타임 의존성 0개** | `@modelcontextprotocol/sdk` (137 패키지) 대신 자체 MCP 구현. 설치 속도, 보안 감사 범위 최소화 |
| **MXQL path endpoint** | yard의 .mql 파일을 그대로 활용. 새 쿼리 추가 시 카탈로그만 재생성하면 됨 |
| **2단계 인증** | 계정 토큰 → 프로젝트 토큰 자동 캐싱. 사용자는 계정 토큰 하나만 설정 |
| **시맨틱 분류** | 결과 타입(timeseries/snapshot/ranking 등)을 자동 판별 → AI가 결과를 올바르게 해석 |
| **영어 번역 레이어** | 한국어 .mql 주석 120개를 영어로 번역 → 영어 LLM 호환성 확보 |

### 소스 구조

```
src/
├── index.ts              # 진입점
├── config.ts             # 환경변수 로딩
├── mcp/                  # 자체 MCP 서버 (5파일, 673줄)
│   ├── types.ts          #   JSON-RPC + MCP 타입
│   ├── schema.ts         #   Zod 호환 스키마 빌더
│   ├── transport.ts      #   stdio 전송 계층
│   ├── protocol.ts       #   JSON-RPC 디스패치
│   └── server.ts         #   McpServer 클래스
├── api/
│   ├── client.ts         # HTTP 클라이언트, 인증, 캐싱
│   └── types.ts          # API 타입 정의
├── tools/
│   ├── project.ts        # 프로젝트 도구 3개
│   ├── yard.ts           # MXQL 도구 3개
│   └── mesh.ts           # 복합 분석 도구 2개
├── yard/
│   ├── catalog.ts        # 카탈로그 검색, 퍼지 매칭
│   └── parser.ts         # .mql 파일 파서
├── data/
│   ├── mxql-catalog.ts   # [자동생성] 640개 카탈로그 엔트리
│   └── field-metadata.ts # [자동생성] 131 카테고리, 2,605 필드
└── utils/                # 포맷, 시맨틱, 시간, 필드 가이드 등
```

### 빌드 및 실행

```bash
npm install          # devDependencies 설치
npm run build        # tsup → dist/index.js (ESM)
npm run dev          # 개발 모드 (WHATAP_API_TOKEN 필요)
npm start            # 프로덕션 실행
```

---

## 5. 로드맵

### v1.0 — 현재 (2026-03)

- 8개 도구 (프로젝트 3 + MXQL 3 + 복합분석 2)
- 640개 MXQL 카탈로그 (yard 기반)
- 시맨틱 결과 분류 (timeseries/snapshot/ranking/inventory/events/aggregate)
- 필드 메타데이터 (131 카테고리, 2,605 필드 설명)
- 영어 번역 (120개 쿼리 설명)
- 에이전트 oid → oname 자동 변환
- 런타임 의존성 0개
- LLM 파이프라인 점수: 9.1/10

### v1.1 — 계획

- [ ] npm publish (`npx whatap-mcp`으로 즉시 사용 가능)
- [ ] result-type-aware 포맷터 (timeseries와 ranking 결과를 다르게 포맷)
- [ ] structured_content 지원 (Phase 2)
- [ ] 검색 랭킹 개선

### 향후 고려

- [ ] Streamable HTTP transport (stdio 외 전송 방식)
- [ ] 추가 composite 도구 (인프라 헬스체크, 비용 분석 등)
- [ ] WhaTap 신규 제품군 지원 확대
- [ ] 다국어 쿼리 설명 (일본어 등)

---

## 6. 경쟁사 비교

| 벤더 | MCP 서버 | 오픈소스 | 비고 |
| --- | --- | --- | --- |
| **WhaTap** | **whatap-mcp** | **MIT** | 8도구, 640 쿼리 카탈로그, 제로 의존성 |
| Datadog | 커뮤니티 (비공식) | — | 공식 MCP 서버 없음 (2025.05 기준) |
| Grafana | 커뮤니티 (비공식) | — | 공식 MCP 서버 없음 |
| New Relic | 없음 | — | — |
| Dynatrace | 없음 | — | — |

> 경쟁사 현황은 빠르게 변할 수 있으므로 정기적으로 업데이트가 필요합니다.

---

## 7. 운영 및 유지보수

### 리포지토리 관리

| 리포지토리 | 용도 | 가시성 |
| --- | --- | --- |
| `whatap/whatap-open-mcp` | 공개 배포용 (클린 히스토리) | **Public** |
| `whatap/whatap-open-mcp-aicell` | 내부 백업 (전체 개발 히스토리) | Private |

### 보안 체크리스트

- [ ] API 토큰은 환경변수로만 주입 — 코드, 커밋, 문서에 절대 포함 금지
- [ ] 테스트 실행 결과에 실제 프로젝트명/코드가 포함될 수 있음 — 커밋 전 확인
- [ ] `.gitignore`에 `.env`, 테스트 결과 디렉토리 포함됨
- [ ] 공개 리포에 push 전 `git diff`로 민감 데이터 확인

### 카탈로그 업데이트

yard의 .mql 파일이 변경되면:

```bash
npm run generate-catalog <yard-path>        # MXQL 카탈로그 재생성
npm run generate-field-metadata             # 필드 메타데이터 재생성
npm run build                                # 번들 재빌드
```

### 의존성

| 구분 | 패키지 | 용도 |
| --- | --- | --- |
| **Runtime** | 없음 | — |
| devDependencies | typescript | 타입 체크 |
| devDependencies | tsup | ESM 번들러 |
| devDependencies | tsx | 개발 모드 실행 |
| devDependencies | @types/node | Node.js 타입 |
| devDependencies | yaml | 필드 메타데이터 생성 스크립트용 |

---

## 8. 고객 대응 가이드

### MCP란 무엇인가요?

MCP(Model Context Protocol)는 AI 어시스턴트가 외부 도구를 호출하는 표준 프로토콜입니다. 사용자가 AI에게 "서버 CPU 사용률 보여줘"라고 말하면, AI가 MCP를 통해 WhaTap API를 호출하고 결과를 자연어로 요약합니다.

```
사용자: "최근 5분간 서버 CPU 사용률이 어떻게 되나요?"
    ↓
AI 어시스턴트가 whatap_query_mxql 도구를 자동 호출
    ↓
WhaTap API에서 데이터 조회
    ↓
AI: "3대 서버 중 web-server-01의 CPU가 87%로 가장 높습니다.
     평균 CPU는 62%이며, 권장 범위(70% 이하)를 초과한 서버가 1대 있습니다."
```

### 자주 묻는 질문 (FAQ)

**Q. 어떤 AI 클라이언트를 사용해야 하나요?**
A. Claude Desktop이 가장 접근성이 좋습니다. 개발자라면 Claude Code나 Codex CLI도 추천합니다. 모든 클라이언트에서 동일한 MCP 서버를 사용합니다.

**Q. 어떤 데이터를 조회할 수 있나요?**
A. WhaTap Open API가 지원하는 모든 MXQL 카테고리 — Server, APM, Kubernetes, Database, Log, AWS 등 640개 쿼리가 내장되어 있습니다.

**Q. 데이터 변경이나 설정 변경이 가능한가요?**
A. 아닙니다. 완전한 Read-only입니다. 조회만 가능하며, 프로젝트 생성/삭제, 알림 설정 변경 등은 불가합니다.

**Q. API 토큰이 노출되면 어떻게 되나요?**
A. 계정 토큰이므로 해당 계정의 모든 프로젝트 데이터를 조회할 수 있습니다. 노출 시 즉시 WhaTap Console에서 토큰을 재발급하세요. 단, Read-only이므로 데이터 변경/삭제 위험은 없습니다.

**Q. 데이터가 안 나와요.**
A. 다음을 확인하세요:
1. 프로젝트 타입이 맞는지 (Server 프로젝트에 APM 쿼리를 실행하면 데이터 없음)
2. 에이전트가 활성 상태인지 (`whatap_list_agents`로 확인)
3. 시간 범위가 적절한지 (너무 좁으면 데이터 없을 수 있음)

**Q. 응답이 느려요.**
A. 시간 범위를 줄이세요. `"5m"`(5분)이면 수 초, `"1d"`(1일)이면 수십 초 걸릴 수 있습니다.

**Q. On-premises 환경에서도 사용 가능한가요?**
A. 네. `WHATAP_API_URL` 환경변수에 내부 API URL을 설정하면 됩니다.

### 지원 범위

| 항목 | 지원 여부 |
| --- | --- |
| MCP 서버 설치/설정 | O |
| AI 클라이언트 설정 | O (가이드 제공) |
| 쿼리 결과 해석 | O (도구가 자동 해석 지원) |
| AI 프롬프트 작성 | X (AI 클라이언트 영역) |
| AI 클라이언트 자체 문제 | X (각 벤더에 문의) |

### 에스컬레이션

| 문제 유형 | 담당 |
| --- | --- |
| WhaTap API 오류 (401, 403, 500) | WhaTap 백엔드팀 |
| MCP 서버 버그 | GitHub Issues (`whatap/whatap-open-mcp`) |
| AI 클라이언트 연결 문제 | 각 AI 벤더 (Anthropic, OpenAI, Google) |

---

## 9. 마케팅 소재

### 키 메시지

| 대상 | 메시지 |
| --- | --- |
| **한 줄 요약** | AI 어시스턴트에서 WhaTap 모니터링 데이터를 자연어로 조회 |
| **기술 차별점** | 런타임 의존성 0개, Node.js만 있으면 4단계 설정으로 바로 사용 |
| **데이터 커버리지** | 640개 내장 쿼리 — Server, APM, K8s, DB, Log, AWS 등 35개 도메인 |
| **AI 생태계** | Claude, Codex, Gemini 등 주요 AI 클라이언트 모두 지원 |

### 타겟 키워드

- WhaTap MCP, WhaTap AI, MCP server monitoring
- AI observability, natural language monitoring
- Claude MCP server, monitoring MCP tool

### 블로그/발표 소재 아이디어

1. **"WhaTap + AI: MCP로 모니터링을 자연어로"** — 제품 소개 블로그
2. **"4단계로 AI 모니터링 시작하기"** — 튜토리얼
3. **"640개 쿼리를 AI에게 가르치다"** — MXQL 카탈로그 기술 블로그
4. **"런타임 의존성 0개 MCP 서버 만들기"** — 개발자 기술 블로그

### 다국어 필요

| 언어 | 우선순위 | 용도 |
| --- | --- | --- |
| 한국어 | 높음 | 국내 블로그, 고객 가이드 |
| 영어 | 높음 | README (완료), npm, GitHub, 글로벌 마케팅 |
| 일본어 | 높음 | 최초 요청 고객, 일본 지사 |

---

## 10. 변경 이력

| 날짜 | 내용 |
| --- | --- |
| 2026-03-24 | GitHub 공개 (`whatap/whatap-open-mcp`, MIT) |
| 2026-03-23 | v1.0.0 완성 — 8도구, 시맨틱 분류, 필드 메타데이터, 제로 의존성 |
| 2026-03-18 | 34도구 → 6도구 리팩토링, 640개 카탈로그 도입 |
| 2026-02-27 | 카탈로그 도구 4개 추가, 시나리오 테스트 |
| 2026-02-25 | 최초 구현 및 API 테스트 (30도구) |
