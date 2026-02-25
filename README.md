# WhaTap Open MCP Server

[MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server for the [WhaTap](https://www.whatap.io/) monitoring platform.

Connect your AI assistant to WhaTap and query server, APM, Kubernetes, database, and log monitoring data through natural language.

## Quick Start

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "whatap": {
      "command": "npx",
      "args": ["whatap-mcp"],
      "env": {
        "WHATAP_API_TOKEN": "<your-account-api-token>"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add whatap -- npx whatap-mcp \
  --env WHATAP_API_TOKEN=<your-token>
```

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WHATAP_API_TOKEN` | Yes | — | WhaTap account-level API token |
| `WHATAP_API_URL` | No | `https://api.whatap.io` | WhaTap API base URL |

Get your API token from **WhaTap Console > Account > API Token**.

## Available Tools (30)

### Project Management (3)

| Tool | Description |
|------|-------------|
| `whatap_list_projects` | List all monitoring projects |
| `whatap_project_info` | Get detailed project information |
| `whatap_list_agents` | List agents (servers/instances) in a project |

### Server / Infrastructure (7)

| Tool | Description |
|------|-------------|
| `whatap_server_cpu` | CPU usage (total, user, system, idle) |
| `whatap_server_memory` | Memory usage (used %, used bytes, total) |
| `whatap_server_disk` | Disk I/O and usage per mount point |
| `whatap_server_network` | Network I/O (bytes in/out per second) |
| `whatap_server_process` | Process-level CPU and memory |
| `whatap_server_cpu_load` | CPU load averages (1/5/15 min) |
| `whatap_server_top` | Top-N servers by CPU, memory, or disk |

### APM — Application Performance (6)

| Tool | Description |
|------|-------------|
| `whatap_apm_tps` | Transactions per second |
| `whatap_apm_response_time` | Service response time |
| `whatap_apm_error` | Transaction error count and rate |
| `whatap_apm_apdex` | APDEX satisfaction score |
| `whatap_apm_active_transactions` | Currently active (in-flight) transactions |
| `whatap_apm_transaction_stats` | Transaction statistics (count, avg time, errors) |

### Kubernetes (6)

| Tool | Description |
|------|-------------|
| `whatap_k8s_node_list` | List nodes with CPU and memory overview |
| `whatap_k8s_node_cpu` | Node CPU usage |
| `whatap_k8s_node_memory` | Node memory usage |
| `whatap_k8s_pod_status` | Pod status and restart counts |
| `whatap_k8s_container_top` | Top containers by CPU or memory |
| `whatap_k8s_events` | Recent cluster events (warnings, errors) |

### Database (4)

| Tool | Description |
|------|-------------|
| `whatap_db_instance_list` | List database instances |
| `whatap_db_stat` | Performance stats (active sessions, locks, CPU) |
| `whatap_db_active_sessions` | Active sessions with SQL text and wait events |
| `whatap_db_wait_analysis` | Wait event analysis (Oracle) |

### Log (2)

| Tool | Description |
|------|-------------|
| `whatap_log_search` | Search logs by keyword |
| `whatap_log_stats` | Log volume statistics |

### Alerts (1)

| Tool | Description |
|------|-------------|
| `whatap_alerts` | Get active/recent alert events |

### Advanced (1)

| Tool | Description |
|------|-------------|
| `whatap_mxql_query` | Execute raw MXQL queries |

## Example Prompts

Once connected, ask your AI assistant:

```
"List all my WhaTap projects"
"Show CPU usage for project 12345 over the last hour"
"What are the top 5 servers by memory usage?"
"Show active transactions in my APM project"
"Are there any pods in CrashLoopBackOff?"
"Search logs for 'OutOfMemoryError' in the last 6 hours"
"Are there any active alerts?"
```

## Architecture

```
AI Assistant ←→ stdio (JSON-RPC) ←→ whatap-mcp ←→ WhaTap API
                                        │
                                        ├── 30 MCP tools
                                        ├── MXQL query builders
                                        ├── Project token caching
                                        └── Markdown response formatting
```

- **Transport:** stdio via `@modelcontextprotocol/sdk`
- **Data layer:** All metrics queried via [MXQL](https://docs.whatap.io/mxql/mxql-overview) (WhaTap's Monitoring Query Language)
- **Auth:** Two-tier — account token for project listing, per-project tokens cached automatically
- **Output:** Markdown tables optimized for LLM consumption

## Development

```bash
# Install dependencies
npm install

# Development mode
WHATAP_API_TOKEN=your_token npm run dev

# Build
npm run build

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

### Project Structure

```
src/
├── index.ts           # MCP server entry point (stdio transport)
├── config.ts          # Environment variable loading
├── api/
│   ├── client.ts      # WhatapApiClient (HTTP, auth, token caching)
│   ├── types.ts       # TypeScript interfaces
│   └── mxql.ts        # MXQL query builders (23 functions)
├── tools/
│   ├── index.ts       # Tool registration hub
│   ├── project.ts     # Project management (3 tools)
│   ├── server.ts      # Server monitoring (7 tools)
│   ├── apm.ts         # APM (6 tools)
│   ├── kubernetes.ts  # Kubernetes (6 tools)
│   ├── database.ts    # Database (4 tools)
│   ├── log.ts         # Log monitoring (2 tools)
│   ├── alert.ts       # Alerts (1 tool)
│   └── mxql.ts        # Raw MXQL (1 tool)
└── utils/
    ├── time.ts        # Time range parser ("5m", "1h", "last 7 days")
    └── format.ts      # Response formatters (Markdown tables)
```

## Requirements

- Node.js >= 18.0.0
- WhaTap account with API token

## License

[MIT](LICENSE)
