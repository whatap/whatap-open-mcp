# WhaTap MCP Server — User Manual

Connect your AI assistant to WhaTap monitoring and query infrastructure, APM, Kubernetes, and database metrics through natural language.

This guide covers setup for **Claude** (Desktop & Code), **Codex CLI**, and **Gemini CLI** across all WhaTap service regions.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Get Your WhaTap API Token](#2-get-your-whatap-api-token)
3. [Setup by AI Client](#3-setup-by-ai-client)
   - [3A. Claude Desktop](#3a-claude-desktop)
   - [3B. Claude Code (CLI)](#3b-claude-code-cli)
   - [3C. Codex CLI (OpenAI)](#3c-codex-cli-openai)
   - [3D. Gemini CLI (Google)](#3d-gemini-cli-google)
4. [Verify the Connection](#4-verify-the-connection)
5. [Your First Prompts](#5-your-first-prompts)
6. [Available Tools](#6-available-tools)
7. [Regional Configuration](#7-regional-configuration)
8. [Troubleshooting](#8-troubleshooting)
9. [Uninstall](#9-uninstall)

---

## 1. Prerequisites

| Requirement | Details |
|-------------|---------|
| **Node.js** | v18.0.0 or later (includes `npm` and `npx`) |
| **WhaTap account** | Free or paid account at [whatap.io](https://www.whatap.io/) |
| **AI client** | One of: Claude Desktop, Claude Code, Codex CLI, or Gemini CLI |

Check your Node.js version:

```bash
node --version   # Must print v18.x.x or later
npx --version    # Must be available
```

If not installed or version is too old:

```bash
# macOS (Homebrew)
brew install node

# Ubuntu / Debian (NodeSource for v18+)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Fedora / RHEL / Amazon Linux
sudo dnf install -y nodejs npm

# Windows (winget)
winget install OpenJS.NodeJS.LTS

# Any OS (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
nvm install --lts
```

> **Note**: The default `apt install nodejs` on Ubuntu often installs an old version (v12-v16). Use NodeSource or nvm to get v18+.

---

## 2. Get Your WhaTap API Token

1. Log in to [WhaTap Console](https://service.whatap.io/)
2. Click your profile icon (top-right) → **Account Management**
3. Scroll to **API Token** section
4. Copy the token

> **This is an account-level token.** It grants access to all projects under your account. Keep it secret.

---

## 3. Setup by AI Client

Choose the section that matches your AI tool. All methods use the same MCP server — only the configuration format differs.

### 3A. Claude Desktop

**Config file location:**

| OS | Path |
|----|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

**Add the following to your config file:**

```json
{
  "mcpServers": {
    "whatap": {
      "command": "npx",
      "args": ["-y", "whatap-mcp"],
      "env": {
        "WHATAP_API_TOKEN": "YOUR_TOKEN_HERE"
      }
    }
  }
}
```

> If you already have other MCP servers configured, add the `"whatap": { ... }` block inside the existing `"mcpServers"` object.

**Restart Claude Desktop** after saving the file.

---

### 3B. Claude Code (CLI)

Run one command:

```bash
claude mcp add whatap \
  -e WHATAP_API_TOKEN=YOUR_TOKEN_HERE \
  -- npx -y github:whatap/whatap-open-mcp
```

**Verify it was added:**

```bash
claude mcp list
```

**Scope options:**

```bash
# Available to all your projects (user scope)
claude mcp add whatap -s user \
  -e WHATAP_API_TOKEN=YOUR_TOKEN_HERE \
  -- npx -y github:whatap/whatap-open-mcp

# Available only to the current project (project scope, shared via .mcp.json)
claude mcp add whatap -s project \
  -e WHATAP_API_TOKEN=YOUR_TOKEN_HERE \
  -- npx -y github:whatap/whatap-open-mcp
```

---

### 3C. Codex CLI (OpenAI)

**Option A — CLI command:**

```bash
codex mcp add whatap \
  --env WHATAP_API_TOKEN=YOUR_TOKEN_HERE \
  -- npx -y github:whatap/whatap-open-mcp
```

**Option B — Config file (`~/.codex/config.toml`):**

```toml
[mcp_servers.whatap]
command = "npx"
args = ["-y", "whatap-mcp"]

[mcp_servers.whatap.env]
WHATAP_API_TOKEN = "YOUR_TOKEN_HERE"
```

**Verify it was added:**

```bash
codex mcp list
```

> **Note:** Codex uses TOML format, not JSON. The config file is shared between Codex CLI and the VS Code extension.

---

### 3D. Gemini CLI (Google)

**Option A — CLI command:**

```bash
gemini mcp add whatap \
  -e WHATAP_API_TOKEN=YOUR_TOKEN_HERE \
  -- npx -y github:whatap/whatap-open-mcp
```

**Option B — Config file (`~/.gemini/settings.json`):**

```json
{
  "mcpServers": {
    "whatap": {
      "command": "npx",
      "args": ["-y", "whatap-mcp"],
      "env": {
        "WHATAP_API_TOKEN": "YOUR_TOKEN_HERE"
      }
    }
  }
}
```

**Verify it was added:**

```bash
gemini mcp list
```

**Scope options:**

| Scope | File | Use case |
|-------|------|----------|
| User (global) | `~/.gemini/settings.json` | Personal, all projects |
| Project | `.gemini/settings.json` (in project root) | Shared with team |

Use `--scope user` or `--scope project` with the CLI command.

---

## 4. Verify the Connection

After setup, open your AI assistant and try:

```
List all my WhaTap monitoring projects.
```

**Expected result:** A list of your projects with project codes (pcode), names, platforms, and product types. If you see this, the connection is working.

**If it doesn't work**, see [Troubleshooting](#8-troubleshooting).

---

## 5. Your First Prompts

Here are practical prompts you can try right away, organized by monitoring type.

### Project Discovery

```
List all my WhaTap projects.
Show detailed info for project 12345.
List all agents running in project 12345.
```

### Server / Infrastructure

```
Show CPU usage for project 12345 over the last hour.
What's the memory usage on my servers in the last 30 minutes?
Show disk usage for project 12345.
What are the top 5 servers by CPU usage?
```

### APM (Application Performance)

```
Show TPS for my Java APM project over the last 5 minutes.
What's the average response time for project 12345?
Are there any transaction errors in the last hour?
Show active transactions — are any stuck?
```

### Kubernetes

```
Show the pod status for my Kubernetes cluster.
List all nodes with CPU and memory usage.
Are there any warning events in the cluster?
```

### Database

```
List all database instances in project 12345.
Show active sessions for my MySQL database.
```

### Anomaly Detection

```
Detect APM anomalies in project 12345 for the last 5 minutes.
Run anomaly detection with high sensitivity over the last hour.
```

### Service Topology

```
Show the service topology for project 12345.
Are there any network bottlenecks between services?
```

### Agent Installation

```
Install the WhaTap server monitoring agent on project 12345.
Install WhaTap Java APM agent for project 12345.
Set up database monitoring for my PostgreSQL project 12345.
Show me how to install the Kubernetes agent for project 12345.
Install the server agent on project 12345 for Debian.
```

### Multi-Step Investigation

```
I'm a sysadmin doing a morning health check.
List my projects, then detect anomalies on the Java APM project,
and show me which agents are active.
```

> **Tip:** Start with `List all my WhaTap projects` to get project codes, then use those codes in subsequent queries.

---

## 6. Available Tools

The MCP server provides 9 tools:

### Core Tools

| Tool | Description |
|------|-------------|
| `whatap_list_projects` | List all monitoring projects with pcode, name, platform |
| `whatap_project_info` | Get detailed info for a specific project |
| `whatap_list_agents` | List agents/instances in a project |

### Data Discovery

| Tool | Description |
|------|-------------|
| `whatap_data_availability` | Browse 640 MXQL queries, probe live data by project |
| `whatap_describe_mxql` | Describe a query path: parameters, fields, raw MXQL |
| `whatap_query_mxql` | Execute an MXQL query and return results |

### Composite Analysis

| Tool | Description |
|------|-------------|
| `whatap_apm_anomaly` | Multi-query APM anomaly detection (TPS, latency, errors, active TX) |
| `whatap_service_topology` | Service connectivity map with bottleneck detection (requires NPM) |

### Agent Installation

| Tool | Description |
|------|-------------|
| `whatap_install_agent` | Get agent installation commands with pre-filled credentials (29 platforms, auto-detects platform) |

#### Supported Platforms

**Infrastructure**: Debian/Ubuntu, Amazon Linux, RHEL/CentOS/Rocky/Oracle/Fedora, SUSE, FreeBSD, AIX, Solaris, HP-UX, Windows Server

**APM**: Java, Node.js, Python, PHP, .NET, Go

**Database**: PostgreSQL, Oracle, Oracle Pro, MySQL/MariaDB, SQL Server, Tibero, CUBRID, Altibase, Redis, MongoDB, IBM DB2, SAP ASE

**Container**: Kubernetes (Helm)

**Server Applications**: Kafka, NGINX, Apache, Aerospike, Apache Pulsar, Milvus, vCenter

**Other**: Log, NPM (Network Performance Monitoring)

#### Agent Installation Prompts

```
Install the WhaTap server agent on project 12345.
Install WhaTap Java APM agent for project 12345.
Set up WhaTap monitoring for my PostgreSQL database (project 12345).
Install the Kubernetes monitoring agent for project 12345.
```

---

## 7. Regional Configuration

### API Endpoint

WhaTap uses a **single global API endpoint** for all regions:

```
https://api.whatap.io
```

This is the default and works for projects in any region — Seoul, Tokyo, Jakarta, Mumbai, Singapore, California, Virginia, Frankfurt.

**You do not need to change the API URL** based on your location. The server routes to the correct regional data automatically based on your project configuration.

### When to Override the API URL

Override `WHATAP_API_URL` only if you use:

| Environment | URL | How to set |
|-------------|-----|------------|
| Standard (SaaS) | `https://api.whatap.io` (default) | No action needed |
| Government / Public Sector | `https://api.gov.whatap.io` | Set `WHATAP_API_URL` |
| On-premises | Your private URL | Set `WHATAP_API_URL` |

**Example with custom API URL (Claude Desktop):**

```json
{
  "mcpServers": {
    "whatap": {
      "command": "npx",
      "args": ["-y", "whatap-mcp"],
      "env": {
        "WHATAP_API_TOKEN": "YOUR_TOKEN_HERE",
        "WHATAP_API_URL": "https://api.gov.whatap.io"
      }
    }
  }
}
```

**Example with custom API URL (Codex CLI):**

```toml
[mcp_servers.whatap]
command = "npx"
args = ["-y", "whatap-mcp"]

[mcp_servers.whatap.env]
WHATAP_API_TOKEN = "YOUR_TOKEN_HERE"
WHATAP_API_URL = "https://api.gov.whatap.io"
```

**Example with custom API URL (Claude Code):**

```bash
claude mcp add whatap \
  -e WHATAP_API_TOKEN=YOUR_TOKEN_HERE \
  -e WHATAP_API_URL=https://api.gov.whatap.io \
  -- npx -y github:whatap/whatap-open-mcp
```

**Example with custom API URL (Gemini CLI):**

```bash
gemini mcp add whatap \
  -e WHATAP_API_TOKEN=YOUR_TOKEN_HERE \
  -e WHATAP_API_URL=https://api.gov.whatap.io \
  -- npx -y github:whatap/whatap-open-mcp
```

### WhaTap Service Regions

Your projects may be hosted in any of these regions. The region is selected when you create a project in the WhaTap console — it does **not** affect the API URL.

| Region | Location | Cloud |
|--------|----------|-------|
| Seoul | South Korea | AWS, Azure, Kakao Cloud |
| Tokyo | Japan | AWS, Azure |
| Singapore | Singapore | AWS |
| Jakarta | Indonesia | AWS |
| Mumbai | India | AWS |
| California | USA West | AWS |
| Virginia | USA East | AWS |
| Frankfurt | Germany | AWS |

---

## 8. Troubleshooting

### "WHATAP_API_TOKEN environment variable is required"

The token is not set or not reaching the MCP server.

**Fix:** Double-check your configuration:
- Claude Desktop: Ensure `"env"` block has `"WHATAP_API_TOKEN"` (not `"WHATAP_TOKEN"`)
- Codex CLI: Ensure `[mcp_servers.whatap.env]` section exists in your TOML
- Gemini CLI: Ensure `"env"` block exists in settings.json
- Claude Code: Re-run `claude mcp add` with the `--env` flag

### "No API token found for project XXXXX"

Your account token is valid, but the project code doesn't exist or isn't accessible.

**Fix:** Run `List all my WhaTap projects` to see valid project codes.

### "npx: command not found"

Node.js is not installed or not in your PATH.

**Fix:** Install Node.js 18+ and ensure `npx` is available:
```bash
node --version   # Should be v18+
npx --version    # Should print a version
```

### MCP server doesn't start / times out

**Fix (all clients):** Test the server manually:
```bash
WHATAP_API_TOKEN=YOUR_TOKEN_HERE npx -y github:whatap/whatap-open-mcp
```
This should start the server and wait for JSON-RPC input on stdin. Press `Ctrl+C` to stop. If it prints an error, the issue is with the token or Node.js version.

### Claude Desktop: Server not appearing

1. Ensure the JSON file is valid (no trailing commas, correct brackets)
2. Fully restart Claude Desktop (quit and reopen, not just close the window)
3. Check the logs: `~/Library/Logs/Claude/mcp*.log` (macOS)

### Codex CLI: Server not appearing

1. Run `codex mcp list` to check if it's registered
2. Ensure `~/.codex/config.toml` is valid TOML (no JSON syntax)
3. Try removing and re-adding: `codex mcp add whatap ...`

### Gemini CLI: Server not appearing

1. Run `gemini mcp list` to check registration
2. Ensure `~/.gemini/settings.json` is valid JSON
3. Check scope: `--scope user` for global, `--scope project` for local

### "WhaTap API error (401)" or "(403)"

Your API token is invalid or expired.

**Fix:** Generate a new token from WhaTap Console → Account Management → API Token.

### Slow responses

- Use shorter time ranges: `"5m"` instead of `"1d"`
- WhaTap API has rate limits — wait a few seconds between rapid queries

---

## 9. Uninstall

### Claude Desktop

Remove the `"whatap"` block from `claude_desktop_config.json` and restart Claude Desktop.

### Claude Code

```bash
claude mcp remove whatap
```

### Codex CLI

Remove the `[mcp_servers.whatap]` section from `~/.codex/config.toml`, or:

```bash
codex mcp add whatap --enabled false -- echo disabled
```

### Gemini CLI

```bash
gemini mcp remove whatap
```

Or remove the `"whatap"` block from `~/.gemini/settings.json`.

### Clear npx cache (optional)

If you want to remove the cached package:

```bash
npx clear-npx-cache
```

---

## Quick Reference Card

| AI Client | Config Format | Config File | Add Command |
|-----------|---------------|-------------|-------------|
| **Claude Desktop** | JSON | `claude_desktop_config.json` | Edit file manually |
| **Claude Code** | — | — | `claude mcp add whatap -e WHATAP_API_TOKEN=... -- npx -y github:whatap/whatap-open-mcp` |
| **Codex CLI** | TOML | `~/.codex/config.toml` | `codex mcp add whatap --env ... -- npx -y github:whatap/whatap-open-mcp` |
| **Gemini CLI** | JSON | `~/.gemini/settings.json` | `gemini mcp add whatap -e ... -- npx -y github:whatap/whatap-open-mcp` |

**Environment variables:**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WHATAP_API_TOKEN` | Yes | — | Account API token from WhaTap Console |
| `WHATAP_API_URL` | No | `https://api.whatap.io` | Override for gov/on-prem only |
