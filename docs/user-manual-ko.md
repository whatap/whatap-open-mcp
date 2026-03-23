# WhaTap MCP Server 사용 설명서

AI 어시스턴트(Claude, Codex, Gemini 등)에서 WhaTap 모니터링 데이터를 자연어로 조회할 수 있는 MCP 서버입니다.

---

## 목차

1. [시작하기 전에](#1-시작하기-전에)
2. [API 토큰 발급](#2-api-토큰-발급)
3. [AI 클라이언트별 설정](#3-ai-클라이언트별-설정)
4. [연결 확인](#4-연결-확인)
5. [사용법](#5-사용법)
6. [제공 도구 목록](#6-제공-도구-목록)
7. [활용 예시](#7-활용-예시)
8. [환경 설정](#8-환경-설정)
9. [문제 해결](#9-문제-해결)
10. [제거 방법](#10-제거-방법)
11. [빠른 참조표](#11-빠른-참조표)

---

## 1. 시작하기 전에

### 필요 사항

| 항목 | 세부 내용 |
|------|-----------|
| **Node.js** | 18.0.0 이상 (`npm`, `npx` 포함) |
| **WhaTap 계정** | [whatap.io](https://www.whatap.io/) 무료 또는 유료 계정 |
| **AI 클라이언트** | Claude Desktop, Claude Code, Codex CLI, Gemini CLI 중 하나 |

### Node.js 설치 확인

터미널에서 아래 명령어를 실행하세요.

```bash
node --version   # v18.x.x 이상이면 OK
npx --version    # 버전이 출력되면 OK
```

버전이 낮거나 설치되어 있지 않으면 아래를 참고하세요.

### Node.js 설치 방법

**macOS**

```bash
brew install node
```

> Homebrew가 없는 경우 https://brew.sh 에서 먼저 설치하거나, https://nodejs.org 에서 직접 다운로드하세요.

**Windows**

```powershell
winget install OpenJS.NodeJS.LTS
```

> 또는 https://nodejs.org 에서 LTS 버전 설치 파일을 다운로드하세요. 설치 후 **터미널을 새로 열어야** 합니다.

**Ubuntu / Debian**

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

> **주의**: `apt install nodejs`로 설치하면 구버전(v12~v16)이 설치됩니다. 반드시 NodeSource를 사용하세요.

**Fedora / RHEL / Amazon Linux**

```bash
sudo dnf install -y nodejs npm
```

**nvm으로 설치 (모든 OS)**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install --lts
```

---

## 2. API 토큰 발급

1. [WhaTap Console](https://service.whatap.io/)에 로그인합니다.
2. 우측 상단 **프로필 아이콘**을 클릭합니다.
3. **계정 관리**를 선택합니다.
4. **API 토큰** 항목에서 토큰을 복사합니다.

> **참고**: 이 토큰은 **계정 레벨 토큰**입니다. 해당 계정에 속한 모든 프로젝트의 데이터를 **조회**할 수 있습니다. 데이터를 변경하거나 삭제하는 기능은 없으므로 안심하고 사용하세요. 단, 토큰은 외부에 노출되지 않도록 관리해 주세요.

---

## 3. AI 클라이언트별 설정

사용하시는 AI 클라이언트에 맞는 섹션을 따라 하세요. 어떤 클라이언트를 선택하든 동일한 MCP 서버를 사용하며, 설정 형식만 다릅니다.

---

### 3-1. Claude Desktop

설정 파일을 열어 아래 내용을 추가합니다.

**설정 파일 위치**

| 운영체제 | 경로 |
|----------|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

**설정 내용**

```json
{
  "mcpServers": {
    "whatap": {
      "command": "npx",
      "args": ["-y", "whatap-mcp"],
      "env": {
        "WHATAP_API_TOKEN": "여기에_토큰_입력"
      }
    }
  }
}
```

> 이미 다른 MCP 서버가 설정되어 있다면, 기존 `"mcpServers"` 안에 `"whatap": { ... }` 블록만 추가하세요.

설정 파일 저장 후 **Claude Desktop을 완전히 종료하고 다시 실행**합니다. (창 닫기가 아닌, 앱 종료)

---

### 3-2. Claude Code (CLI)

터미널에서 아래 명령어를 실행합니다.

```bash
claude mcp add whatap \
  -e WHATAP_API_TOKEN=여기에_토큰_입력 \
  -- npx -y github:whatap/whatap-open-mcp
```

**등록 확인**

```bash
claude mcp list
```

**적용 범위 설정**

```bash
# 모든 프로젝트에서 사용 (user scope)
claude mcp add whatap -s user \
  -e WHATAP_API_TOKEN=여기에_토큰_입력 \
  -- npx -y github:whatap/whatap-open-mcp

# 현재 프로젝트에서만 사용 (project scope, .mcp.json에 저장)
claude mcp add whatap -s project \
  -e WHATAP_API_TOKEN=여기에_토큰_입력 \
  -- npx -y github:whatap/whatap-open-mcp
```

---

### 3-3. Codex CLI (OpenAI)

**방법 A — 명령어로 등록**

```bash
codex mcp add whatap \
  --env WHATAP_API_TOKEN=여기에_토큰_입력 \
  -- npx -y github:whatap/whatap-open-mcp
```

**방법 B — 설정 파일 직접 편집** (`~/.codex/config.toml`)

```toml
[mcp_servers.whatap]
command = "npx"
args = ["-y", "whatap-mcp"]

[mcp_servers.whatap.env]
WHATAP_API_TOKEN = "여기에_토큰_입력"
```

**등록 확인**

```bash
codex mcp list
```

> **참고**: Codex는 JSON이 아닌 TOML 형식을 사용합니다.

---

### 3-4. Gemini CLI (Google)

**방법 A — 명령어로 등록**

```bash
gemini mcp add whatap \
  -e WHATAP_API_TOKEN=여기에_토큰_입력 \
  -- npx -y github:whatap/whatap-open-mcp
```

**방법 B — 설정 파일 직접 편집** (`~/.gemini/settings.json`)

```json
{
  "mcpServers": {
    "whatap": {
      "command": "npx",
      "args": ["-y", "whatap-mcp"],
      "env": {
        "WHATAP_API_TOKEN": "여기에_토큰_입력"
      }
    }
  }
}
```

**등록 확인**

```bash
gemini mcp list
```

**적용 범위**

| 범위 | 파일 위치 | 용도 |
|------|-----------|------|
| 전체 (user) | `~/.gemini/settings.json` | 개인 설정, 모든 프로젝트 |
| 프로젝트 | `.gemini/settings.json` (프로젝트 루트) | 팀 공유용 |

---

## 4. 연결 확인

설정이 끝나면 AI 클라이언트를 열고 아래와 같이 입력해 보세요.

```
내 WhaTap 프로젝트 목록 보여줘
```

프로젝트 코드(pcode), 이름, 플랫폼, 제품 유형이 포함된 목록이 나타나면 연결이 정상입니다.

목록이 나타나지 않으면 [9. 문제 해결](#9-문제-해결)을 참고하세요.

---

## 5. 사용법

### 기본 흐름

WhaTap MCP 서버는 다음 순서로 사용합니다.

```
1단계: 프로젝트 목록 조회  →  프로젝트 코드(pcode) 확인
2단계: 데이터 카탈로그 탐색  →  어떤 데이터를 조회할 수 있는지 확인
3단계: 쿼리 실행             →  원하는 데이터 조회
```

AI 어시스턴트에게 자연어로 질문하면 위 과정을 자동으로 처리합니다. 프로젝트 코드를 모르는 경우 "내 프로젝트 목록 보여줘"부터 시작하세요.

### 자연어 질문 예시

**프로젝트 탐색**

```
내 WhaTap 프로젝트 목록 보여줘
프로젝트 12345의 상세 정보 알려줘
프로젝트 12345에 어떤 에이전트가 있어?
```

**서버 모니터링**

```
최근 1시간 서버 CPU 사용률 보여줘
메모리 사용량이 80% 넘는 서버가 있어?
디스크 사용량 확인해줘
CPU 사용률 높은 순으로 서버 Top 5 보여줘
```

**APM (애플리케이션 성능)**

```
최근 5분간 TPS 추이 보여줘
평균 응답시간이 어떻게 되나?
트랜잭션 에러가 발생했어?
현재 진행 중인 트랜잭션 상태 확인해줘
```

**쿠버네티스**

```
Pod 상태 확인해줘
노드별 CPU, 메모리 사용량 보여줘
최근 클러스터 이벤트 중 Warning이 있어?
```

**데이터베이스**

```
DB 인스턴스 목록 보여줘
현재 활성 세션 확인해줘
```

**이상 탐지**

```
최근 5분간 이상 징후가 있는 에이전트 찾아줘
높은 감도로 1시간 동안 이상 탐지 실행해줘
```

**서비스 토폴로지**

```
서비스 간 연결 관계 보여줘
네트워크 병목 지점이 있어?
```

**복합 질문**

```
아침 헬스체크 해줘.
전체 프로젝트에서 서버 상태 확인하고,
APM 프로젝트에 이상 징후가 있는지 분석해줘.
```

> **팁**: "프로젝트 목록 보여줘"로 시작해서 프로젝트 코드를 먼저 확인하세요. 이후 해당 코드를 사용하면 더 정확한 결과를 얻을 수 있습니다.

---

## 6. 제공 도구 목록

MCP 서버는 총 8개의 도구를 AI 어시스턴트에 제공합니다. 사용자가 직접 도구를 호출할 필요는 없으며, 자연어로 질문하면 AI가 적절한 도구를 자동으로 선택합니다.

### 프로젝트 관리 도구

| 도구 | 기능 |
|------|------|
| `whatap_list_projects` | 전체 모니터링 프로젝트 목록 조회 (pcode, 이름, 플랫폼) |
| `whatap_project_info` | 특정 프로젝트의 상세 정보 조회 |
| `whatap_list_agents` | 프로젝트 내 에이전트(서버/인스턴스) 목록 조회 |

### 데이터 탐색 도구

| 도구 | 기능 |
|------|------|
| `whatap_data_availability` | 640개 MXQL 쿼리 카탈로그 탐색, 라이브 데이터 유무 확인 |
| `whatap_describe_mxql` | 특정 쿼리의 파라미터, 출력 필드, MXQL 내용 확인 |
| `whatap_query_mxql` | MXQL 쿼리 실행 — 결과에 단위, 임계치, 분석 가이드 포함 |

### 복합 분석 도구

| 도구 | 기능 |
|------|------|
| `whatap_apm_anomaly` | APM 이상 탐지 — TPS, 응답시간, 에러, Active TX 4개 쿼리를 동시 실행하여 통계 분석 |
| `whatap_service_topology` | 서비스 간 연결 관계 및 네트워크 병목 탐지 (NPM 에이전트 필요) |

### 도구별 사용 흐름

```
whatap_list_projects        프로젝트 코드 확인
        ↓
whatap_data_availability    조회 가능한 데이터 확인
        ↓
whatap_describe_mxql        쿼리 상세 내용 확인
        ↓
whatap_query_mxql           쿼리 실행 및 결과 확인
```

> 이 흐름은 AI가 자동으로 진행합니다. 사용자는 원하는 내용을 자연어로 질문하기만 하면 됩니다.

---

## 7. 활용 예시

### 예시 1: 아침 서버 점검

```
사용자: 아침 점검 좀 해줘. 서버 CPU, 메모리 상태 요약해줘.

AI: 3대 서버를 확인했습니다.
    - web-01: CPU 45%, Memory 62% (정상)
    - web-02: CPU 87%, Memory 71% (CPU 주의 — 권장 70% 초과)
    - db-01:  CPU 23%, Memory 55% (정상)

    web-02 서버의 CPU가 87%로 높습니다. 프로세스를 확인해 보시겠습니까?
```

### 예시 2: APM 이상 탐지

```
사용자: Java APM 프로젝트에 이상 징후가 있는지 확인해줘.

AI: 5개 에이전트를 분석했습니다.

    이상 징후 발견 (1건):
    - api-server-03: 응답시간 급증 (평균 120ms → 최대 2.3초, +4.2σ)

    나머지 4개 에이전트는 정상 범위입니다.
    api-server-03의 트랜잭션 상세를 확인하시겠습니까?
```

### 예시 3: 장애 대응

```
사용자: 방금 에러 알림이 왔어. 최근 5분간 에러 상황 요약해줘.

AI: 최근 5분간 트랜잭션 에러 현황입니다.

    | 에이전트 | TPS | 에러수 | 에러율 |
    | --- | --- | --- | --- |
    | api-01 | 45.2 | 23 | 10.2% |
    | api-02 | 42.8 | 2 | 0.9% |
    | api-03 | 44.1 | 0 | 0% |

    api-01에서 에러율 10.2%로 이상 수준입니다.
    응답시간 추이와 Active TX도 함께 확인하시겠습니까?
```

### 예시 4: 경영진 보고용 데이터

```
사용자: 이번 주 전체 서비스 응답시간과 에러율 추이를 요약해줘.

AI: 최근 7일간 서비스 현황입니다.

    - 평균 응답시간: 142ms (전주 대비 -8%)
    - 평균 에러율: 0.3% (전주 대비 변동 없음)
    - TPS 평균: 1,240건/초 (전주 대비 +12%)

    전반적으로 양호한 상태이며, TPS 증가에 비해 응답시간이
    오히려 감소하여 성능이 개선된 것으로 판단됩니다.
```

---

## 8. 환경 설정

### 환경 변수

| 변수 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| `WHATAP_API_TOKEN` | O | — | WhaTap 계정 API 토큰 |
| `WHATAP_API_URL` | X | `https://api.whatap.io` | API 엔드포인트 (SaaS 환경에서는 변경 불필요) |

### API 엔드포인트

WhaTap SaaS 환경에서는 모든 리전(서울, 도쿄, 싱가폴, 프랑크푸르트 등)이 동일한 API URL(`https://api.whatap.io`)을 사용합니다. 리전별 라우팅은 서버에서 자동 처리되므로 **별도 설정이 필요 없습니다**.

아래의 경우에만 `WHATAP_API_URL`을 변경하세요.

| 환경 | URL | 비고 |
|------|-----|------|
| SaaS (기본) | `https://api.whatap.io` | 변경 불필요 |
| 공공기관 / 정부망 | `https://api.gov.whatap.io` | `WHATAP_API_URL` 설정 필요 |
| On-premises | 고객사 내부 URL | `WHATAP_API_URL` 설정 필요 |

**공공기관용 설정 예시 (Claude Desktop)**

```json
{
  "mcpServers": {
    "whatap": {
      "command": "npx",
      "args": ["-y", "whatap-mcp"],
      "env": {
        "WHATAP_API_TOKEN": "여기에_토큰_입력",
        "WHATAP_API_URL": "https://api.gov.whatap.io"
      }
    }
  }
}
```

**공공기관용 설정 예시 (Claude Code)**

```bash
claude mcp add whatap \
  -e WHATAP_API_TOKEN=여기에_토큰_입력 \
  -e WHATAP_API_URL=https://api.gov.whatap.io \
  -- npx -y github:whatap/whatap-open-mcp
```

**공공기관용 설정 예시 (Codex CLI)**

```toml
[mcp_servers.whatap]
command = "npx"
args = ["-y", "whatap-mcp"]

[mcp_servers.whatap.env]
WHATAP_API_TOKEN = "여기에_토큰_입력"
WHATAP_API_URL = "https://api.gov.whatap.io"
```

**공공기관용 설정 예시 (Gemini CLI)**

```bash
gemini mcp add whatap \
  -e WHATAP_API_TOKEN=여기에_토큰_입력 \
  -e WHATAP_API_URL=https://api.gov.whatap.io \
  -- npx -y github:whatap/whatap-open-mcp
```

### WhaTap 서비스 리전

프로젝트의 리전은 WhaTap Console에서 프로젝트 생성 시 선택합니다. 리전이 달라도 API URL은 동일합니다.

| 리전 | 위치 | 클라우드 |
|------|------|----------|
| 서울 | 대한민국 | AWS, Azure, 카카오클라우드 |
| 도쿄 | 일본 | AWS, Azure |
| 싱가폴 | 싱가폴 | AWS |
| 자카르타 | 인도네시아 | AWS |
| 뭄바이 | 인도 | AWS |
| 캘리포니아 | 미국 서부 | AWS |
| 버지니아 | 미국 동부 | AWS |
| 프랑크푸르트 | 독일 | AWS |

---

## 9. 문제 해결

### "WHATAP_API_TOKEN environment variable is required"

API 토큰이 설정되지 않았거나, MCP 서버까지 전달되지 않는 경우입니다.

**확인 사항**
- Claude Desktop: `"env"` 블록에 `"WHATAP_API_TOKEN"` 키가 있는지 확인 (`"WHATAP_TOKEN"` 아님)
- Codex CLI: `[mcp_servers.whatap.env]` 섹션이 TOML 파일에 있는지 확인
- Gemini CLI: `"env"` 블록이 settings.json에 있는지 확인
- Claude Code: `claude mcp add` 명령에 `--env` 플래그가 포함되어 있는지 확인

---

### "No API token found for project XXXXX"

계정 토큰은 유효하지만, 해당 프로젝트 코드가 존재하지 않거나 접근 권한이 없는 경우입니다.

**해결 방법**: "내 프로젝트 목록 보여줘"를 실행하여 정확한 프로젝트 코드를 확인하세요.

---

### "npx: command not found"

Node.js가 설치되어 있지 않거나, PATH에 등록되지 않은 경우입니다.

**해결 방법**: Node.js 18 이상을 설치하세요.

```bash
node --version   # v18 이상 확인
npx --version    # 버전 출력 확인
```

---

### MCP 서버가 시작되지 않거나 타임아웃 발생

**해결 방법**: 서버를 직접 실행하여 오류 메시지를 확인하세요.

```bash
WHATAP_API_TOKEN=여기에_토큰_입력 npx -y github:whatap/whatap-open-mcp
```

정상이면 서버가 시작되고 입력을 대기합니다. `Ctrl+C`로 종료하세요. 오류가 출력되면 토큰 또는 Node.js 버전 문제입니다.

---

### Claude Desktop: 도구가 나타나지 않는 경우

1. JSON 파일이 유효한지 확인 (쉼표 누락, 괄호 불일치 등)
2. Claude Desktop을 **완전히 종료 후 재시작** (창 닫기가 아닌 앱 종료)
3. 로그 확인: `~/Library/Logs/Claude/mcp*.log` (macOS)

---

### Codex CLI: 도구가 나타나지 않는 경우

1. `codex mcp list`로 등록 여부 확인
2. `~/.codex/config.toml`이 올바른 TOML 형식인지 확인 (JSON 문법 사용 불가)
3. 삭제 후 재등록: `codex mcp add whatap ...`

---

### Gemini CLI: 도구가 나타나지 않는 경우

1. `gemini mcp list`로 등록 여부 확인
2. `~/.gemini/settings.json`이 올바른 JSON 형식인지 확인
3. 적용 범위 확인: `--scope user`(전체) 또는 `--scope project`(프로젝트)

---

### "WhaTap API error (401)" 또는 "(403)"

API 토큰이 유효하지 않거나 만료된 경우입니다.

**해결 방법**: WhaTap Console → 계정 관리 → API 토큰에서 새 토큰을 발급받으세요.

---

### 응답이 느린 경우

- 조회 시간 범위를 줄이세요. `"5m"`(5분)이면 수 초, `"1d"`(1일)이면 수십 초 걸릴 수 있습니다.
- 연속 요청 시 WhaTap API 속도 제한에 걸릴 수 있습니다. 잠시 후 다시 시도하세요.

---

### 데이터가 조회되지 않는 경우

| 원인 | 확인 방법 |
|------|-----------|
| 프로젝트 타입 불일치 | Server 프로젝트에 APM 쿼리를 실행하면 데이터가 없음 → "이 프로젝트에서 조회 가능한 데이터 보여줘" |
| 에이전트 비활성 | 에이전트가 꺼져 있으면 데이터 수집 안 됨 → "에이전트 목록 보여줘" |
| 시간 범위 너무 좁음 | 짧은 시간에 데이터가 없을 수 있음 → 시간 범위를 넓혀서 재시도 |

---

## 10. 제거 방법

### Claude Desktop

`claude_desktop_config.json`에서 `"whatap"` 블록을 삭제하고 Claude Desktop을 재시작합니다.

### Claude Code

```bash
claude mcp remove whatap
```

### Codex CLI

`~/.codex/config.toml`에서 `[mcp_servers.whatap]` 섹션을 삭제합니다.

### Gemini CLI

```bash
gemini mcp remove whatap
```

또는 `~/.gemini/settings.json`에서 `"whatap"` 블록을 삭제합니다.

### npx 캐시 삭제 (선택)

```bash
npx clear-npx-cache
```

---

## 11. 빠른 참조표

### AI 클라이언트별 설정 요약

| AI 클라이언트 | 설정 형식 | 설정 파일 | 등록 명령어 |
|--------------|----------|-----------|------------|
| **Claude Desktop** | JSON | `claude_desktop_config.json` | 파일 직접 편집 |
| **Claude Code** | — | — | `claude mcp add whatap -e WHATAP_API_TOKEN=... -- npx -y github:whatap/whatap-open-mcp` |
| **Codex CLI** | TOML | `~/.codex/config.toml` | `codex mcp add whatap --env ... -- npx -y github:whatap/whatap-open-mcp` |
| **Gemini CLI** | JSON | `~/.gemini/settings.json` | `gemini mcp add whatap -e ... -- npx -y github:whatap/whatap-open-mcp` |

### 환경 변수 요약

| 변수 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| `WHATAP_API_TOKEN` | O | — | WhaTap 계정 API 토큰 (계정 관리에서 발급) |
| `WHATAP_API_URL` | X | `https://api.whatap.io` | 공공기관/On-prem 환경에서만 변경 |

### 자주 사용하는 질문

| 상황 | 질문 예시 |
|------|-----------|
| 처음 시작할 때 | "내 프로젝트 목록 보여줘" |
| 서버 상태 확인 | "최근 5분간 서버 CPU, 메모리 상태 요약해줘" |
| APM 이상 확인 | "이상 징후가 있는 에이전트 찾아줘" |
| 장애 대응 | "최근 5분간 에러 현황 요약해줘" |
| 데이터 탐색 | "이 프로젝트에서 조회 가능한 데이터가 뭐가 있어?" |
| K8s 점검 | "Pod 상태 확인해줘" |
| 서비스 관계 | "서비스 토폴로지 보여줘" |
