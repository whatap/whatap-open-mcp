# whatap-mcp Performance Test Report

> Generated: 2026-02-27T06:45:46.266Z
> Tool count: 34
> Total duration: 1.7s

## Executive Summary

| Metric | Value |
| --- | --- |
| Total tool calls | 21 |
| Success rate | 100.0% (21/21) |
| Has-data rate | 81.0% (17/21) |
| Next-steps rate | 95.2% (20/21) |
| Avg latency | 52ms |
| P90 latency | 106ms |
| P99 latency | 301ms |
| Scenarios run | 3/3 |

## Scenario A: DevOps/SRE — Server Infrastructure Health Check

- **Persona**: Operations engineer checking server fleet health
- **Project type**: SERVER
- **Project**: Server Inventory Monitoring Demo (GPU) (pcode: 29763)
- **Selection**: 24 candidates found, 2 probed

| # | Tool | Latency | Success | Data | Next Steps | Size |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `whatap_list_projects` | 122ms | Yes | Yes | Yes | 8203 |
| 2 | `whatap_check_availability` | 301ms | Yes | Yes | Yes | 834 |
| 3 | `whatap_server_cpu` | 37ms | Yes | Yes | Yes | 6927 |
| 4 | `whatap_server_memory` | 24ms | Yes | Yes | Yes | 7370 |
| 5 | `whatap_server_top` | 44ms | Yes | Yes | Yes | 555 |
| 6 | `whatap_server_cpu_load` | 41ms | Yes | Yes | Yes | 5989 |
| 7 | `whatap_alerts` | 46ms | Yes | No | No | 319 |

**Scenario totals**: 7/7 success, 6/7 next-steps, avg 88ms, p90 301ms

### Full Interaction Log

#### Step 1: `whatap_list_projects`

**User Question:** "Show me all my monitoring projects."

**Request:**
```json
{
  "name": "whatap_list_projects",
  "arguments": {}
}
```

**Response** (122ms, success):
<details><summary>8203 chars</summary>

```
## Projects (123 total)

- **PHP-demo-infra** (pcode: 3413) - INFRA / SMS [subscribe]
- **Java APM Demo** (pcode: 5490) - JAVA / APM [subscribe]
- **Node.js APM Demo** (pcode: 6969) - NODEJS / APM [subscribe]
- **PHP APM Demo(Old)** (pcode: 7197) - PHP / APM [subscribe]
- **인트그레이션 프로젝트 데모** (pcode: 25959) - VR / VR [subscribe]
- **Browser Monitoring Demo** (pcode: 27506) - RUM / BROWSER [subscribe]
- **DEV4-CLOUDWATCH** (pcode: 28302) - VR / VR [subscribe]
- **PostgreSQL Monitoring Demo** (pcode: 28458) - POSTGRESQL / DB [subscribe]
- **Python APM Demo** (pcode: 29744) - PYTHON / APM [subscribe]
- **MySQL Monitoring Demo** (pcode: 29762) - MYSQL / DB [subscribe]
- **Server Inventory Monitoring Demo (GPU)** (pcode: 29763) - INFRA / SMS [subscribe]
- **JPetStore_SERVER** (pcode: 29767) - INFRA / SMS [subscribe]
- **JPetStore_JAVA** (pcode: 29770) - JAVA / APM [subscribe]
- **JPetStore_BROWSER** (pcode: 29773) - RUM / BROWSER [subscribe]
- **JPetStore_MYSQL** (pcode: 29779) - MYSQL / DB [subscribe]
- **JPetStore_NODEJS** (pcode: 29843) - NODEJS / APM [subscribe]
- **MS SQL Server Monitoring Demo** (pcode: 30099) - MSSQL / DB [subscribe]
- **Kubernetes Monitoring Demo(Old)** (pcode: 30793) - KUBERNETES / CPM [limited]
- **ECS Monitoring Demo** (pcode: 30899) - VR / VR [subscribe]
- **mysql-V2-test** (pcode: 30910) - MYSQL / DB [subscribe]
- **Amazon CloudWatch Monitoring Demo** (pcode: 31027) - VR / VR [subscribe]
- **Go APM Demo** (pcode: 31130) - GO / APM [subscribe]
- **PHP APM Demo** (pcode: 31324) - PHP / APM [subscribe]
- **Demo** (pcode: 31330) - URLCHECK_ADMIN / WPM [trial]
- **URL Monitoring Demo** (pcode: 31336) - URLCHECK / WPM [subscribe]
- **ecs_삭제예정** (pcode: 32340) - VR / VR [subscribe]
- **Network Monitoring NPM DEMO** (pcode: 32496) - NPM / NETWORK [subscribe]
- **virtual-main** (pcode: 32932) - KUBE_NS / CPM [subscribe]
- **test1** (pcode: 33178) - KUBERNETES / CPM [pending]
- **Kubernetes Monitoring Demo(EKS)** (pcode: 33194) - KUBERNETES / CPM [subscribe]
- **K8s Namespace Project DEMO** (pcode: 33298) - KUBE_NS / CPM [subscribe]
- **Node.js APM Mtrace Demo** (pcode: 34168) - NODEJS / APM [subscribe]
- **Java APM Mtrace Demo** (pcode: 34187) - JAVA / APM [subscribe]
- **PHP APM Mtrace Demo** (pcode: 34236) - PHP / APM [subscribe]
- **AWS-Seoul-Npm-testing** (pcode: 34450) - NPM / NETWORK [subscribe]
- **mysql-v2test** (pcode: 34603) - MYSQL / DB [subscribe]
- **Oracle Monitoring Demo - hjkang** (pcode: 34691) - ORACLE / DB [subscribe]
- **.NET APM Demo** (pcode: 34786) - DOTNET / APM [subscribe]
- **testTestTest** (pcode: 35064) - INFRA / SMS [subscribe]
- **kt-master-node-test** (pcode: 35195) - INFRA / SMS [subscribe]
- **naver-cloud-test** (pcode: 35608) - VR / VR [subscribe]
- **oracle-test** (pcode: 35609) - VR / VR [subscribe]
- **azure-test** (pcode: 35610) - VR / VR [subscribe]
- **aws-test** (pcode: 35611) - VR / VR [subscribe]
- **aws-cloudwatch-test** (pcode: 35612) - VR / VR [subscribe]
- **OpenTelemetry Monitoring Demo** (pcode: 35917) - PHP / APM [subscribe]
- **test** (pcode: 36621) - GO / APM [subscribe]
- **Redis Monitoring Demo** (pcode: 37373) - REDIS / DB [subscribe]
- **Mongodb Monitoring Demo** (pcode: 37374) - MONGODB / DB [subscribe]
- **whatap_oracle** (pcode: 37551) - ORACLE / DB [pending]
- **Petclinic & Event Application** (pcode: 37794) - KUBERNETES / CPM [subscribe]
- **Petclinic Browser** (pcode: 38129) - RUM / BROWSER [subscribe]
- **Petclinic - Oracle** (pcode: 38380) - ORACLE_DMA / DB [subscribe]
- **Oracle Pro Monitoring Demo** (pcode: 38833) - ORACLE_DMA / DB [subscribe]
- **Petclinic Server** (pcode: 39149) - INFRA / SMS [subscribe]
- **Petclinic-Mysql** (pcode: 39155) - MYSQL / DB [subscribe]
- **petclinic-Mysql-apm** (pcode: 39251) - JAVA / APM [subscribe]
- **KAFKA Monitoring Demo** (pcode: 39818) - INFRA / SMS [subscribe]
- **Petclinic Kafka** (pcode: 39903) - INFRA / SMS [subscribe]
- **Aerospike Monitoring Demo** (pcode: 40486) - INFRA / SMS [subscribe]
- **Apache Pulsar Monitoring Demo** (pcode: 40492) - INFRA / SMS [subscribe]
- **Node.js 로그 샘플** (pcode: 40546) - NODEJS / APM [subscribe]
- **petclinic-Postgresql-apm** (pcode: 40824) - JAVA / APM [subscribe]
- **Tibero Monitoing Demo** (pcode: 40977) - TIBERO / DB [subscribe]
- **VMware vCenter Demo** (pcode: 41377) - INFRA / SMS [subscribe]
- **Petclinic-Postgresql** (pcode: 41442) - POSTGRESQL / DB [subscribe]
- **Nginx Monitoring Demo** (pcode: 41580) - INFRA / SMS [subscribe]
- **Apache Web Server Monitoring Demo** (pcode: 41660) - INFRA / SMS [subscribe]
- **뉴발란스 Redis** (pcode: 41739) - REDIS / DB [subscribe]
- **petclinic-Oracle-apm** (pcode: 41856) - JAVA / APM [subscribe]
- **Azure Monitor Demo** (pcode: 41935) - VR / VR [limited]
- **Naver Cloud Demo** (pcode: 41936) - VR / VR [limited]
- **Oracle Cloud Demo** (pcode: 41937) - VR / VR [limited]
- **aa** (pcode: 41975) - INFRA / SMS [subscribe]
- **eunhaTest** (pcode: 42472) - INFRA / SMS [subscribe]
- **test_m** (pcode: 42617) - NODEJS / APM [subscribe]
- **apm** (pcode: 42660) - JAVA / APM [pending]
- **Oracle Monitoring Demo** (pcode: 42792) - ORACLE / DB [subscribe]
- **Oracle Pro Monitoring Demo** (pcode: 42793) - ORACLE_DMA / DB [subscribe]
- **NHN_K8S** (pcode: 42908) - KUBERNETES / CPM [subscribe]
- **NHN_APM** (pcode: 42909) - JAVA / APM [subscribe]
- **Network Management System NMS DEMO** (pcode: 43207) - NMS / NETWORK [subscribe]
- **TEST-Partner** (pcode: 43505) - JAVA / APM [subscribe]
- **[TEST] SERVER MON WINDOWS 25.02.14** (pcode: 43544) - INFRA / SMS [subscribe]
- **minseo** (pcode: 43625) - KUBERNETES / CPM [subscribe]
- **Install Test** (pcode: 43633) - INFRA / SMS [subscribe]
- **Install Test** (pcode: 43665) - INFRA / SMS [subscribe]
- **test** (pcode: 43694) - JAVA / APM [subscribe]
- **TEST_SAP_ASE** (pcode: 43908) - SAP_ASE / DB [subscribe]
- **WAS_DOWN_TEST** (pcode: 44013) - JAVA / APM [subscribe]
- **demo-shop-kuber** (pcode: 44021) - KUBERNETES / CPM [subscribe]
- **demo-shop-network** (pcode: 44022) - NPM / NETWORK [subscribe]
- **demo-shop-java** (pcode: 44023) - JAVA / APM [subscribe]
- **demo-shop-nodejs** (pcode: 44024) - NODEJS / APM [subscribe]
- **demo-shop-browser** (pcode: 44025) - RUM / BROWSER [subscribe]
- **demo-shop-server** (pcode: 44027) - INFRA / SMS [subscribe]
- **demo-shop-url** (pcode: 44030) - URLCHECK / WPM [subscribe]
- **demo-shop-mysql** (pcode: 44049) - MYSQL / DB [subscribe]
- **demo-shop-oracle pro** (pcode: 44059) - ORACLE_DMA / DB [subscribe]
- **demo_browser_tmp** (pcode: 44221) - RUM / BROWSER [subscribe]
- **Milvus Vector Database Demo** (pcode: 44425) - INFRA / SMS [subscribe]
- **Azure Monitoring** (pcode: 44478) - VR / VR [subscribe]
- **demo-shop-redis** (pcode: 44523) - REDIS / DB [subscribe]
- **demo-shop-kafka** (pcode: 44524) - INFRA / SMS [subscribe]
- **demo-shop-nms** (pcode: 44634) - NMS / NETWORK [limited]
- **demo-shop-vCenter** (pcode: 44635) - INFRA / SMS [subscribe]
- **demo-shop-milvus** (pcode: 44931) - INFRA / SMS [subscribe]
- **demo-shop-postgresql** (pcode: 45038) - POSTGRESQL / DB [limited]
- **test** (pcode: 46070) - DOTNET / APM [subscribe]
- **test** (pcode: 46071) - PYTHON / APM [subscribe]
- **test** (pcode: 46224) - JAVA / APM [pending]
- **test** (pcode: 46434) - INFRA / SMS [subscribe]
- **DB2 Monitoring Demo** (pcode: 47139) - DB2 / DB [subscribe]
- **test_1029** (pcode: 47577) - PYTHON / APM [subscribe]
- **URL_GREEN** (pcode: 47579) - URLCHECK / WPM [subscribe]
- **Blue_URL** (pcode: 47580) - URLCHECK_ADMIN / WPM [pending]
- **zzzsfdsz** (pcode: 47582) - POSTGRESQL / DB [pending]
- **CBP** (pcode: 48210) - URLCHECK / WPM [subscribe]
- **URL Monitoring Demo** (pcode: 48403) - URLCHECK / WPM [subscribe]
- **Kubernetes GPU Monitoring Demo** (pcode: 48603) - KUBERNETES / CPM [subscribe]
- **ㅣㅣㅣㅣㅣㅣㅣㅣㅣㅣㅣㅣㅣㅣㅣ** (pcode: 48679) - AWS_LOG_FORWARDER / VR [pending]
- **test** (pcode: 48788) - ANDROID / MOBILE [limited]
- **Golang - Nasi** (pcode: 48801) - ANDROID / MOBILE [limited]

---
**Next steps:**
- Use a pcode with `whatap_check_availability(projectCode)` to see which data categories have data.
- Or jump to a domain tool: `whatap_server_cpu`, `whatap_apm_tps`, `whatap_k8s_pod_status`, etc.
```

</details>

#### Step 2: `whatap_check_availability`

**User Question:** "Is my server project collecting data right now?"

**Request:**
```json
{
  "name": "whatap_check_availability",
  "arguments": {
    "projectCode": 29763
  }
}
```

**Response** (301ms, success):
<details><summary>834 chars</summary>

```
## Data Availability — Project 29763

| Category | Available | Sample Fields |
| --- | --- | --- |
| server_base | Yes | oid, oname |
| server_disk | Yes | oid, oname |
| server_network | Yes | oid, oname |
| server_process | Yes | oid, oname |
| app_counter | No | - |
| app_active_stat | No | - |
| kube_pod_stat | No | - |
| kube_container_stat | No | - |
| kube_event | No | - |
| db_counter | No | - |
| db_active_session | No | - |
| db_wait_event | No | - |
| app_log | No | Error: WhaTap API error (429) for project 29763: Too Many Requests |
| app_log_count | No | - |
| event | No | - |

**Summary**: 4 of 15 categories have data in the last 5m.

---
**Next steps:**
- Query available categories with `whatap_query_category(projectCode, category, fields, timeRange)`.
- Or use domain-specific tools for available categories.
```

</details>

#### Step 3: `whatap_server_cpu`

**User Question:** "Show me the CPU usage across my server fleet."

**Request:**
```json
{
  "name": "whatap_server_cpu",
  "arguments": {
    "timeRange": "5m",
    "projectCode": 29763
  }
}
```

**Response** (37ms, success):
<details><summary>6927 chars</summary>

```
## Server CPU Usage

| oid | oname | cpu | cpu_usr | cpu_sys | cpu_idle |
| --- | --- | --- | --- | --- | --- |
| -1413588424 | php-official-demo | 4.50 | 2 | 1.70 | 95.50 |
| -846956083 | rum-official-demo | 12.59 | 7.79 | 4.30 | 87.41 |
| -1413588424 | php-official-demo | 4.02 | 1.91 | 1.51 | 95.98 |
| -1187373871 | dotnet-official-demo | 30.33 | 19.05 | 4.68 | 69.67 |
| 663452279 | go-official-demo | 19.96 | 11.08 | 8.46 | 80.04 |
| -780269224 | mysql-official-demo-03 | 36.76 | 14.10 | 3.52 | 63.24 |
| -2142672185 | mysql-official-demo-01 | 100 | 28.83 | 1.11 | 0 |
| -1816982090 | mysql-official-demo-02 | 60.06 | 55.67 | 4.09 | 39.94 |
| 2036022276 | python-demo-attack | 0.70 | 0.20 | 0.40 | 99.30 |
| -1413588424 | php-official-demo | 3.63 | 2.11 | 1.31 | 96.37 |
| -846956083 | rum-official-demo | 3.32 | 2.21 | 0.91 | 96.68 |
| -1187373871 | dotnet-official-demo | 26.96 | 14.94 | 4.56 | 73.04 |
| -1413588424 | php-official-demo | 3.52 | 2.01 | 1.31 | 96.48 |
| 663452279 | go-official-demo | 35.40 | 21.53 | 13.35 | 64.60 |
| -780269224 | mysql-official-demo-03 | 55.40 | 22.91 | 5.60 | 44.60 |
| -1816982090 | mysql-official-demo-02 | 59.65 | 55.42 | 3.92 | 40.35 |
| -2142672185 | mysql-official-demo-01 | 100 | 27.85 | 1.98 | 0 |
| 2036022276 | python-demo-attack | 0.90 | 0.40 | 0.40 | 99.10 |
| -1413588424 | php-official-demo | 3.22 | 1.41 | 1.51 | 96.78 |
| -846956083 | rum-official-demo | 3.38 | 2.26 | 0.92 | 96.62 |
| -1187373871 | dotnet-official-demo | 18.23 | 12.85 | 5.37 | 81.77 |
| -1413588424 | php-official-demo | 3.01 | 1.31 | 1.41 | 96.99 |
| 663452279 | go-official-demo | 20.87 | 10.70 | 9.45 | 79.13 |
| -780269224 | mysql-official-demo-03 | 64.00 | 19.56 | 31.63 | 36.00 |
| -2142672185 | mysql-official-demo-01 | 100 | 27.56 | 2.36 | 0 |
| -1816982090 | mysql-official-demo-02 | 51.76 | 46.69 | 4.76 | 48.24 |
| 2036022276 | python-demo-attack | 0.90 | 0.30 | 0.40 | 99.10 |
| -1413588424 | php-official-demo | 2.77 | 1.23 | 1.03 | 97.23 |
| -846956083 | rum-official-demo | 9.66 | 6.37 | 2.59 | 90.34 |
| -1187373871 | dotnet-official-demo | 26.11 | 13.39 | 4.03 | 73.89 |
| 663452279 | go-official-demo | 21.38 | 10.07 | 10.48 | 78.62 |
| -780269224 | mysql-official-demo-03 | 56.39 | 20.14 | 30.41 | 43.61 |
| -1816982090 | mysql-official-demo-02 | 7.16 | 4.30 | 2.46 | 92.84 |
| -2142672185 | mysql-official-demo-01 | 100 | 27.61 | 2.44 | 0 |
| 2036022276 | python-demo-attack | 0.80 | 0.30 | 0.20 | 99.20 |
| -1413588424 | php-official-demo | 5.36 | 2.08 | 2.18 | 94.64 |
| -846956083 | rum-official-demo | 2.51 | 1.61 | 0.60 | 97.49 |
| -1413588424 | php-official-demo | 4.55 | 1.65 | 2.48 | 95.45 |
| -1187373871 | dotnet-official-demo | 28.21 | 14.67 | 5.54 | 71.79 |
| 663452279 | go-official-demo | 20.52 | 11.19 | 8.50 | 79.48 |
| -780269224 | mysql-official-demo-03 | 62.35 | 17.55 | 35.31 | 37.65 |
| -2142672185 | mysql-official-demo-01 | 100 | 27.57 | 2.41 | 0 |
| -1816982090 | mysql-official-demo-02 | 15.79 | 12.35 | 3.24 | 84.21 |
| 2036022276 | python-demo-attack | 1.00 | 0.20 | 0.50 | 99.00 |
| -1413588424 | php-official-demo | 2.82 | 1.11 | 1.31 | 97.18 |
| -846956083 | rum-official-demo | 4.09 | 2.59 | 1.10 | 95.91 |
| -1413588424 | php-official-demo | 2.91 | 1.21 | 1.41 | 97.09 |
| -1187373871 | dotnet-official-demo | 26.85 | 16.61 | 6.69 | 73.15 |
| 663452279 | go-official-demo | 21.19 | 11.77 | 8.90 | 78.81 |
| -780269224 | mysql-official-demo-03 | 65.61 | 21.66 | 27.82 | 34.39 |
| -1816982090 | mysql-official-demo-02 | 59.63 | 53.55 | 5.66 | 40.37 |
| -2142672185 | mysql-official-demo-01 | 100 | 27.45 | 2.48 | 0 |
| 1906460792 | virtual-java-agent | 87.70 | 58.87 | 27.87 | 12.30 |
| 2036022276 | python-demo-attack | 0.90 | 0.40 | 0.40 | 99.10 |
| -1413588424 | php-official-demo | 5.71 | 3.20 | 2.20 | 94.29 |
| -846956083 | rum-official-demo | 4.22 | 2.81 | 1.00 | 95.78 |
| -1413588424 | php-official-demo | 5.79 | 3.09 | 2.20 | 94.21 |
| -1187373871 | dotnet-official-demo | 28.56 | 14.10 | 6.15 | 71.44 |
| 663452279 | go-official-demo | 21.37 | 10.95 | 9.89 | 78.63 |
| -2142672185 | mysql-official-demo-01 | 100 | 28.56 | 1.43 | 0 |
| -780269224 | mysql-official-demo-03 | 54.65 | 31.72 | 18.59 | 45.35 |
| -1816982090 | mysql-official-demo-02 | 62.50 | 57.23 | 4.65 | 37.50 |
| 1906460792 | virtual-java-agent | 81.50 | 54.72 | 25.62 | 18.50 |
| 2036022276 | python-demo-attack | 0.80 | 0.10 | 0.60 | 99.20 |
| -1413588424 | php-official-demo | 8.28 | 4.79 | 2.99 | 91.72 |
| -846956083 | rum-official-demo | 13.34 | 8.32 | 4.51 | 86.66 |
| -1413588424 | php-official-demo | 8.41 | 5.11 | 3.00 | 91.59 |
| -1187373871 | dotnet-official-demo | 26.78 | 12.53 | 4.41 | 73.22 |
| 663452279 | go-official-demo | 21.16 | 10.94 | 9.18 | 78.84 |
| -780269224 | mysql-official-demo-03 | 54.03 | 5.72 | 7.87 | 45.97 |
| -1816982090 | mysql-official-demo-02 | 60.12 | 55.69 | 4.03 | 39.88 |
| -2142672185 | mysql-official-demo-01 | 100 | 28.95 | 1.07 | 0 |
| 1906460792 | virtual-java-agent | 81.96 | 55.57 | 25.52 | 18.04 |
| 2036022276 | python-demo-attack | 0.72 | 0.31 | 0.41 | 99.28 |
| -1413588424 | php-official-demo | 3.17 | 1.63 | 1.33 | 96.83 |
| -846956083 | rum-official-demo | 4.10 | 2.60 | 1.20 | 95.90 |
| -1187373871 | dotnet-official-demo | 27.55 | 13.08 | 4.76 | 72.45 |
| -1413588424 | php-official-demo | 2.90 | 1.40 | 1.20 | 97.10 |
| 663452279 | go-official-demo | 20.87 | 11.53 | 8.72 | 79.13 |
| -780269224 | mysql-official-demo-03 | 53.42 | 19.32 | 7.34 | 46.58 |
| -2142672185 | mysql-official-demo-01 | 100 | 27.92 | 1.81 | 0 |
| -1816982090 | mysql-official-demo-02 | 59.42 | 54.79 | 4.33 | 40.58 |
| 1906460792 | virtual-java-agent | 81.83 | 53.65 | 27.46 | 18.17 |
| 2036022276 | python-demo-attack | 0.70 | 0.20 | 0.40 | 99.30 |
| -1413588424 | php-official-demo | 3.02 | 1.41 | 1.31 | 96.98 |
| -846956083 | rum-official-demo | 6.94 | 4.93 | 1.71 | 93.06 |
| -1187373871 | dotnet-official-demo | 27.19 | 15.04 | 4.78 | 72.81 |
| 663452279 | go-official-demo | 19.54 | 10.19 | 8.82 | 80.46 |
| -780269224 | mysql-official-demo-03 | 53.96 | 15.95 | 12.14 | 46.04 |
| -1816982090 | mysql-official-demo-02 | 13.50 | 9.76 | 3.12 | 86.50 |
| -2142672185 | mysql-official-demo-01 | 100 | 28.28 | 1.47 | 0 |
| 1906460792 | virtual-java-agent | 85.74 | 57.37 | 27.54 | 14.26 |
| 2036022276 | python-demo-attack | 0.70 | 0.50 | 0.20 | 99.30 |
| -1413588424 | php-official-demo | 7.19 | 3.90 | 2.80 | 92.81 |
| -846956083 | rum-official-demo | 5.71 | 4.31 | 1.10 | 94.29 |
| -1413588424 | php-official-demo | 12.18 | 6.98 | 4.65 | 87.82 |
| -1187373871 | dotnet-official-demo | 26.92 | 12.89 | 5.78 | 73.08 |
| 663452279 | go-official-demo | 21.52 | 11.23 | 9.68 | 78.48 |
| -780269224 | mysql-official-demo-03 | 53.85 | 4.66 | 10.53 | 46.15 |
| -2142672185 | mysql-official-demo-01 | 100 | 25.31 | 4.80 | 0 |

---
**Next steps:**
- Related: `whatap_server_memory`, `whatap_server_cpu_load`, `whatap_server_top(metric='cpu')`.
```

</details>

#### Step 4: `whatap_server_memory`

**User Question:** "How much memory are my servers using?"

**Request:**
```json
{
  "name": "whatap_server_memory",
  "arguments": {
    "timeRange": "5m",
    "projectCode": 29763
  }
}
```

**Response** (24ms, success):
<details><summary>7370 chars</summary>

```
## Server Memory Usage

| oid | oname | memory_pused | memory_used | memory_total |
| --- | --- | --- | --- | --- |
| -1413588424 | php-official-demo | 32.75 | 1326739456 | 4051218432 |
| -846956083 | rum-official-demo | 41.31 | 832385024 | 2014740480 |
| -1413588424 | php-official-demo | 32.79 | 1328267264 | 4051218432 |
| -1187373871 | dotnet-official-demo | 64.17 | 10841067520 | 16894156800 |
| 663452279 | go-official-demo | 14.54 | 1194532864 | 8216150016 |
| -780269224 | mysql-official-demo-03 | 80.08 | 6583488512 | 8221413376 |
| -2142672185 | mysql-official-demo-01 | 94.21 | 7745388544 | 8221409280 |
| -1816982090 | mysql-official-demo-02 | 73.54 | 6014926848 | 8179478528 |
| 2036022276 | python-demo-attack | 30.28 | 586772480 | 1937747968 |
| -1413588424 | php-official-demo | 32.82 | 1329524736 | 4051218432 |
| -846956083 | rum-official-demo | 42.47 | 855715840 | 2014740480 |
| -1187373871 | dotnet-official-demo | 64.12 | 10832367616 | 16894156800 |
| -1413588424 | php-official-demo | 32.82 | 1329512448 | 4051218432 |
| 663452279 | go-official-demo | 14.65 | 1203859456 | 8216150016 |
| -780269224 | mysql-official-demo-03 | 80.59 | 6625492992 | 8221413376 |
| -1816982090 | mysql-official-demo-02 | 73.39 | 6002659328 | 8179478528 |
| -2142672185 | mysql-official-demo-01 | 94.25 | 7748464640 | 8221409280 |
| 2036022276 | python-demo-attack | 30.28 | 586772480 | 1937747968 |
| -1413588424 | php-official-demo | 32.82 | 1329479680 | 4051218432 |
| -846956083 | rum-official-demo | 42.47 | 855715840 | 2014740480 |
| -1187373871 | dotnet-official-demo | 64.10 | 10829021184 | 16894156800 |
| -1413588424 | php-official-demo | 32.82 | 1329479680 | 4051218432 |
| 663452279 | go-official-demo | 14.65 | 1203814400 | 8216150016 |
| -780269224 | mysql-official-demo-03 | 80.69 | 6633762816 | 8221413376 |
| -2142672185 | mysql-official-demo-01 | 94.99 | 7809277952 | 8221409280 |
| -1816982090 | mysql-official-demo-02 | 73.80 | 6036361216 | 8179478528 |
| 2036022276 | python-demo-attack | 30.28 | 586772480 | 1937747968 |
| -1413588424 | php-official-demo | 32.54 | 1318404096 | 4051218432 |
| -846956083 | rum-official-demo | 42.52 | 856584192 | 2014740480 |
| -1187373871 | dotnet-official-demo | 64.15 | 10838351872 | 16894156800 |
| 663452279 | go-official-demo | 14.65 | 1203810304 | 8216150016 |
| -780269224 | mysql-official-demo-03 | 80.55 | 6622564352 | 8221413376 |
| -1816982090 | mysql-official-demo-02 | 73.56 | 6016827392 | 8179478528 |
| -2142672185 | mysql-official-demo-01 | 96.14 | 7904198656 | 8221409280 |
| 2036022276 | python-demo-attack | 30.28 | 586772480 | 1937747968 |
| -1413588424 | php-official-demo | 32.73 | 1326092288 | 4051218432 |
| -846956083 | rum-official-demo | 42.63 | 858943488 | 2014740480 |
| -1413588424 | php-official-demo | 32.73 | 1326088192 | 4051218432 |
| -1187373871 | dotnet-official-demo | 64.18 | 10842234880 | 16894156800 |
| 663452279 | go-official-demo | 14.65 | 1203802112 | 8216150016 |
| -780269224 | mysql-official-demo-03 | 80.31 | 6602895360 | 8221413376 |
| -2142672185 | mysql-official-demo-01 | 97.73 | 8034447360 | 8221409280 |
| -1816982090 | mysql-official-demo-02 | 73.57 | 6017949696 | 8179478528 |
| 2036022276 | python-demo-attack | 30.28 | 586772480 | 1937747968 |
| -1413588424 | php-official-demo | 32.79 | 1328513024 | 4051218432 |
| -846956083 | rum-official-demo | 42.80 | 862240768 | 2014740480 |
| -1413588424 | php-official-demo | 32.79 | 1328496640 | 4051218432 |
| -1187373871 | dotnet-official-demo | 64.19 | 10844975104 | 16894156800 |
| 663452279 | go-official-demo | 14.65 | 1203793920 | 8216150016 |
| -780269224 | mysql-official-demo-03 | 81.45 | 6696267776 | 8221413376 |
| -1816982090 | mysql-official-demo-02 | 73.52 | 6013198336 | 8179478528 |
| -2142672185 | mysql-official-demo-01 | 97.49 | 8015368192 | 8221409280 |
| 1906460792 | virtual-java-agent | 92.28 | 7520440320 | 8149704704 |
| 2036022276 | python-demo-attack | 30.28 | 586772480 | 1937747968 |
| -1413588424 | php-official-demo | 32.79 | 1328467968 | 4051218432 |
| -846956083 | rum-official-demo | 42.64 | 859140096 | 2014740480 |
| -1413588424 | php-official-demo | 32.79 | 1328459776 | 4051218432 |
| -1187373871 | dotnet-official-demo | 64.19 | 10844094464 | 16894156800 |
| 663452279 | go-official-demo | 14.65 | 1203777536 | 8216150016 |
| -2142672185 | mysql-official-demo-01 | 97.54 | 8019521536 | 8221409280 |
| -780269224 | mysql-official-demo-03 | 82.01 | 6742728704 | 8221413376 |
| -1816982090 | mysql-official-demo-02 | 73.46 | 6008582144 | 8179478528 |
| 1906460792 | virtual-java-agent | 92.37 | 7527948288 | 8149704704 |
| 2036022276 | python-demo-attack | 30.28 | 586772480 | 1937747968 |
| -1413588424 | php-official-demo | 32.79 | 1328443392 | 4051218432 |
| -846956083 | rum-official-demo | 41.17 | 829497344 | 2014740480 |
| -1413588424 | php-official-demo | 32.79 | 1328439296 | 4051218432 |
| -1187373871 | dotnet-official-demo | 63.97 | 10807025664 | 16894156800 |
| 663452279 | go-official-demo | 14.65 | 1203769344 | 8216150016 |
| -780269224 | mysql-official-demo-03 | 81.02 | 6661238784 | 8221413376 |
| -1816982090 | mysql-official-demo-02 | 73.39 | 6003224576 | 8179478528 |
| -2142672185 | mysql-official-demo-01 | 97.50 | 8015892480 | 8221409280 |
| 1906460792 | virtual-java-agent | 92.50 | 7538331648 | 8149704704 |
| 2036022276 | python-demo-attack | 30.30 | 587132928 | 1937747968 |
| -1413588424 | php-official-demo | 32.79 | 1328422912 | 4051218432 |
| -846956083 | rum-official-demo | 42.43 | 854876160 | 2014740480 |
| -1187373871 | dotnet-official-demo | 63.92 | 10798469120 | 16894156800 |
| -1413588424 | php-official-demo | 32.79 | 1328418816 | 4051218432 |
| 663452279 | go-official-demo | 14.65 | 1203757056 | 8216150016 |
| -780269224 | mysql-official-demo-03 | 81.93 | 6735802368 | 8221413376 |
| -2142672185 | mysql-official-demo-01 | 97.53 | 8018690048 | 8221409280 |
| -1816982090 | mysql-official-demo-02 | 73.46 | 6008897536 | 8179478528 |
| 1906460792 | virtual-java-agent | 92.40 | 7530594304 | 8149704704 |
| 2036022276 | python-demo-attack | 30.30 | 587132928 | 1937747968 |
| -1413588424 | php-official-demo | 32.53 | 1318014976 | 4051218432 |
| -846956083 | rum-official-demo | 42.52 | 856645632 | 2014740480 |
| -1187373871 | dotnet-official-demo | 63.96 | 10806169600 | 16894156800 |
| 663452279 | go-official-demo | 14.65 | 1203752960 | 8216150016 |
| -780269224 | mysql-official-demo-03 | 80.78 | 6641532928 | 8221413376 |
| -1816982090 | mysql-official-demo-02 | 73.37 | 6001025024 | 8179478528 |
| -2142672185 | mysql-official-demo-01 | 97.48 | 8014536704 | 8221409280 |
| 1906460792 | virtual-java-agent | 92.41 | 7530790912 | 8149704704 |
| 2036022276 | python-demo-attack | 30.30 | 587132928 | 1937747968 |
| -1413588424 | php-official-demo | 32.52 | 1317449728 | 4051218432 |
| -846956083 | rum-official-demo | 42.52 | 856637440 | 2014740480 |
| -1413588424 | php-official-demo | 32.54 | 1318191104 | 4051218432 |
| -1187373871 | dotnet-official-demo | 63.96 | 10806177792 | 16894156800 |
| 663452279 | go-official-demo | 14.65 | 1203724288 | 8216150016 |
| -780269224 | mysql-official-demo-03 | 81.79 | 6724071424 | 8221413376 |
| -2142672185 | mysql-official-demo-01 | 94.29 | 7751815168 | 8221409280 |

---
**Next steps:**
- Related: `whatap_server_cpu`, `whatap_server_process`, `whatap_server_top(metric='memory')`.
```

</details>

#### Step 5: `whatap_server_top`

**User Question:** "Which servers are consuming the most CPU right now?"

**Request:**
```json
{
  "name": "whatap_server_top",
  "arguments": {
    "metric": "cpu",
    "timeRange": "5m",
    "projectCode": 29763
  }
}
```

**Response** (44ms, success):
<details><summary>555 chars</summary>

```
## Top 5 Servers by CPU

| oid | oname | cpu | cpu_usr | cpu_sys | cpu_idle |
| --- | --- | --- | --- | --- | --- |
| -2142672185 | mysql-official-demo-01 | 100 | 28.83 | 1.11 | 0 |
| -2142672185 | mysql-official-demo-01 | 100 | 27.85 | 1.98 | 0 |
| -2142672185 | mysql-official-demo-01 | 100 | 27.56 | 2.36 | 0 |
| -2142672185 | mysql-official-demo-01 | 100 | 27.61 | 2.44 | 0 |
| -2142672185 | mysql-official-demo-01 | 100 | 27.57 | 2.41 | 0 |

---
**Next steps:**
- Drill down: use the oid of a top server with `whatap_server_cpu(oid=...)` for details.
```

</details>

#### Step 6: `whatap_server_cpu_load`

**User Question:** "What's the load average on my servers?"

**Request:**
```json
{
  "name": "whatap_server_cpu_load",
  "arguments": {
    "timeRange": "5m",
    "projectCode": 29763
  }
}
```

**Response** (41ms, success):
<details><summary>5989 chars</summary>

```
## Server CPU Load Averages

| oid | oname | cpu_load1 | cpu_load5 | cpu_load15 |
| --- | --- | --- | --- | --- |
| -1413588424 | php-official-demo | 0.19 | 0.13 | 0.10 |
| -846956083 | rum-official-demo | 0.23 | 0.13 | 0.14 |
| -1413588424 | php-official-demo | 0.18 | 0.13 | 0.10 |
| -1187373871 | dotnet-official-demo | - | - | - |
| 663452279 | go-official-demo | 0.95 | 1.12 | 1.02 |
| -780269224 | mysql-official-demo-03 | 0.30 | 0.15 | 0.10 |
| -2142672185 | mysql-official-demo-01 | 6.60 | 7.82 | 8.41 |
| -1816982090 | mysql-official-demo-02 | 0.77 | 0.90 | 1.76 |
| 2036022276 | python-demo-attack | 0.11 | 0.03 | 0.01 |
| -1413588424 | php-official-demo | 0.18 | 0.13 | 0.10 |
| -846956083 | rum-official-demo | 0.21 | 0.13 | 0.14 |
| -1187373871 | dotnet-official-demo | - | - | - |
| -1413588424 | php-official-demo | 0.16 | 0.13 | 0.10 |
| 663452279 | go-official-demo | 0.87 | 1.10 | 1.01 |
| -780269224 | mysql-official-demo-03 | 0.44 | 0.18 | 0.11 |
| -1816982090 | mysql-official-demo-02 | 0.79 | 0.90 | 1.76 |
| -2142672185 | mysql-official-demo-01 | 7.12 | 7.91 | 8.44 |
| 2036022276 | python-demo-attack | 0.10 | 0.03 | 0.01 |
| -1413588424 | php-official-demo | 0.16 | 0.13 | 0.10 |
| -846956083 | rum-official-demo | 0.19 | 0.12 | 0.13 |
| -1187373871 | dotnet-official-demo | - | - | - |
| -1413588424 | php-official-demo | 0.15 | 0.13 | 0.10 |
| 663452279 | go-official-demo | 0.80 | 1.08 | 1.01 |
| -780269224 | mysql-official-demo-03 | 0.48 | 0.20 | 0.12 |
| -2142672185 | mysql-official-demo-01 | 7.59 | 7.99 | 8.46 |
| -1816982090 | mysql-official-demo-02 | 0.81 | 0.91 | 1.75 |
| 2036022276 | python-demo-attack | 0.18 | 0.05 | 0.01 |
| -1413588424 | php-official-demo | 0.15 | 0.13 | 0.10 |
| -846956083 | rum-official-demo | 0.34 | 0.15 | 0.14 |
| -1187373871 | dotnet-official-demo | - | - | - |
| 663452279 | go-official-demo | 0.74 | 1.06 | 1.00 |
| -780269224 | mysql-official-demo-03 | 0.53 | 0.21 | 0.12 |
| -1816982090 | mysql-official-demo-02 | 0.74 | 0.89 | 1.74 |
| -2142672185 | mysql-official-demo-01 | 7.38 | 7.94 | 8.44 |
| 2036022276 | python-demo-attack | 0.16 | 0.04 | 0.01 |
| -1413588424 | php-official-demo | 0.14 | 0.13 | 0.09 |
| -846956083 | rum-official-demo | 0.31 | 0.15 | 0.14 |
| -1413588424 | php-official-demo | 0.13 | 0.12 | 0.09 |
| -1187373871 | dotnet-official-demo | - | - | - |
| 663452279 | go-official-demo | 0.84 | 1.08 | 1.01 |
| -780269224 | mysql-official-demo-03 | 0.56 | 0.22 | 0.13 |
| -2142672185 | mysql-official-demo-01 | 7.19 | 7.90 | 8.42 |
| -1816982090 | mysql-official-demo-02 | 0.68 | 0.88 | 1.73 |
| 2036022276 | python-demo-attack | 0.15 | 0.04 | 0.01 |
| -1413588424 | php-official-demo | 0.13 | 0.12 | 0.09 |
| -846956083 | rum-official-demo | 0.28 | 0.15 | 0.14 |
| -1413588424 | php-official-demo | 0.12 | 0.12 | 0.09 |
| -1187373871 | dotnet-official-demo | - | - | - |
| 663452279 | go-official-demo | 0.85 | 1.08 | 1.01 |
| -780269224 | mysql-official-demo-03 | 0.60 | 0.24 | 0.13 |
| -1816982090 | mysql-official-demo-02 | 0.71 | 0.88 | 1.73 |
| -2142672185 | mysql-official-demo-01 | 7.17 | 7.88 | 8.42 |
| 1906460792 | virtual-java-agent | 50.51 | 51.60 | 51.50 |
| 2036022276 | python-demo-attack | 0.14 | 0.04 | 0.01 |
| -1413588424 | php-official-demo | 0.12 | 0.12 | 0.09 |
| -846956083 | rum-official-demo | 0.26 | 0.15 | 0.14 |
| -1413588424 | php-official-demo | 0.11 | 0.12 | 0.09 |
| -1187373871 | dotnet-official-demo | - | - | - |
| 663452279 | go-official-demo | 0.78 | 1.06 | 1.00 |
| -2142672185 | mysql-official-demo-01 | 7.16 | 7.87 | 8.41 |
| -780269224 | mysql-official-demo-03 | 0.63 | 0.25 | 0.14 |
| -1816982090 | mysql-official-demo-02 | 0.73 | 0.88 | 1.73 |
| 1906460792 | virtual-java-agent | 50.51 | 51.60 | 51.50 |
| 2036022276 | python-demo-attack | 0.13 | 0.04 | 0.01 |
| -1413588424 | php-official-demo | 0.11 | 0.12 | 0.09 |
| -846956083 | rum-official-demo | 0.24 | 0.14 | 0.14 |
| -1413588424 | php-official-demo | 0.10 | 0.12 | 0.09 |
| -1187373871 | dotnet-official-demo | - | - | - |
| 663452279 | go-official-demo | 0.72 | 1.04 | 1.00 |
| -780269224 | mysql-official-demo-03 | 0.66 | 0.26 | 0.14 |
| -1816982090 | mysql-official-demo-02 | 0.75 | 0.88 | 1.72 |
| -2142672185 | mysql-official-demo-01 | 6.91 | 7.80 | 8.38 |
| 1906460792 | virtual-java-agent | 51.27 | 51.74 | 51.55 |
| 2036022276 | python-demo-attack | 0.11 | 0.04 | 0.01 |
| -1413588424 | php-official-demo | 0.10 | 0.12 | 0.09 |
| -846956083 | rum-official-demo | 0.22 | 0.14 | 0.14 |
| -1187373871 | dotnet-official-demo | - | - | - |
| -1413588424 | php-official-demo | 0.09 | 0.11 | 0.09 |
| 663452279 | go-official-demo | 0.66 | 1.02 | 0.99 |
| -780269224 | mysql-official-demo-03 | 0.69 | 0.27 | 0.15 |
| -2142672185 | mysql-official-demo-01 | 6.67 | 7.74 | 8.36 |
| -1816982090 | mysql-official-demo-02 | 0.77 | 0.89 | 1.72 |
| 1906460792 | virtual-java-agent | 56.21 | 52.75 | 51.88 |
| 2036022276 | python-demo-attack | 0.11 | 0.04 | 0.01 |
| -1413588424 | php-official-demo | 0.09 | 0.11 | 0.09 |
| -846956083 | rum-official-demo | 0.20 | 0.14 | 0.14 |
| -1187373871 | dotnet-official-demo | - | - | - |
| 663452279 | go-official-demo | 0.61 | 1.01 | 0.99 |
| -780269224 | mysql-official-demo-03 | 0.71 | 0.29 | 0.15 |
| -1816982090 | mysql-official-demo-02 | 0.71 | 0.87 | 1.71 |
| -2142672185 | mysql-official-demo-01 | 7.34 | 7.86 | 8.40 |
| 1906460792 | virtual-java-agent | 53.55 | 52.26 | 51.72 |
| 2036022276 | python-demo-attack | 0.10 | 0.04 | 0.01 |
| -1413588424 | php-official-demo | 0.08 | 0.11 | 0.09 |
| -846956083 | rum-official-demo | 0.19 | 0.14 | 0.14 |
| -1413588424 | php-official-demo | 0.08 | 0.11 | 0.09 |
| -1187373871 | dotnet-official-demo | - | - | - |
| 663452279 | go-official-demo | 0.56 | 0.99 | 0.98 |
| -780269224 | mysql-official-demo-03 | 0.74 | 0.30 | 0.16 |
| -2142672185 | mysql-official-demo-01 | 7.95 | 7.98 | 8.43 |

---
**Next steps:**
- If load is high: `whatap_server_cpu` for CPU breakdown, `whatap_server_process` for top processes.
```

</details>

#### Step 7: `whatap_alerts`

**User Question:** "Have there been any alerts on my servers in the last hour?"

**Request:**
```json
{
  "name": "whatap_alerts",
  "arguments": {
    "timeRange": "1h",
    "projectCode": 29763
  }
}
```

**Response** (46ms, success):
<details><summary>319 chars</summary>

```
No alert or event data found — this is normal if there are no active alerts.

**Suggestions:**
- Try wider time range ("24h", "7d").
- Check `whatap_check_availability(projectCode=29763)` to see which categories have data.
- To proactively check health: `whatap_server_cpu`, `whatap_apm_error`, `whatap_k8s_pod_status`.
```

</details>

**MXQL Query (reconstructed):**
```
CATEGORY event
TAGLOAD
SELECT [time, title, message, level]
```
**Diagnosis:** Project 29763 returned no data for this query.

## Scenario B: Backend Developer — Java APM Performance Investigation

- **Persona**: Java developer investigating a performance complaint
- **Project type**: JAVA
- **Project**: Java APM Demo (pcode: 5490)
- **Selection**: 13 candidates found, 1 probed

| # | Tool | Latency | Success | Data | Next Steps | Size |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `whatap_list_projects` | 46ms | Yes | Yes | Yes | 8203 |
| 2 | `whatap_apm_tps` | 27ms | Yes | Yes | Yes | 3397 |
| 3 | `whatap_apm_response_time` | 22ms | Yes | Yes | Yes | 4049 |
| 4 | `whatap_apm_error` | 28ms | Yes | Yes | Yes | 3634 |
| 5 | `whatap_apm_active_transactions` | 19ms | Yes | Yes | Yes | 2698 |
| 6 | `whatap_apm_apdex` | 27ms | Yes | Yes | Yes | 4239 |
| 7 | `whatap_apm_transaction_stats` | 30ms | Yes | Yes | Yes | 4397 |

**Scenario totals**: 7/7 success, 7/7 next-steps, avg 28ms, p90 46ms

### Full Interaction Log

#### Step 1: `whatap_list_projects`

**User Question:** "List all my monitoring projects."

**Request:**
```json
{
  "name": "whatap_list_projects",
  "arguments": {}
}
```

**Response** (46ms, success):
<details><summary>8203 chars</summary>

```
## Projects (123 total)

- **PHP-demo-infra** (pcode: 3413) - INFRA / SMS [subscribe]
- **Java APM Demo** (pcode: 5490) - JAVA / APM [subscribe]
- **Node.js APM Demo** (pcode: 6969) - NODEJS / APM [subscribe]
- **PHP APM Demo(Old)** (pcode: 7197) - PHP / APM [subscribe]
- **인트그레이션 프로젝트 데모** (pcode: 25959) - VR / VR [subscribe]
- **Browser Monitoring Demo** (pcode: 27506) - RUM / BROWSER [subscribe]
- **DEV4-CLOUDWATCH** (pcode: 28302) - VR / VR [subscribe]
- **PostgreSQL Monitoring Demo** (pcode: 28458) - POSTGRESQL / DB [subscribe]
- **Python APM Demo** (pcode: 29744) - PYTHON / APM [subscribe]
- **MySQL Monitoring Demo** (pcode: 29762) - MYSQL / DB [subscribe]
- **Server Inventory Monitoring Demo (GPU)** (pcode: 29763) - INFRA / SMS [subscribe]
- **JPetStore_SERVER** (pcode: 29767) - INFRA / SMS [subscribe]
- **JPetStore_JAVA** (pcode: 29770) - JAVA / APM [subscribe]
- **JPetStore_BROWSER** (pcode: 29773) - RUM / BROWSER [subscribe]
- **JPetStore_MYSQL** (pcode: 29779) - MYSQL / DB [subscribe]
- **JPetStore_NODEJS** (pcode: 29843) - NODEJS / APM [subscribe]
- **MS SQL Server Monitoring Demo** (pcode: 30099) - MSSQL / DB [subscribe]
- **Kubernetes Monitoring Demo(Old)** (pcode: 30793) - KUBERNETES / CPM [limited]
- **ECS Monitoring Demo** (pcode: 30899) - VR / VR [subscribe]
- **mysql-V2-test** (pcode: 30910) - MYSQL / DB [subscribe]
- **Amazon CloudWatch Monitoring Demo** (pcode: 31027) - VR / VR [subscribe]
- **Go APM Demo** (pcode: 31130) - GO / APM [subscribe]
- **PHP APM Demo** (pcode: 31324) - PHP / APM [subscribe]
- **Demo** (pcode: 31330) - URLCHECK_ADMIN / WPM [trial]
- **URL Monitoring Demo** (pcode: 31336) - URLCHECK / WPM [subscribe]
- **ecs_삭제예정** (pcode: 32340) - VR / VR [subscribe]
- **Network Monitoring NPM DEMO** (pcode: 32496) - NPM / NETWORK [subscribe]
- **virtual-main** (pcode: 32932) - KUBE_NS / CPM [subscribe]
- **test1** (pcode: 33178) - KUBERNETES / CPM [pending]
- **Kubernetes Monitoring Demo(EKS)** (pcode: 33194) - KUBERNETES / CPM [subscribe]
- **K8s Namespace Project DEMO** (pcode: 33298) - KUBE_NS / CPM [subscribe]
- **Node.js APM Mtrace Demo** (pcode: 34168) - NODEJS / APM [subscribe]
- **Java APM Mtrace Demo** (pcode: 34187) - JAVA / APM [subscribe]
- **PHP APM Mtrace Demo** (pcode: 34236) - PHP / APM [subscribe]
- **AWS-Seoul-Npm-testing** (pcode: 34450) - NPM / NETWORK [subscribe]
- **mysql-v2test** (pcode: 34603) - MYSQL / DB [subscribe]
- **Oracle Monitoring Demo - hjkang** (pcode: 34691) - ORACLE / DB [subscribe]
- **.NET APM Demo** (pcode: 34786) - DOTNET / APM [subscribe]
- **testTestTest** (pcode: 35064) - INFRA / SMS [subscribe]
- **kt-master-node-test** (pcode: 35195) - INFRA / SMS [subscribe]
- **naver-cloud-test** (pcode: 35608) - VR / VR [subscribe]
- **oracle-test** (pcode: 35609) - VR / VR [subscribe]
- **azure-test** (pcode: 35610) - VR / VR [subscribe]
- **aws-test** (pcode: 35611) - VR / VR [subscribe]
- **aws-cloudwatch-test** (pcode: 35612) - VR / VR [subscribe]
- **OpenTelemetry Monitoring Demo** (pcode: 35917) - PHP / APM [subscribe]
- **test** (pcode: 36621) - GO / APM [subscribe]
- **Redis Monitoring Demo** (pcode: 37373) - REDIS / DB [subscribe]
- **Mongodb Monitoring Demo** (pcode: 37374) - MONGODB / DB [subscribe]
- **whatap_oracle** (pcode: 37551) - ORACLE / DB [pending]
- **Petclinic & Event Application** (pcode: 37794) - KUBERNETES / CPM [subscribe]
- **Petclinic Browser** (pcode: 38129) - RUM / BROWSER [subscribe]
- **Petclinic - Oracle** (pcode: 38380) - ORACLE_DMA / DB [subscribe]
- **Oracle Pro Monitoring Demo** (pcode: 38833) - ORACLE_DMA / DB [subscribe]
- **Petclinic Server** (pcode: 39149) - INFRA / SMS [subscribe]
- **Petclinic-Mysql** (pcode: 39155) - MYSQL / DB [subscribe]
- **petclinic-Mysql-apm** (pcode: 39251) - JAVA / APM [subscribe]
- **KAFKA Monitoring Demo** (pcode: 39818) - INFRA / SMS [subscribe]
- **Petclinic Kafka** (pcode: 39903) - INFRA / SMS [subscribe]
- **Aerospike Monitoring Demo** (pcode: 40486) - INFRA / SMS [subscribe]
- **Apache Pulsar Monitoring Demo** (pcode: 40492) - INFRA / SMS [subscribe]
- **Node.js 로그 샘플** (pcode: 40546) - NODEJS / APM [subscribe]
- **petclinic-Postgresql-apm** (pcode: 40824) - JAVA / APM [subscribe]
- **Tibero Monitoing Demo** (pcode: 40977) - TIBERO / DB [subscribe]
- **VMware vCenter Demo** (pcode: 41377) - INFRA / SMS [subscribe]
- **Petclinic-Postgresql** (pcode: 41442) - POSTGRESQL / DB [subscribe]
- **Nginx Monitoring Demo** (pcode: 41580) - INFRA / SMS [subscribe]
- **Apache Web Server Monitoring Demo** (pcode: 41660) - INFRA / SMS [subscribe]
- **뉴발란스 Redis** (pcode: 41739) - REDIS / DB [subscribe]
- **petclinic-Oracle-apm** (pcode: 41856) - JAVA / APM [subscribe]
- **Azure Monitor Demo** (pcode: 41935) - VR / VR [limited]
- **Naver Cloud Demo** (pcode: 41936) - VR / VR [limited]
- **Oracle Cloud Demo** (pcode: 41937) - VR / VR [limited]
- **aa** (pcode: 41975) - INFRA / SMS [subscribe]
- **eunhaTest** (pcode: 42472) - INFRA / SMS [subscribe]
- **test_m** (pcode: 42617) - NODEJS / APM [subscribe]
- **apm** (pcode: 42660) - JAVA / APM [pending]
- **Oracle Monitoring Demo** (pcode: 42792) - ORACLE / DB [subscribe]
- **Oracle Pro Monitoring Demo** (pcode: 42793) - ORACLE_DMA / DB [subscribe]
- **NHN_K8S** (pcode: 42908) - KUBERNETES / CPM [subscribe]
- **NHN_APM** (pcode: 42909) - JAVA / APM [subscribe]
- **Network Management System NMS DEMO** (pcode: 43207) - NMS / NETWORK [subscribe]
- **TEST-Partner** (pcode: 43505) - JAVA / APM [subscribe]
- **[TEST] SERVER MON WINDOWS 25.02.14** (pcode: 43544) - INFRA / SMS [subscribe]
- **minseo** (pcode: 43625) - KUBERNETES / CPM [subscribe]
- **Install Test** (pcode: 43633) - INFRA / SMS [subscribe]
- **Install Test** (pcode: 43665) - INFRA / SMS [subscribe]
- **test** (pcode: 43694) - JAVA / APM [subscribe]
- **TEST_SAP_ASE** (pcode: 43908) - SAP_ASE / DB [subscribe]
- **WAS_DOWN_TEST** (pcode: 44013) - JAVA / APM [subscribe]
- **demo-shop-kuber** (pcode: 44021) - KUBERNETES / CPM [subscribe]
- **demo-shop-network** (pcode: 44022) - NPM / NETWORK [subscribe]
- **demo-shop-java** (pcode: 44023) - JAVA / APM [subscribe]
- **demo-shop-nodejs** (pcode: 44024) - NODEJS / APM [subscribe]
- **demo-shop-browser** (pcode: 44025) - RUM / BROWSER [subscribe]
- **demo-shop-server** (pcode: 44027) - INFRA / SMS [subscribe]
- **demo-shop-url** (pcode: 44030) - URLCHECK / WPM [subscribe]
- **demo-shop-mysql** (pcode: 44049) - MYSQL / DB [subscribe]
- **demo-shop-oracle pro** (pcode: 44059) - ORACLE_DMA / DB [subscribe]
- **demo_browser_tmp** (pcode: 44221) - RUM / BROWSER [subscribe]
- **Milvus Vector Database Demo** (pcode: 44425) - INFRA / SMS [subscribe]
- **Azure Monitoring** (pcode: 44478) - VR / VR [subscribe]
- **demo-shop-redis** (pcode: 44523) - REDIS / DB [subscribe]
- **demo-shop-kafka** (pcode: 44524) - INFRA / SMS [subscribe]
- **demo-shop-nms** (pcode: 44634) - NMS / NETWORK [limited]
- **demo-shop-vCenter** (pcode: 44635) - INFRA / SMS [subscribe]
- **demo-shop-milvus** (pcode: 44931) - INFRA / SMS [subscribe]
- **demo-shop-postgresql** (pcode: 45038) - POSTGRESQL / DB [limited]
- **test** (pcode: 46070) - DOTNET / APM [subscribe]
- **test** (pcode: 46071) - PYTHON / APM [subscribe]
- **test** (pcode: 46224) - JAVA / APM [pending]
- **test** (pcode: 46434) - INFRA / SMS [subscribe]
- **DB2 Monitoring Demo** (pcode: 47139) - DB2 / DB [subscribe]
- **test_1029** (pcode: 47577) - PYTHON / APM [subscribe]
- **URL_GREEN** (pcode: 47579) - URLCHECK / WPM [subscribe]
- **Blue_URL** (pcode: 47580) - URLCHECK_ADMIN / WPM [pending]
- **zzzsfdsz** (pcode: 47582) - POSTGRESQL / DB [pending]
- **CBP** (pcode: 48210) - URLCHECK / WPM [subscribe]
- **URL Monitoring Demo** (pcode: 48403) - URLCHECK / WPM [subscribe]
- **Kubernetes GPU Monitoring Demo** (pcode: 48603) - KUBERNETES / CPM [subscribe]
- **ㅣㅣㅣㅣㅣㅣㅣㅣㅣㅣㅣㅣㅣㅣㅣ** (pcode: 48679) - AWS_LOG_FORWARDER / VR [pending]
- **test** (pcode: 48788) - ANDROID / MOBILE [limited]
- **Golang - Nasi** (pcode: 48801) - ANDROID / MOBILE [limited]

---
**Next steps:**
- Use a pcode with `whatap_check_availability(projectCode)` to see which data categories have data.
- Or jump to a domain tool: `whatap_server_cpu`, `whatap_apm_tps`, `whatap_k8s_pod_status`, etc.
```

</details>

#### Step 2: `whatap_apm_tps`

**User Question:** "What's the current TPS for my Java application?"

**Request:**
```json
{
  "name": "whatap_apm_tps",
  "arguments": {
    "timeRange": "5m",
    "projectCode": 5490
  }
}
```

**Response** (27ms, success):
<details><summary>3397 chars</summary>

```
## APM - Transactions Per Second

| pcode | pname | tps |
| --- | --- | --- |
| 5490 | Java APM Demo | 41.49 |
| 5490 | Java APM Demo | 40.50 |
| 5490 | Java APM Demo | 41.42 |
| 5490 | Java APM Demo | 40.77 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 38.00 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 40.33 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 38.25 |
| 5490 | Java APM Demo | 43.28 |
| 5490 | Java APM Demo | 39.29 |
| 5490 | Java APM Demo | 37.32 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 40.89 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 48.33 |
| 5490 | Java APM Demo | 43.67 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 39.59 |
| 5490 | Java APM Demo | 43.26 |
| 5490 | Java APM Demo | 39.76 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 36.63 |
| 5490 | Java APM Demo | 40.28 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 40.32 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 43.67 |
| 5490 | Java APM Demo | 43.08 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 41.22 |
| 5490 | Java APM Demo | 35.71 |
| 5490 | Java APM Demo | 40.90 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 39.24 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 41.92 |
| 5490 | Java APM Demo | 40 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 41.12 |
| 5490 | Java APM Demo | 40.70 |
| 5490 | Java APM Demo | 37.34 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 0.21 |
| 5490 | Java APM Demo | 5.39 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 45.17 |
| 5490 | Java APM Demo | 0.40 |
| 5490 | Java APM Demo | 44.62 |
| 5490 | Java APM Demo | 35.89 |
| 5490 | Java APM Demo | 40.98 |
| 5490 | Java APM Demo | 41.14 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 46.18 |
| 5490 | Java APM Demo | 2.59 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 40.31 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 44.69 |
| 5490 | Java APM Demo | 43.63 |
| 5490 | Java APM Demo | 44.13 |
| 5490 | Java APM Demo | 43.81 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 1.40 |
| 5490 | Java APM Demo | 38.22 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 39.33 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 38.52 |
| 5490 | Java APM Demo | 45.46 |
| 5490 | Java APM Demo | 37.06 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 0.20 |
| 5490 | Java APM Demo | 42.70 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 42.71 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 37.42 |
| 5490 | Java APM Demo | 50.46 |
| 5490 | Java APM Demo | 44.31 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 39.79 |
| 5490 | Java APM Demo | 39.36 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 40.56 |
| 5490 | Java APM Demo | 37.38 |
| 5490 | Java APM Demo | 43.89 |
| 5490 | Java APM Demo | 42.09 |
| 5490 | Java APM Demo | 40.14 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 37.55 |
| 5490 | Java APM Demo | 42.50 |
| 5490 | Java APM Demo | 0 |
| 5490 | Java APM Demo | 40.69 |
| 5490 | Java APM Demo | 42.42 |
| 5490 | Java APM Demo | 42.06 |

---
**Next steps:**
- Correlate: `whatap_apm_response_time` (latency), `whatap_apm_error` (error rates), `whatap_apm_active_transactions` (saturation).
```

</details>

#### Step 3: `whatap_apm_response_time`

**User Question:** "How fast are my API responses right now?"

**Request:**
```json
{
  "name": "whatap_apm_response_time",
  "arguments": {
    "timeRange": "5m",
    "projectCode": 5490
  }
}
```

**Response** (22ms, success):
<details><summary>4049 chars</summary>

```
## APM - Response Time

| pcode | pname | tx_time | tx_count |
| --- | --- | --- | --- |
| 5490 | Java APM Demo | 2198.79 | 201 |
| 5490 | Java APM Demo | 2358.61 | 203 |
| 5490 | Java APM Demo | 2209.60 | 208 |
| 5490 | Java APM Demo | 2596.30 | 198 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2325.16 | 192 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 1976.98 | 203 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2990.84 | 192 |
| 5490 | Java APM Demo | 2882.52 | 217 |
| 5490 | Java APM Demo | 2027.55 | 197 |
| 5490 | Java APM Demo | 2704.03 | 187 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 1948.41 | 205 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2691.04 | 244 |
| 5490 | Java APM Demo | 2896.45 | 210 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2100.60 | 199 |
| 5490 | Java APM Demo | 1938.56 | 217 |
| 5490 | Java APM Demo | 1976.93 | 200 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2564.66 | 185 |
| 5490 | Java APM Demo | 2384.79 | 202 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2264.07 | 202 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2131.14 | 219 |
| 5490 | Java APM Demo | 2771.73 | 216 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2514.06 | 207 |
| 5490 | Java APM Demo | 2602.58 | 179 |
| 5490 | Java APM Demo | 2600.56 | 205 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2071.02 | 197 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2399.30 | 210 |
| 5490 | Java APM Demo | 2571.03 | 201 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 3096.51 | 206 |
| 5490 | Java APM Demo | 2077.97 | 204 |
| 5490 | Java APM Demo | 2675.20 | 187 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 180080 | 1 |
| 5490 | Java APM Demo | 1310.52 | 27 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2650.93 | 227 |
| 5490 | Java APM Demo | 180198 | 2 |
| 5490 | Java APM Demo | 2455.67 | 224 |
| 5490 | Java APM Demo | 2410.17 | 180 |
| 5490 | Java APM Demo | 1997.84 | 207 |
| 5490 | Java APM Demo | 1900.09 | 207 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2684.50 | 224 |
| 5490 | Java APM Demo | 1127.85 | 13 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 3160.43 | 202 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2786.17 | 224 |
| 5490 | Java APM Demo | 2249.50 | 219 |
| 5490 | Java APM Demo | 2402.70 | 221 |
| 5490 | Java APM Demo | 3421.19 | 211 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 1765.43 | 7 |
| 5490 | Java APM Demo | 2181.82 | 192 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2109.84 | 197 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2344.85 | 193 |
| 5490 | Java APM Demo | 1960.52 | 228 |
| 5490 | Java APM Demo | 1784.27 | 186 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 487 | 1 |
| 5490 | Java APM Demo | 1993.94 | 214 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2063.66 | 214 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2636.09 | 188 |
| 5490 | Java APM Demo | 2431.65 | 253 |
| 5490 | Java APM Demo | 2538.31 | 222 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2539.06 | 200 |
| 5490 | Java APM Demo | 6262.72 | 198 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2313.51 | 204 |
| 5490 | Java APM Demo | 1869.15 | 187 |
| 5490 | Java APM Demo | 2410.39 | 220 |
| 5490 | Java APM Demo | 2348.05 | 203 |
| 5490 | Java APM Demo | 2229.10 | 201 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 3825.37 | 188 |
| 5490 | Java APM Demo | 2632.08 | 213 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2198.57 | 204 |
| 5490 | Java APM Demo | 2648.29 | 213 |
| 5490 | Java APM Demo | 2729.21 | 203 |

---
**Next steps:**
- Correlate: `whatap_apm_tps` (throughput), `whatap_apm_apdex` (user satisfaction), `whatap_apm_error`.
```

</details>

#### Step 4: `whatap_apm_error`

**User Question:** "Are there any errors in my Java app?"

**Request:**
```json
{
  "name": "whatap_apm_error",
  "arguments": {
    "timeRange": "5m",
    "projectCode": 5490
  }
}
```

**Response** (28ms, success):
<details><summary>3634 chars</summary>

```
## APM - Transaction Errors

| pcode | pname | tx_error | tx_count |
| --- | --- | --- | --- |
| 5490 | Java APM Demo | 3 | 201 |
| 5490 | Java APM Demo | 4 | 203 |
| 5490 | Java APM Demo | 2 | 208 |
| 5490 | Java APM Demo | 1 | 198 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 3 | 192 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 4 | 203 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 4 | 192 |
| 5490 | Java APM Demo | 4 | 217 |
| 5490 | Java APM Demo | 3 | 197 |
| 5490 | Java APM Demo | 2 | 187 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 8 | 205 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 5 | 244 |
| 5490 | Java APM Demo | 3 | 210 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 6 | 199 |
| 5490 | Java APM Demo | 6 | 217 |
| 5490 | Java APM Demo | 2 | 200 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 0 | 185 |
| 5490 | Java APM Demo | 8 | 202 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 5 | 202 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 4 | 219 |
| 5490 | Java APM Demo | 2 | 216 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 1 | 207 |
| 5490 | Java APM Demo | 3 | 179 |
| 5490 | Java APM Demo | 8 | 205 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2 | 197 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 1 | 210 |
| 5490 | Java APM Demo | 5 | 201 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 5 | 206 |
| 5490 | Java APM Demo | 4 | 204 |
| 5490 | Java APM Demo | 4 | 187 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 0 | 1 |
| 5490 | Java APM Demo | 0 | 27 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 7 | 227 |
| 5490 | Java APM Demo | 1 | 2 |
| 5490 | Java APM Demo | 0 | 224 |
| 5490 | Java APM Demo | 0 | 180 |
| 5490 | Java APM Demo | 1 | 207 |
| 5490 | Java APM Demo | 1 | 207 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 3 | 224 |
| 5490 | Java APM Demo | 0 | 13 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 3 | 202 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 9 | 224 |
| 5490 | Java APM Demo | 5 | 219 |
| 5490 | Java APM Demo | 3 | 221 |
| 5490 | Java APM Demo | 4 | 211 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 0 | 7 |
| 5490 | Java APM Demo | 2 | 192 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 1 | 197 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 3 | 193 |
| 5490 | Java APM Demo | 6 | 228 |
| 5490 | Java APM Demo | 0 | 186 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 0 | 1 |
| 5490 | Java APM Demo | 3 | 214 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2 | 214 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 4 | 188 |
| 5490 | Java APM Demo | 4 | 253 |
| 5490 | Java APM Demo | 5 | 222 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 6 | 200 |
| 5490 | Java APM Demo | 5 | 198 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 2 | 204 |
| 5490 | Java APM Demo | 1 | 187 |
| 5490 | Java APM Demo | 1 | 220 |
| 5490 | Java APM Demo | 1 | 203 |
| 5490 | Java APM Demo | 3 | 201 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 1 | 188 |
| 5490 | Java APM Demo | 0 | 213 |
| 5490 | Java APM Demo | 0 | 0 |
| 5490 | Java APM Demo | 5 | 204 |
| 5490 | Java APM Demo | 3 | 213 |
| 5490 | Java APM Demo | 4 | 203 |

---
**Next steps:**
- Correlate: `whatap_apm_tps`, `whatap_apm_response_time`, `whatap_apm_transaction_stats`.
```

</details>

#### Step 5: `whatap_apm_active_transactions`

**User Question:** "How many transactions are currently active?"

**Request:**
```json
{
  "name": "whatap_apm_active_transactions",
  "arguments": {
    "projectCode": 5490
  }
}
```

**Response** (19ms, success):
<details><summary>2698 chars</summary>

```
## APM - Active Transactions (Real-time)

| pcode | pname |
| --- | --- |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |
| 5490 | Java APM Demo |

---
**Next steps:**
- If many active: `whatap_apm_response_time` (slow responses), `whatap_server_cpu` (resource pressure).
```

</details>

#### Step 6: `whatap_apm_apdex`

**User Question:** "What's the user satisfaction (Apdex) score for my app?"

**Request:**
```json
{
  "name": "whatap_apm_apdex",
  "arguments": {
    "timeRange": "5m",
    "projectCode": 5490
  }
}
```

**Response** (27ms, success):
<details><summary>4239 chars</summary>

```
## APM - APDEX Score

| pcode | pname | apdex_satisfied | apdex_tolerated | apdex_total |
| --- | --- | --- | --- | --- |
| 5490 | Java APM Demo | 82 | 104 | 201 |
| 5490 | Java APM Demo | 84 | 103 | 203 |
| 5490 | Java APM Demo | 88 | 109 | 208 |
| 5490 | Java APM Demo | 74 | 107 | 198 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 92 | 87 | 192 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 80 | 113 | 203 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 75 | 100 | 192 |
| 5490 | Java APM Demo | 84 | 113 | 217 |
| 5490 | Java APM Demo | 80 | 105 | 197 |
| 5490 | Java APM Demo | 62 | 110 | 187 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 89 | 100 | 205 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 92 | 131 | 244 |
| 5490 | Java APM Demo | 76 | 117 | 210 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 81 | 105 | 199 |
| 5490 | Java APM Demo | 94 | 113 | 217 |
| 5490 | Java APM Demo | 96 | 93 | 200 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 74 | 96 | 185 |
| 5490 | Java APM Demo | 85 | 100 | 202 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 83 | 106 | 202 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 91 | 113 | 219 |
| 5490 | Java APM Demo | 81 | 120 | 216 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 83 | 109 | 207 |
| 5490 | Java APM Demo | 78 | 86 | 179 |
| 5490 | Java APM Demo | 88 | 95 | 205 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 79 | 111 | 197 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 94 | 103 | 210 |
| 5490 | Java APM Demo | 86 | 101 | 201 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 87 | 98 | 206 |
| 5490 | Java APM Demo | 83 | 109 | 204 |
| 5490 | Java APM Demo | 70 | 101 | 187 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 | 1 |
| 5490 | Java APM Demo | 10 | 17 | 27 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 97 | 107 | 227 |
| 5490 | Java APM Demo | 0 | 0 | 2 |
| 5490 | Java APM Demo | 103 | 108 | 224 |
| 5490 | Java APM Demo | 89 | 80 | 180 |
| 5490 | Java APM Demo | 82 | 113 | 207 |
| 5490 | Java APM Demo | 103 | 94 | 207 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 96 | 106 | 224 |
| 5490 | Java APM Demo | 9 | 4 | 13 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 89 | 93 | 202 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 97 | 102 | 224 |
| 5490 | Java APM Demo | 98 | 107 | 219 |
| 5490 | Java APM Demo | 97 | 108 | 221 |
| 5490 | Java APM Demo | 87 | 96 | 211 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 2 | 5 | 7 |
| 5490 | Java APM Demo | 84 | 94 | 192 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 93 | 94 | 197 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 88 | 91 | 193 |
| 5490 | Java APM Demo | 87 | 127 | 228 |
| 5490 | Java APM Demo | 93 | 87 | 186 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 1 | 0 | 1 |
| 5490 | Java APM Demo | 102 | 98 | 214 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 108 | 93 | 214 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 88 | 83 | 188 |
| 5490 | Java APM Demo | 121 | 109 | 253 |
| 5490 | Java APM Demo | 91 | 113 | 222 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 75 | 111 | 200 |
| 5490 | Java APM Demo | 77 | 92 | 198 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 84 | 104 | 204 |
| 5490 | Java APM Demo | 74 | 106 | 187 |
| 5490 | Java APM Demo | 89 | 116 | 220 |
| 5490 | Java APM Demo | 87 | 104 | 203 |
| 5490 | Java APM Demo | 82 | 105 | 201 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 88 | 88 | 188 |
| 5490 | Java APM Demo | 95 | 102 | 213 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 89 | 99 | 204 |
| 5490 | Java APM Demo | 88 | 104 | 213 |
| 5490 | Java APM Demo | 89 | 97 | 203 |

---
**Next steps:**
- Investigate poor scores: `whatap_apm_response_time` (latency), `whatap_apm_error` (errors).
```

</details>

#### Step 7: `whatap_apm_transaction_stats`

**User Question:** "Give me a summary of transaction performance over the last hour."

**Request:**
```json
{
  "name": "whatap_apm_transaction_stats",
  "arguments": {
    "timeRange": "1h",
    "projectCode": 5490
  }
}
```

**Response** (30ms, success):
<details><summary>4397 chars</summary>

```
## APM - Transaction Statistics

| pcode | pname | tx_count | tx_time | tx_error |
| --- | --- | --- | --- | --- |
| 5490 | Java APM Demo | 195 | 1602.41 | 4 |
| 5490 | Java APM Demo | 229 | 2545.72 | 3 |
| 5490 | Java APM Demo | 180 | 2486.19 | 1 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 180 | 2945.76 | 1 |
| 5490 | Java APM Demo | 68 | 1407.38 | 0 |
| 5490 | Java APM Demo | 210 | 2229.34 | 6 |
| 5490 | Java APM Demo | 199 | 2188.44 | 3 |
| 5490 | Java APM Demo | 41 | 1256.73 | 1 |
| 5490 | Java APM Demo | 243 | 2371.85 | 3 |
| 5490 | Java APM Demo | 190 | 3460.20 | 4 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 211 | 1831.24 | 3 |
| 5490 | Java APM Demo | 15 | 1311.93 | 1 |
| 5490 | Java APM Demo | 204 | 2277.34 | 2 |
| 5490 | Java APM Demo | 16 | 1423.50 | 0 |
| 5490 | Java APM Demo | 227 | 2448.95 | 2 |
| 5490 | Java APM Demo | 193 | 2010.93 | 3 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 208 | 2691.38 | 1 |
| 5490 | Java APM Demo | 3 | 2510 | 0 |
| 5490 | Java APM Demo | 230 | 2291.49 | 2 |
| 5490 | Java APM Demo | 2 | 2796 | 1 |
| 5490 | Java APM Demo | 199 | 2161.53 | 1 |
| 5490 | Java APM Demo | 200 | 2185.82 | 2 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 206 | 2694.91 | 2 |
| 5490 | Java APM Demo | 1 | 1785 | 0 |
| 5490 | Java APM Demo | 1 | 1976 | 0 |
| 5490 | Java APM Demo | 219 | 2645.55 | 5 |
| 5490 | Java APM Demo | 216 | 2307.64 | 5 |
| 5490 | Java APM Demo | 206 | 2597.93 | 2 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 200 | 1706.48 | 5 |
| 5490 | Java APM Demo | 7 | 24220 | 2 |
| 5490 | Java APM Demo | 199 | 5481.23 | 2 |
| 5490 | Java APM Demo | 192 | 2524.77 | 1 |
| 5490 | Java APM Demo | 134 | 5369.19 | 2 |
| 5490 | Java APM Demo | 196 | 2183.79 | 6 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 194 | 2663.68 | 3 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 141 | 1595.31 | 3 |
| 5490 | Java APM Demo | 204 | 4432.79 | 3 |
| 5490 | Java APM Demo | 191 | 2290.03 | 3 |
| 5490 | Java APM Demo | 222 | 4604.44 | 4 |
| 5490 | Java APM Demo | 206 | 2638.32 | 3 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 203 | 2114.53 | 2 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 18 | 1306.50 | 1 |
| 5490 | Java APM Demo | 6 | 1637.83 | 0 |
| 5490 | Java APM Demo | 166 | 3383.82 | 1 |
| 5490 | Java APM Demo | 212 | 2079.40 | 5 |
| 5490 | Java APM Demo | 209 | 4490.54 | 5 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 214 | 2108.84 | 3 |
| 5490 | Java APM Demo | 217 | 1863.50 | 4 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 8 | 1997.63 | 0 |
| 5490 | Java APM Demo | 163 | 4202.64 | 6 |
| 5490 | Java APM Demo | 203 | 2143.01 | 3 |
| 5490 | Java APM Demo | 153 | 4073.76 | 3 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 232 | 2300.52 | 2 |
| 5490 | Java APM Demo | 234 | 1884.78 | 1 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 4 | 2055.25 | 1 |
| 5490 | Java APM Demo | 168 | 2976.07 | 4 |
| 5490 | Java APM Demo | 225 | 2089.83 | 9 |
| 5490 | Java APM Demo | 147 | 4243.10 | 3 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 223 | 2261.18 | 3 |
| 5490 | Java APM Demo | 217 | 2511.23 | 2 |
| 5490 | Java APM Demo | 231 | 2156.76 | 3 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 208 | 2645.70 | 4 |
| 5490 | Java APM Demo | 2 | 22298.50 | 0 |
| 5490 | Java APM Demo | 133 | 2219.41 | 2 |
| 5490 | Java APM Demo | 202 | 2308.81 | 4 |
| 5490 | Java APM Demo | 126 | 2388.06 | 3 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 0 | 0 | 0 |
| 5490 | Java APM Demo | 218 | 2797.98 | 5 |

---
**Next steps:**
- Drill down: `whatap_apm_error`, `whatap_apm_response_time`.
```

</details>

## Scenario C: K8s Platform Engineer — Cluster Incident Response

- **Persona**: K8s operator assessing cluster state after alert
- **Project type**: KUBERNETES
- **Project**: Kubernetes Monitoring Demo(EKS) (pcode: 33194)
- **Selection**: 10 candidates found, 4 probed

| # | Tool | Latency | Success | Data | Next Steps | Size |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `whatap_list_projects` | 50ms | Yes | Yes | Yes | 8203 |
| 2 | `whatap_k8s_node_list` | 106ms | Yes | Yes | Yes | 13225 |
| 3 | `whatap_k8s_node_cpu` | 31ms | Yes | Yes | Yes | 13810 |
| 4 | `whatap_k8s_node_memory` | 25ms | Yes | Yes | Yes | 15116 |
| 5 | `whatap_k8s_pod_status` | 22ms | Yes | No | Yes | 2001 |
| 6 | `whatap_k8s_container_top` | 21ms | Yes | No | Yes | 349 |
| 7 | `whatap_k8s_events` | 22ms | Yes | No | Yes | 385 |

**Scenario totals**: 7/7 success, 7/7 next-steps, avg 40ms, p90 106ms

### Full Interaction Log

#### Step 1: `whatap_list_projects`

**User Question:** "Show me all my monitoring projects."

**Request:**
```json
{
  "name": "whatap_list_projects",
  "arguments": {}
}
```

**Response** (50ms, success):
<details><summary>8203 chars</summary>

```
## Projects (123 total)

- **PHP-demo-infra** (pcode: 3413) - INFRA / SMS [subscribe]
- **Java APM Demo** (pcode: 5490) - JAVA / APM [subscribe]
- **Node.js APM Demo** (pcode: 6969) - NODEJS / APM [subscribe]
- **PHP APM Demo(Old)** (pcode: 7197) - PHP / APM [subscribe]
- **인트그레이션 프로젝트 데모** (pcode: 25959) - VR / VR [subscribe]
- **Browser Monitoring Demo** (pcode: 27506) - RUM / BROWSER [subscribe]
- **DEV4-CLOUDWATCH** (pcode: 28302) - VR / VR [subscribe]
- **PostgreSQL Monitoring Demo** (pcode: 28458) - POSTGRESQL / DB [subscribe]
- **Python APM Demo** (pcode: 29744) - PYTHON / APM [subscribe]
- **MySQL Monitoring Demo** (pcode: 29762) - MYSQL / DB [subscribe]
- **Server Inventory Monitoring Demo (GPU)** (pcode: 29763) - INFRA / SMS [subscribe]
- **JPetStore_SERVER** (pcode: 29767) - INFRA / SMS [subscribe]
- **JPetStore_JAVA** (pcode: 29770) - JAVA / APM [subscribe]
- **JPetStore_BROWSER** (pcode: 29773) - RUM / BROWSER [subscribe]
- **JPetStore_MYSQL** (pcode: 29779) - MYSQL / DB [subscribe]
- **JPetStore_NODEJS** (pcode: 29843) - NODEJS / APM [subscribe]
- **MS SQL Server Monitoring Demo** (pcode: 30099) - MSSQL / DB [subscribe]
- **Kubernetes Monitoring Demo(Old)** (pcode: 30793) - KUBERNETES / CPM [limited]
- **ECS Monitoring Demo** (pcode: 30899) - VR / VR [subscribe]
- **mysql-V2-test** (pcode: 30910) - MYSQL / DB [subscribe]
- **Amazon CloudWatch Monitoring Demo** (pcode: 31027) - VR / VR [subscribe]
- **Go APM Demo** (pcode: 31130) - GO / APM [subscribe]
- **PHP APM Demo** (pcode: 31324) - PHP / APM [subscribe]
- **Demo** (pcode: 31330) - URLCHECK_ADMIN / WPM [trial]
- **URL Monitoring Demo** (pcode: 31336) - URLCHECK / WPM [subscribe]
- **ecs_삭제예정** (pcode: 32340) - VR / VR [subscribe]
- **Network Monitoring NPM DEMO** (pcode: 32496) - NPM / NETWORK [subscribe]
- **virtual-main** (pcode: 32932) - KUBE_NS / CPM [subscribe]
- **test1** (pcode: 33178) - KUBERNETES / CPM [pending]
- **Kubernetes Monitoring Demo(EKS)** (pcode: 33194) - KUBERNETES / CPM [subscribe]
- **K8s Namespace Project DEMO** (pcode: 33298) - KUBE_NS / CPM [subscribe]
- **Node.js APM Mtrace Demo** (pcode: 34168) - NODEJS / APM [subscribe]
- **Java APM Mtrace Demo** (pcode: 34187) - JAVA / APM [subscribe]
- **PHP APM Mtrace Demo** (pcode: 34236) - PHP / APM [subscribe]
- **AWS-Seoul-Npm-testing** (pcode: 34450) - NPM / NETWORK [subscribe]
- **mysql-v2test** (pcode: 34603) - MYSQL / DB [subscribe]
- **Oracle Monitoring Demo - hjkang** (pcode: 34691) - ORACLE / DB [subscribe]
- **.NET APM Demo** (pcode: 34786) - DOTNET / APM [subscribe]
- **testTestTest** (pcode: 35064) - INFRA / SMS [subscribe]
- **kt-master-node-test** (pcode: 35195) - INFRA / SMS [subscribe]
- **naver-cloud-test** (pcode: 35608) - VR / VR [subscribe]
- **oracle-test** (pcode: 35609) - VR / VR [subscribe]
- **azure-test** (pcode: 35610) - VR / VR [subscribe]
- **aws-test** (pcode: 35611) - VR / VR [subscribe]
- **aws-cloudwatch-test** (pcode: 35612) - VR / VR [subscribe]
- **OpenTelemetry Monitoring Demo** (pcode: 35917) - PHP / APM [subscribe]
- **test** (pcode: 36621) - GO / APM [subscribe]
- **Redis Monitoring Demo** (pcode: 37373) - REDIS / DB [subscribe]
- **Mongodb Monitoring Demo** (pcode: 37374) - MONGODB / DB [subscribe]
- **whatap_oracle** (pcode: 37551) - ORACLE / DB [pending]
- **Petclinic & Event Application** (pcode: 37794) - KUBERNETES / CPM [subscribe]
- **Petclinic Browser** (pcode: 38129) - RUM / BROWSER [subscribe]
- **Petclinic - Oracle** (pcode: 38380) - ORACLE_DMA / DB [subscribe]
- **Oracle Pro Monitoring Demo** (pcode: 38833) - ORACLE_DMA / DB [subscribe]
- **Petclinic Server** (pcode: 39149) - INFRA / SMS [subscribe]
- **Petclinic-Mysql** (pcode: 39155) - MYSQL / DB [subscribe]
- **petclinic-Mysql-apm** (pcode: 39251) - JAVA / APM [subscribe]
- **KAFKA Monitoring Demo** (pcode: 39818) - INFRA / SMS [subscribe]
- **Petclinic Kafka** (pcode: 39903) - INFRA / SMS [subscribe]
- **Aerospike Monitoring Demo** (pcode: 40486) - INFRA / SMS [subscribe]
- **Apache Pulsar Monitoring Demo** (pcode: 40492) - INFRA / SMS [subscribe]
- **Node.js 로그 샘플** (pcode: 40546) - NODEJS / APM [subscribe]
- **petclinic-Postgresql-apm** (pcode: 40824) - JAVA / APM [subscribe]
- **Tibero Monitoing Demo** (pcode: 40977) - TIBERO / DB [subscribe]
- **VMware vCenter Demo** (pcode: 41377) - INFRA / SMS [subscribe]
- **Petclinic-Postgresql** (pcode: 41442) - POSTGRESQL / DB [subscribe]
- **Nginx Monitoring Demo** (pcode: 41580) - INFRA / SMS [subscribe]
- **Apache Web Server Monitoring Demo** (pcode: 41660) - INFRA / SMS [subscribe]
- **뉴발란스 Redis** (pcode: 41739) - REDIS / DB [subscribe]
- **petclinic-Oracle-apm** (pcode: 41856) - JAVA / APM [subscribe]
- **Azure Monitor Demo** (pcode: 41935) - VR / VR [limited]
- **Naver Cloud Demo** (pcode: 41936) - VR / VR [limited]
- **Oracle Cloud Demo** (pcode: 41937) - VR / VR [limited]
- **aa** (pcode: 41975) - INFRA / SMS [subscribe]
- **eunhaTest** (pcode: 42472) - INFRA / SMS [subscribe]
- **test_m** (pcode: 42617) - NODEJS / APM [subscribe]
- **apm** (pcode: 42660) - JAVA / APM [pending]
- **Oracle Monitoring Demo** (pcode: 42792) - ORACLE / DB [subscribe]
- **Oracle Pro Monitoring Demo** (pcode: 42793) - ORACLE_DMA / DB [subscribe]
- **NHN_K8S** (pcode: 42908) - KUBERNETES / CPM [subscribe]
- **NHN_APM** (pcode: 42909) - JAVA / APM [subscribe]
- **Network Management System NMS DEMO** (pcode: 43207) - NMS / NETWORK [subscribe]
- **TEST-Partner** (pcode: 43505) - JAVA / APM [subscribe]
- **[TEST] SERVER MON WINDOWS 25.02.14** (pcode: 43544) - INFRA / SMS [subscribe]
- **minseo** (pcode: 43625) - KUBERNETES / CPM [subscribe]
- **Install Test** (pcode: 43633) - INFRA / SMS [subscribe]
- **Install Test** (pcode: 43665) - INFRA / SMS [subscribe]
- **test** (pcode: 43694) - JAVA / APM [subscribe]
- **TEST_SAP_ASE** (pcode: 43908) - SAP_ASE / DB [subscribe]
- **WAS_DOWN_TEST** (pcode: 44013) - JAVA / APM [subscribe]
- **demo-shop-kuber** (pcode: 44021) - KUBERNETES / CPM [subscribe]
- **demo-shop-network** (pcode: 44022) - NPM / NETWORK [subscribe]
- **demo-shop-java** (pcode: 44023) - JAVA / APM [subscribe]
- **demo-shop-nodejs** (pcode: 44024) - NODEJS / APM [subscribe]
- **demo-shop-browser** (pcode: 44025) - RUM / BROWSER [subscribe]
- **demo-shop-server** (pcode: 44027) - INFRA / SMS [subscribe]
- **demo-shop-url** (pcode: 44030) - URLCHECK / WPM [subscribe]
- **demo-shop-mysql** (pcode: 44049) - MYSQL / DB [subscribe]
- **demo-shop-oracle pro** (pcode: 44059) - ORACLE_DMA / DB [subscribe]
- **demo_browser_tmp** (pcode: 44221) - RUM / BROWSER [subscribe]
- **Milvus Vector Database Demo** (pcode: 44425) - INFRA / SMS [subscribe]
- **Azure Monitoring** (pcode: 44478) - VR / VR [subscribe]
- **demo-shop-redis** (pcode: 44523) - REDIS / DB [subscribe]
- **demo-shop-kafka** (pcode: 44524) - INFRA / SMS [subscribe]
- **demo-shop-nms** (pcode: 44634) - NMS / NETWORK [limited]
- **demo-shop-vCenter** (pcode: 44635) - INFRA / SMS [subscribe]
- **demo-shop-milvus** (pcode: 44931) - INFRA / SMS [subscribe]
- **demo-shop-postgresql** (pcode: 45038) - POSTGRESQL / DB [limited]
- **test** (pcode: 46070) - DOTNET / APM [subscribe]
- **test** (pcode: 46071) - PYTHON / APM [subscribe]
- **test** (pcode: 46224) - JAVA / APM [pending]
- **test** (pcode: 46434) - INFRA / SMS [subscribe]
- **DB2 Monitoring Demo** (pcode: 47139) - DB2 / DB [subscribe]
- **test_1029** (pcode: 47577) - PYTHON / APM [subscribe]
- **URL_GREEN** (pcode: 47579) - URLCHECK / WPM [subscribe]
- **Blue_URL** (pcode: 47580) - URLCHECK_ADMIN / WPM [pending]
- **zzzsfdsz** (pcode: 47582) - POSTGRESQL / DB [pending]
- **CBP** (pcode: 48210) - URLCHECK / WPM [subscribe]
- **URL Monitoring Demo** (pcode: 48403) - URLCHECK / WPM [subscribe]
- **Kubernetes GPU Monitoring Demo** (pcode: 48603) - KUBERNETES / CPM [subscribe]
- **ㅣㅣㅣㅣㅣㅣㅣㅣㅣㅣㅣㅣㅣㅣㅣ** (pcode: 48679) - AWS_LOG_FORWARDER / VR [pending]
- **test** (pcode: 48788) - ANDROID / MOBILE [limited]
- **Golang - Nasi** (pcode: 48801) - ANDROID / MOBILE [limited]

---
**Next steps:**
- Use a pcode with `whatap_check_availability(projectCode)` to see which data categories have data.
- Or jump to a domain tool: `whatap_server_cpu`, `whatap_apm_tps`, `whatap_k8s_pod_status`, etc.
```

</details>

#### Step 2: `whatap_k8s_node_list`

**User Question:** "List all Kubernetes nodes and their status."

**Request:**
```json
{
  "name": "whatap_k8s_node_list",
  "arguments": {
    "timeRange": "5m",
    "projectCode": 33194
  }
}
```

**Response** (106ms, success):
<details><summary>13225 chars</summary>

```
## Kubernetes Nodes

| oid | oname | onodeName | cpu | memory_pused |
| --- | --- | --- | --- | --- |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 7.30 | 74.77 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 10.30 | 67.80 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 2.10 | 45.48 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 92.20 | 93.99 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 2.30 | 65.56 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 3.50 | 45.47 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 4.30 | 65.57 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 8.50 | 74.81 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 10.30 | 67.80 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 93.10 | 93.88 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 2 | 45.47 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 2.20 | 65.57 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 89.90 | 94.18 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 7.80 | 75.03 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 9.50 | 66.78 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 86.80 | 93.81 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 2.40 | 45.75 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 4.30 | 65.58 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 9.10 | 75.10 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 9.60 | 66.80 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 7.70 | 75.10 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 10.20 | 67.14 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 93.60 | 93.68 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 1.80 | 45.75 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 2.50 | 65.60 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 3.40 | 44.91 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 4.50 | 65.62 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 10.90 | 75.19 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 4.10 | 67.14 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 96.60 | 93.61 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 2.70 | 44.91 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 95.30 | 93.69 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 2.80 | 65.63 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 7.20 | 75.19 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 3.70 | 67.14 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 87 | 93.44 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 2.30 | 45.13 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 3.60 | 65.72 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 8.60 | 75.20 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 3.80 | 67.15 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 4.20 | 67.15 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 1.90 | 45.13 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 80.20 | 93.35 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 7.50 | 75.21 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 2.40 | 65.74 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 9.90 | 75.28 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 3.60 | 45.21 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 5.20 | 65.78 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 6.50 | 67.26 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 76.10 | 93.55 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 9.90 | 75.32 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 1.70 | 45.22 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 2.10 | 65.80 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 73.40 | 93.30 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 10.10 | 67.28 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 8.90 | 75.43 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 2.50 | 45.45 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 3.80 | 65.79 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 9.70 | 67.59 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 70.40 | 93.34 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 10.10 | 67.68 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 6.90 | 75.43 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 82.30 | 93.22 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 2.10 | 45.45 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 2.20 | 65.79 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 3.60 | 45.58 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 4.70 | 65.79 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 10.20 | 67.68 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 8.90 | 75.47 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 89.20 | 92.76 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 2.10 | 45.58 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 1.90 | 65.79 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 9.20 | 67.69 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 96.30 | 92.75 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 7.20 | 75.49 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 10 | 75.78 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 2.90 | 45.59 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 3.50 | 65.79 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 8.30 | 67.69 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 98.10 | 93.28 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 7.80 | 76.22 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 3 | 45.58 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 3.40 | 65.79 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 8.20 | 67.69 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 91.60 | 92.67 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 4.60 | 65.79 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 9.10 | 76.81 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 2.50 | 45.60 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 84.60 | 92.94 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 8.10 | 67.70 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 2.90 | 45.60 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 85.80 | 92.76 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 2.20 | 65.79 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 12.40 | 67.70 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 5.50 | 76.89 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 3 | 45.60 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 87.60 | 92.53 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 10.60 | 67.70 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 3.70 | 65.79 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 3.80 | 76.83 |

---
**Next steps:**
- Drill down: `whatap_k8s_node_cpu`, `whatap_k8s_node_memory`, `whatap_k8s_pod_status`.
```

</details>

#### Step 3: `whatap_k8s_node_cpu`

**User Question:** "How much CPU are my K8s nodes using?"

**Request:**
```json
{
  "name": "whatap_k8s_node_cpu",
  "arguments": {
    "timeRange": "5m",
    "projectCode": 33194
  }
}
```

**Response** (31ms, success):
<details><summary>13810 chars</summary>

```
## Kubernetes Node CPU

| oid | oname | onodeName | cpu | cpu_usr | cpu_sys |
| --- | --- | --- | --- | --- | --- |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 7.30 | 3.70 | 2 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 10.30 | 5.60 | 2.70 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 2.10 | 1.40 | 0.60 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 92.20 | 58.80 | 30.40 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 2.30 | 1.50 | 0.50 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 3.50 | 1.80 | 0.60 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 4.30 | 1.30 | 1 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 8.50 | 5 | 3.40 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 10.30 | 5.20 | 3.80 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 93.10 | 62.10 | 29.10 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 2 | 1.40 | 0.70 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 2.20 | 0.80 | 0.80 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 89.90 | 56.20 | 29 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 7.80 | 3.40 | 3 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 9.50 | 5 | 2.90 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 86.80 | 57.70 | 25.70 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 2.40 | 1.30 | 0.90 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 4.30 | 1.70 | 1.20 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 9.10 | 3.10 | 3.20 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 9.60 | 6.10 | 2.30 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 7.70 | 2.90 | 1.90 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 10.20 | 4.90 | 2.40 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 93.60 | 63.10 | 28.40 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 1.80 | 1.90 | 0.80 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 2.50 | 0.80 | 0.30 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 3.40 | 1.70 | 0.70 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 4.50 | 2 | 1.30 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 10.90 | 6.80 | 1.90 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 4.10 | 2.60 | 0.60 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 96.60 | 62.80 | 32.40 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 2.70 | 1.40 | 0.90 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 95.30 | 63.40 | 29.30 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 2.80 | 1.70 | 0.60 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 7.20 | 3.20 | 1.60 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 3.70 | 2.70 | 1.20 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 87 | 57.50 | 27.20 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 2.30 | 1.30 | 0.90 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 3.60 | 1.60 | 1.30 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 8.60 | 3.90 | 2.10 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 3.80 | 2.50 | 0.90 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 4.20 | 2.60 | 0.80 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 1.90 | 0.90 | 0.70 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 80.20 | 53.30 | 23.50 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 7.50 | 3.10 | 3.30 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 2.40 | 1.30 | 0.60 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 9.90 | 4.80 | 2.40 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 3.60 | 1.30 | 1.20 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 5.20 | 0.90 | 0.80 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 6.50 | 3.40 | 2.10 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 76.10 | 49 | 23.90 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 9.90 | 5.60 | 3.70 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 1.70 | 1.70 | 1 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 2.10 | 1.30 | 0.40 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 73.40 | 48.20 | 22.20 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 10.10 | 5.70 | 4.10 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 8.90 | 4.90 | 3.80 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 2.50 | 0.80 | 1 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 3.80 | 1.10 | 1.90 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 9.70 | 6.30 | 2.80 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 70.40 | 43.60 | 20.80 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 10.10 | 4.50 | 3.40 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 6.90 | 4.40 | 2.80 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 82.30 | 53.30 | 26.30 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 2.10 | 1.20 | 0.30 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 2.20 | 1.10 | 1 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 3.60 | 2 | 0.50 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 4.70 | 1.70 | 1.60 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 10.20 | 5.70 | 3.10 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 8.90 | 4.50 | 2 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 89.20 | 57 | 29.50 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 2.10 | 1.80 | 0.80 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 1.90 | 0.90 | 0.60 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 9.20 | 4.20 | 2.70 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 96.30 | 66.30 | 28.80 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 7.20 | 3.80 | 1.50 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 10 | 4.20 | 2.80 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 2.90 | 1.50 | 1.20 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 3.50 | 1.50 | 1.10 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 8.30 | 4.60 | 2.60 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 98.10 | 65.90 | 30.80 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 7.80 | 4.10 | 3 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 3 | 1.70 | 1.50 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 3.40 | 1.20 | 0.70 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 8.20 | 4.50 | 2.30 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 91.60 | 56 | 32.10 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 4.60 | 1 | 1.10 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 9.10 | 4.50 | 2.40 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 2.50 | 1.50 | 0.70 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 84.60 | 52.20 | 27.50 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 8.10 | 4.60 | 2.40 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 2.90 | 1 | 0.90 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 85.80 | 54.20 | 25.70 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 2.20 | 1.10 | 0.40 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 12.40 | 6.70 | 2.40 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 5.50 | 3.40 | 1.60 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 3 | 1.60 | 0.80 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 87.60 | 58.50 | 25.80 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 10.60 | 6.40 | 3.90 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 3.70 | 2 | 1.50 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 3.80 | 2 | 1.30 |

---
**Next steps:**
- Related: `whatap_k8s_node_memory`, `whatap_k8s_container_top(metric='cpu')`.
```

</details>

#### Step 4: `whatap_k8s_node_memory`

**User Question:** "What's the memory usage across my Kubernetes nodes?"

**Request:**
```json
{
  "name": "whatap_k8s_node_memory",
  "arguments": {
    "timeRange": "5m",
    "projectCode": 33194
  }
}
```

**Response** (25ms, success):
<details><summary>15116 chars</summary>

```
## Kubernetes Node Memory

| oid | oname | onodeName | memory_pused | memory_used | memory_total |
| --- | --- | --- | --- | --- | --- |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 74.77 | 1490759680 | 1993715712 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 67.80 | 1351647232 | 1993715712 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 45.48 | 906739712 | 1993715712 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 93.99 | 7658999808 | 8149118976 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 65.56 | 1307082752 | 1993715712 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 45.47 | 906608640 | 1993715712 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 65.57 | 1307336704 | 1993715712 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 74.81 | 1491521536 | 1993715712 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 67.80 | 1351774208 | 1993715712 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 93.88 | 7650136064 | 8149118976 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 45.47 | 906608640 | 1993715712 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 65.57 | 1307336704 | 1993715712 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 94.18 | 7675015168 | 8149118976 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 75.03 | 1495916544 | 1993715712 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 66.78 | 1331339264 | 1993715712 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 93.81 | 7644590080 | 8149118976 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 45.75 | 912027648 | 1993715712 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 65.58 | 1307574272 | 1993715712 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 75.10 | 1497292800 | 1993715712 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 66.80 | 1331863552 | 1993715712 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 75.10 | 1497292800 | 1993715712 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 67.14 | 1338499072 | 1993715712 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 93.68 | 7634407424 | 8149118976 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 45.75 | 912027648 | 1993715712 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 65.60 | 1307815936 | 1993715712 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 44.91 | 895303680 | 1993715712 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 65.62 | 1308332032 | 1993715712 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 75.19 | 1499070464 | 1993715712 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 67.14 | 1338494976 | 1993715712 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 93.61 | 7628374016 | 8149118976 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 44.91 | 895418368 | 1993715712 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 93.69 | 7635144704 | 8149118976 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 65.63 | 1308524544 | 1993715712 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 75.19 | 1499066368 | 1993715712 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 67.14 | 1338609664 | 1993715712 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 93.44 | 7614488576 | 8149118976 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 45.13 | 899792896 | 1993715712 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 65.72 | 1310330880 | 1993715712 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 75.20 | 1499312128 | 1993715712 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 67.15 | 1338839040 | 1993715712 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 67.15 | 1338839040 | 1993715712 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 45.13 | 899792896 | 1993715712 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 93.35 | 7607078912 | 8149118976 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 75.21 | 1499406336 | 1993715712 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 65.74 | 1310740480 | 1993715712 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 75.28 | 1500954624 | 1993715712 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 45.21 | 901341184 | 1993715712 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 65.78 | 1311408128 | 1993715712 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 67.26 | 1341063168 | 1993715712 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 93.55 | 7623401472 | 8149118976 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 75.32 | 1501687808 | 1993715712 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 45.22 | 901570560 | 1993715712 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 65.80 | 1311789056 | 1993715712 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 93.30 | 7603023872 | 8149118976 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 67.28 | 1341308928 | 1993715712 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 75.43 | 1503956992 | 1993715712 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 45.45 | 906215424 | 1993715712 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 65.79 | 1311723520 | 1993715712 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 67.59 | 1347596288 | 1993715712 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 93.34 | 7606063104 | 8149118976 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 67.68 | 1349271552 | 1993715712 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 75.43 | 1503956992 | 1993715712 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 93.22 | 7596609536 | 8149118976 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 45.45 | 906084352 | 1993715712 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 65.79 | 1311723520 | 1993715712 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 45.58 | 908660736 | 1993715712 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 65.79 | 1311723520 | 1993715712 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 67.68 | 1349271552 | 1993715712 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 75.47 | 1504694272 | 1993715712 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 92.76 | 7559323648 | 8149118976 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 45.58 | 908660736 | 1993715712 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 65.79 | 1311723520 | 1993715712 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 67.69 | 1349517312 | 1993715712 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 92.75 | 7558123520 | 8149118976 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 75.49 | 1505038336 | 1993715712 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 75.78 | 1510764544 | 1993715712 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 45.59 | 908918784 | 1993715712 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 65.79 | 1311723520 | 1993715712 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 67.69 | 1349517312 | 1993715712 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 93.28 | 7601704960 | 8149118976 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 76.22 | 1519513600 | 1993715712 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 45.58 | 908791808 | 1993715712 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 65.79 | 1311694848 | 1993715712 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 67.69 | 1349496832 | 1993715712 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 92.67 | 7551721472 | 8149118976 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 65.79 | 1311715328 | 1993715712 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 76.81 | 1531375616 | 1993715712 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 45.60 | 909107200 | 1993715712 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 92.94 | 7573692416 | 8149118976 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 67.70 | 1349705728 | 1993715712 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 45.60 | 909107200 | 1993715712 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 92.76 | 7559290880 | 8149118976 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 65.79 | 1311715328 | 1993715712 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 67.70 | 1349705728 | 1993715712 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 76.89 | 1532919808 | 1993715712 |
| -2057444207 | ip-10-21-11-24.ap-northeast-2.compute.internal | ip-10-21-11-24.ap-northeast-2.compute.internal | 45.60 | 909107200 | 1993715712 |
| -522583238 | ip-10-21-11-138.ap-northeast-2.compute.internal | ip-10-21-11-138.ap-northeast-2.compute.internal | 92.53 | 7540752384 | 8149118976 |
| -219084429 | ip-10-21-13-127.ap-northeast-2.compute.internal | ip-10-21-13-127.ap-northeast-2.compute.internal | 67.70 | 1349812224 | 1993715712 |
| -1624493659 | ip-10-21-11-119.ap-northeast-2.compute.internal | ip-10-21-11-119.ap-northeast-2.compute.internal | 65.79 | 1311715328 | 1993715712 |
| 1326908129 | ip-10-21-13-242.ap-northeast-2.compute.internal | ip-10-21-13-242.ap-northeast-2.compute.internal | 76.83 | 1531727872 | 1993715712 |

---
**Next steps:**
- Related: `whatap_k8s_node_cpu`, `whatap_k8s_container_top(metric='memory')`.
```

</details>

#### Step 5: `whatap_k8s_pod_status`

**User Question:** "List all Kubernetes pods and their status."

**Request:**
```json
{
  "name": "whatap_k8s_pod_status",
  "arguments": {
    "timeRange": "5m",
    "projectCode": 33194
  }
}
```

**Response** (22ms, success):
<details><summary>2001 chars</summary>

```
## Kubernetes Pod Status

| namespace |
| --- |
| default |
| default |
| kube-system |
| kube-system |
| kube-system |
| kube-system |
| kube-system |
| virtual-main |
| whatap-monitoring |
| whatap-monitoring |
| amazon-guardduty |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| kube-system |
| kube-system |
| kube-system |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| virtual-main |
| virtual-main |
| virtual-main |
| virtual-main |
| virtual-main |
| virtual-main |
| virtual-main |
| virtual-main |
| virtual-main |
| virtual-main |
| whatap-monitoring |
| whatap-monitoring |
| whatap-monitoring |
| whatap-monitoring |
| whatap-monitoring |
| whatap-monitoring |
| whatap-monitoring |
| whatap-monitoring |
| whatap-monitoring |
| whatap-monitoring |
| kube-system |
| - |
| default |
| default |
| kube-system |
| kube-system |
| kube-system |
| kube-system |
| kube-system |
| virtual-main |
| whatap-monitoring |
| whatap-monitoring |
| amazon-guardduty |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| kube-system |
| kube-system |
| kube-system |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| multitx-sample |
| virtual-main |
| virtual-main |
| virtual-main |
| virtual-main |
| virtual-main |
| virtual-main |
| virtual-main |
| virtual-main |
| virtual-main |
| virtual-main |
| whatap-monitoring |
| whatap-monitoring |
| whatap-monitoring |
| whatap-monitoring |
| whatap-monitoring |
| whatap-monitoring |
| whatap-monitoring |
| whatap-monitoring |

---
**Next steps:**
- Investigate: `whatap_k8s_events` (warnings/errors), `whatap_k8s_container_top` (resource usage).
```

</details>

**MXQL Query (reconstructed):**
```
CATEGORY kube_pod_stat
TAGLOAD
SELECT [podName, podStatus, namespace, nodeName, containerCount, restartCount]
```
**Diagnosis:** Project 33194 returned no data for this query.

#### Step 6: `whatap_k8s_container_top`

**User Question:** "Which containers are using the most CPU?"

**Request:**
```json
{
  "name": "whatap_k8s_container_top",
  "arguments": {
    "metric": "cpu",
    "projectCode": 33194
  }
}
```

**Response** (21ms, success):
<details><summary>349 chars</summary>

```
No data found for the specified parameters.

**Possible causes:**
- Time range may be too narrow — try "1h" or "6h".
- Project may not have active agents sending data.

**Suggested next steps:**
- `whatap_check_availability(projectCode=33194)` to see which categories have data.
- `whatap_list_agents(projectCode=33194)` to verify agents are active.
```

</details>

**MXQL Query (reconstructed):**
```
CATEGORY kube_container_stat
TAGLOAD
SELECT [containerName, podName, namespace, cpu_usage]
ORDER {key:[cpu_usage], sort:[desc]}
```
**Diagnosis:** Project 33194 returned no data for this query.

#### Step 7: `whatap_k8s_events`

**User Question:** "Show me recent Kubernetes events and warnings."

**Request:**
```json
{
  "name": "whatap_k8s_events",
  "arguments": {
    "timeRange": "5m",
    "projectCode": 33194
  }
}
```

**Response** (22ms, success):
<details><summary>385 chars</summary>

```
No data found for the specified parameters.

**Possible causes:**
- Time range may be too narrow — try "1h" or "6h".
- Project may not have active agents sending data.

**Suggested next steps:**
- `whatap_check_availability(projectCode=33194)` to see which categories have data.
- `whatap_list_agents(projectCode=33194)` to verify agents are active.
- Try a wider time range than "5m".
```

</details>

**MXQL Query (reconstructed):**
```
CATEGORY kube_event
TAGLOAD
SELECT [type, reason, message, namespace, name, kind, oname]
```
**Diagnosis:** Project 33194 returned no data for this query.

## Workflow Quality Assessment

### Next-Steps Coverage

| Tool | Calls | Next-Steps | Rate |
| --- | --- | --- | --- |
| `whatap_list_projects` | 3 | 3 | 100% |
| `whatap_check_availability` | 1 | 1 | 100% |
| `whatap_server_cpu` | 1 | 1 | 100% |
| `whatap_server_memory` | 1 | 1 | 100% |
| `whatap_server_top` | 1 | 1 | 100% |
| `whatap_server_cpu_load` | 1 | 1 | 100% |
| `whatap_alerts` | 1 | 0 | 0% |
| `whatap_apm_tps` | 1 | 1 | 100% |
| `whatap_apm_response_time` | 1 | 1 | 100% |
| `whatap_apm_error` | 1 | 1 | 100% |
| `whatap_apm_active_transactions` | 1 | 1 | 100% |
| `whatap_apm_apdex` | 1 | 1 | 100% |
| `whatap_apm_transaction_stats` | 1 | 1 | 100% |
| `whatap_k8s_node_list` | 1 | 1 | 100% |
| `whatap_k8s_node_cpu` | 1 | 1 | 100% |
| `whatap_k8s_node_memory` | 1 | 1 | 100% |
| `whatap_k8s_pod_status` | 1 | 1 | 100% |
| `whatap_k8s_container_top` | 1 | 1 | 100% |
| `whatap_k8s_events` | 1 | 1 | 100% |

### No-Data Responses (Success but Empty)

| Tool | isError | Has Next-Steps | Response Preview |
| --- | --- | --- | --- |
| `whatap_alerts` | No | No | No alert or event data found — this is normal if there are no active alerts.  **Suggestions:** - Try wider time range (" |
| `whatap_k8s_pod_status` | No | Yes | ## Kubernetes Pod Status  \| namespace \| \| --- \| \| default \| \| default \| \| kube-system \| \| kube-system \| \| kube-system \|  |
| `whatap_k8s_container_top` | No | Yes | No data found for the specified parameters.  **Possible causes:** - Time range may be too narrow — try "1h" or "6h". - P |
| `whatap_k8s_events` | No | Yes | No data found for the specified parameters.  **Possible causes:** - Time range may be too narrow — try "1h" or "6h". - P |

## Overall Latency Distribution

| Stat | Value |
| --- | --- |
| Min | 19ms |
| P50 | 30ms |
| P90 | 106ms |
| P99 | 301ms |
| Max | 301ms |
| Avg | 52ms |
| Count | 21 |

## Per-Tool Latency Breakdown

| Tool | Calls | Min | Avg | P90 | Max |
| --- | --- | --- | --- | --- | --- |
| `whatap_list_projects` | 3 | 46ms | 73ms | 122ms | 122ms |
| `whatap_check_availability` | 1 | 301ms | 301ms | 301ms | 301ms |
| `whatap_server_cpu` | 1 | 37ms | 37ms | 37ms | 37ms |
| `whatap_server_memory` | 1 | 24ms | 24ms | 24ms | 24ms |
| `whatap_server_top` | 1 | 44ms | 44ms | 44ms | 44ms |
| `whatap_server_cpu_load` | 1 | 41ms | 41ms | 41ms | 41ms |
| `whatap_alerts` | 1 | 46ms | 46ms | 46ms | 46ms |
| `whatap_apm_tps` | 1 | 27ms | 27ms | 27ms | 27ms |
| `whatap_apm_response_time` | 1 | 22ms | 22ms | 22ms | 22ms |
| `whatap_apm_error` | 1 | 28ms | 28ms | 28ms | 28ms |
| `whatap_apm_active_transactions` | 1 | 19ms | 19ms | 19ms | 19ms |
| `whatap_apm_apdex` | 1 | 27ms | 27ms | 27ms | 27ms |
| `whatap_apm_transaction_stats` | 1 | 30ms | 30ms | 30ms | 30ms |
| `whatap_k8s_node_list` | 1 | 106ms | 106ms | 106ms | 106ms |
| `whatap_k8s_node_cpu` | 1 | 31ms | 31ms | 31ms | 31ms |
| `whatap_k8s_node_memory` | 1 | 25ms | 25ms | 25ms | 25ms |
| `whatap_k8s_pod_status` | 1 | 22ms | 22ms | 22ms | 22ms |
| `whatap_k8s_container_top` | 1 | 21ms | 21ms | 21ms | 21ms |
| `whatap_k8s_events` | 1 | 22ms | 22ms | 22ms | 22ms |

## Verification Checklist

- [x] Report generated with all 3 scenarios
- [x] Tool count = 34
- [x] Success rate > 80%
- [x] Next-steps rate > 90%
- [x] Per-tool latency < 5s
- [x] No-data cases show guided responses
- [x] Skipped scenarios have clear skip reasons
