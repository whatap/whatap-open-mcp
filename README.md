# WhaTap MCP Server

MCP (Model Context Protocol) server for [WhaTap](https://www.whatap.io/) monitoring platform. Enables AI assistants like Claude Desktop and Claude Code to query your server, APM, Kubernetes, database, and log monitoring data.

## Quick Start

### With Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "whatap": {
      "command": "npx",
      "args": ["whatap-mcp"],
      "env": {
        "WHATAP_API_TOKEN": "<your-account-api-token>",
        "WHATAP_API_URL": "https://api.whatap.io"
      }
    }
  }
}
```

### With Claude Code

```bash
claude mcp add whatap -- npx whatap-mcp \
  --env WHATAP_API_TOKEN=<your-token>
```

## Configuration

| Environment Variable | Required | Default | Description |
|---------------------|----------|---------|-------------|
| `WHATAP_API_TOKEN` | Yes | - | WhaTap account-level API token |
| `WHATAP_API_URL` | No | `https://api.whatap.io` | WhaTap API base URL |

## Available Tools (30 total)

### Project Management
- `whatap_list_projects` - List all monitoring projects
- `whatap_project_info` - Get detailed project information
- `whatap_list_agents` - List agents in a project

### Server / Infrastructure Monitoring
- `whatap_server_cpu` - CPU usage metrics
- `whatap_server_memory` - Memory usage metrics
- `whatap_server_disk` - Disk I/O and usage
- `whatap_server_network` - Network I/O metrics
- `whatap_server_process` - Process-level CPU/memory
- `whatap_server_cpu_load` - CPU load averages (1/5/15 min)
- `whatap_server_top` - Top-N servers by CPU/memory/disk

### APM (Application Performance)
- `whatap_apm_tps` - Transactions per second
- `whatap_apm_response_time` - Service response time
- `whatap_apm_error` - Transaction error count/rate
- `whatap_apm_apdex` - APDEX satisfaction score
- `whatap_apm_active_transactions` - Currently active transactions
- `whatap_apm_transaction_stats` - Transaction statistics

### Kubernetes Monitoring
- `whatap_k8s_node_list` - List Kubernetes nodes
- `whatap_k8s_node_cpu` - Node CPU usage
- `whatap_k8s_node_memory` - Node memory usage
- `whatap_k8s_pod_status` - Pod status and statistics
- `whatap_k8s_container_top` - Top containers by CPU/memory
- `whatap_k8s_events` - Recent Kubernetes events

### Database Monitoring
- `whatap_db_instance_list` - List database instances
- `whatap_db_stat` - Database performance stats
- `whatap_db_active_sessions` - Active database sessions
- `whatap_db_wait_analysis` - Wait event analysis (Oracle)

### Log Monitoring
- `whatap_log_search` - Search logs with keyword filter
- `whatap_log_stats` - Log volume statistics

### Alerts & Events
- `whatap_alerts` - Get active/recent alerts

### Advanced
- `whatap_mxql_query` - Execute raw MXQL queries

## Example Usage

Once connected, you can ask your AI assistant:

- "List all my WhaTap projects"
- "Show me the CPU usage for project 12345 over the last hour"
- "What are the top 5 servers by memory usage?"
- "Show active transactions in my APM project"
- "Search logs for 'OutOfMemoryError' in the last 6 hours"
- "Are there any active alerts?"

## Development

```bash
# Install dependencies
npm install

# Run in development mode
WHATAP_API_TOKEN=your_token npx tsx src/index.ts

# Build for production
npm run build

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

## Requirements

- Node.js >= 18.0.0
- WhaTap account with API token

## License

MIT
