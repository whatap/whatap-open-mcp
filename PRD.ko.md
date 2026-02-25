# PRD: whatap-mcp

## 1. 제품 개요

WhaTap Open API를 MCP(Model Context Protocol)로 래핑하여, AI 어시스턴트에서 모니터링 데이터를 조회할 수 있게 하는 서버.

## 2. 배경 및 동기

일본 고객이 WhaTap 모니터링 데이터를 MCP를 통해 AI에서 요약하고 싶다는 요청을 함. WhaTap Open API는 이미 존재하나, AI 어시스턴트가 직접 호출할 수 있는 인터페이스가 없었음. MCP 프로토콜로 연결하는 서버를 개발하여 해결.

## 3. 목표 사용자

- WhaTap을 사용 중인 DevOps, SRE, 개발자
- AI 어시스턴트(Claude Desktop, Claude Code 등)로 모니터링 데이터를 자연어로 조회하려는 사람

## 4. 제품 범위

**하는 것:**
- WhaTap Open API의 Read-only 래퍼
- 기존 SaaS에서 제공하는 데이터를 MCP 도구(tool)로 노출

**하지 않는 것:**
- WhaTap 설정 변경, 프로젝트 생성/삭제 등 쓰기 작업
- WhaTap에 없는 새로운 기능 추가
- 독자적인 데이터 저장이나 분석

## 5. 핵심 사용 시나리오

1. "서버 CPU 사용률이 어떻게 되나요?" → `whatap_server_cpu` 호출 → 결과를 자연어로 요약
2. "최근 1시간 에러가 많은 트랜잭션은?" → `whatap_apm_error` 호출 → 마크다운 테이블 반환
3. "error 키워드가 포함된 로그 검색" → `whatap_log_search` 호출 → 매칭 로그 반환
4. "Kubernetes Pod 상태 확인" → `whatap_k8s_pod_status` 호출 → Pod 목록과 상태 반환
5. "DB 활성 세션에서 느린 쿼리 확인" → `whatap_db_active_sessions` 호출 → 세션 목록 반환

## 6. 기능 범위

### v1.0 (현재)

30개 도구, 8개 카테고리:

| 카테고리 | 도구 수 | 도구 목록 |
|----------|---------|-----------|
| 프로젝트 관리 | 3 | list_projects, project_info, list_agents |
| 서버/인프라 | 7 | server_cpu, server_memory, server_disk, server_network, server_process, server_cpu_load, server_top |
| APM | 6 | apm_tps, apm_response_time, apm_error, apm_apdex, apm_active_transactions, apm_transaction_stats |
| Kubernetes | 6 | k8s_node_list, k8s_node_cpu, k8s_node_memory, k8s_pod_status, k8s_container_top, k8s_events |
| Database | 4 | db_instance_list, db_stat, db_active_sessions, db_wait_analysis |
| 로그 | 2 | log_search, log_stats |
| 알림 | 1 | alerts |
| 고급(MXQL) | 1 | mxql_query |

### v1.1 이후

TBD.

## 7. 기술 아키텍처

```
AI 어시스턴트 (Claude Desktop / Claude Code)
    │
    │  stdio (JSON-RPC)
    ▼
whatap-mcp 서버 (Node.js)
    │
    │  ┌─ MCP Server (@modelcontextprotocol/sdk)
    │  │   └─ 30개 도구 (Zod 파라미터 검증)
    │  │
    │  ├─ MXQL 쿼리 빌더 (23개 함수)
    │  │
    │  └─ API 클라이언트
    │      ├─ 2단계 인증 (계정 토큰 → 프로젝트 토큰)
    │      └─ 프로젝트 토큰 캐싱 (Map)
    │
    │  HTTPS
    ▼
WhaTap Open API (api.whatap.io)
```

**주요 기술 스택:**
- Runtime: Node.js 18+
- Language: TypeScript (ESM)
- Transport: stdio (JSON-RPC)
- SDK: `@modelcontextprotocol/sdk` ^1.12.0
- Validation: Zod ^3.23.0
- Build: tsup
- License: MIT

**데이터 조회 방식:**
- 대부분의 도구는 MXQL(WhaTap 내부 쿼리 언어)을 사용하여 `POST /open/api/flush/mxql/text`로 데이터 조회
- 프로젝트 목록, 에이전트 목록 등 일부는 REST API 직접 호출

**인증 모델:**
1. 환경변수 `WHATAP_API_TOKEN`에 계정 토큰 설정
2. 계정 토큰으로 프로젝트 목록 조회 시 각 프로젝트의 API 토큰 획득
3. 프로젝트 토큰을 `Map<pcode, token>`에 캐싱
4. 이후 프로젝트별 API 호출 시 캐싱된 토큰 사용

## 8. 비기능 요구사항

**보안:**
- Read-only. 모든 API 호출은 조회만 수행
- API 토큰은 환경변수로만 주입. 코드에 하드코딩하지 않음
- 프로젝트 토큰은 메모리 캐시에만 보관. 디스크에 저장하지 않음

**호환성:**
- Node.js 18.0.0 이상
- MCP 프로토콜 지원 AI 어시스턴트 (Claude Desktop, Claude Code 등)
- WhaTap SaaS 환경 (`api.whatap.io` 기본, 환경변수로 변경 가능)

**응답:**
- API 요청 타임아웃 30초
- 결과는 마크다운 테이블로 포맷팅하여 반환

## 9. 출시 계획

| 단계 | 내용 | 상태 |
|------|------|------|
| 개발 완료 | 30개 도구 구현 및 실 API 테스트 | 완료 |
| npm 배포 | `whatap-mcp` 패키지 npm 공개 | 미완 |
| GitHub 공개 | 소스 코드 공개 저장소 | 미완 |

## 10. 리스크

| 리스크 | 설명 | 대응 |
|--------|------|------|
| MXQL 문서 부족 | WhaTap MXQL은 공식 문서가 제한적. 카테고리, 필드명은 실 API 테스트로 검증함 | 실 API 테스트 기반 개발. 검증된 쿼리를 빌더 함수로 고정 |
| 카테고리 가용성 | MXQL 카테고리는 프로젝트 타입(Server, APM, K8s, DB)에 따라 사용 가능 여부가 다름 | 도구별로 해당 프로젝트 타입이 필요함을 문서화 |
| API 변경 | WhaTap Open API가 변경되면 도구가 동작하지 않을 수 있음 | 버전 고정, 정기적 동작 확인 필요 |

## 11. 부록: 도구 카탈로그 요약

| 도구 | 카테고리 | MXQL Category | 설명 |
|------|----------|---------------|------|
| `whatap_list_projects` | 프로젝트 | — | 프로젝트 목록 조회 |
| `whatap_project_info` | 프로젝트 | — | 프로젝트 상세 정보 |
| `whatap_list_agents` | 프로젝트 | — | 에이전트(서버/인스턴스) 목록 |
| `whatap_server_cpu` | 서버 | `server_base` | 서버별 CPU 사용률 |
| `whatap_server_memory` | 서버 | `server_base` | 서버별 메모리 사용률 |
| `whatap_server_disk` | 서버 | `server_disk` | 디스크 I/O 및 사용량 |
| `whatap_server_network` | 서버 | `server_network` | 네트워크 I/O |
| `whatap_server_process` | 서버 | `server_process` | 프로세스별 CPU/메모리 |
| `whatap_server_cpu_load` | 서버 | `server_base` | CPU 로드 평균 (1/5/15분) |
| `whatap_server_top` | 서버 | `server_base` / `server_disk` | 메트릭 기준 Top-N 서버 |
| `whatap_apm_tps` | APM | `app_counter` | 초당 트랜잭션 수 |
| `whatap_apm_response_time` | APM | `app_counter` | 서비스 응답 시간 |
| `whatap_apm_error` | APM | `app_counter` | 트랜잭션 에러 수/비율 |
| `whatap_apm_apdex` | APM | `app_counter` | APDEX 만족도 점수 |
| `whatap_apm_active_transactions` | APM | `app_active_stat` | 진행 중 트랜잭션 스냅샷 |
| `whatap_apm_transaction_stats` | APM | `app_counter` | 트랜잭션 통계 |
| `whatap_k8s_node_list` | Kubernetes | `server_base` | 노드 목록 및 리소스 개요 |
| `whatap_k8s_node_cpu` | Kubernetes | `server_base` | 노드 CPU 사용률 |
| `whatap_k8s_node_memory` | Kubernetes | `server_base` | 노드 메모리 사용률 |
| `whatap_k8s_pod_status` | Kubernetes | `kube_pod_stat` | Pod 상태 및 통계 |
| `whatap_k8s_container_top` | Kubernetes | `kube_container_stat` | 컨테이너 Top (CPU/메모리) |
| `whatap_k8s_events` | Kubernetes | `kube_event` | Kubernetes 이벤트 |
| `whatap_db_instance_list` | Database | — | DB 인스턴스 목록 |
| `whatap_db_stat` | Database | `db_counter` | DB 성능 통계 |
| `whatap_db_active_sessions` | Database | `db_active_session` | 활성 세션 및 SQL |
| `whatap_db_wait_analysis` | Database | `db_wait_event` | 대기 이벤트 분석 (Oracle) |
| `whatap_log_search` | 로그 | `app_log` | 키워드 기반 로그 검색 |
| `whatap_log_stats` | 로그 | `app_log_count` | 로그 볼륨 통계 |
| `whatap_alerts` | 알림 | `event` / `kube_event` | 알림 이벤트 조회 |
| `whatap_mxql_query` | 고급 | 사용자 지정 | 원시 MXQL 쿼리 실행 |
