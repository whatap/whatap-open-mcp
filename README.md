# WhaTap MCP Server

Connect your AI assistant to [WhaTap](https://www.whatap.io/) monitoring. Query server, APM, Kubernetes, database, and log metrics through natural language.

**Zero dependencies.** Just Node.js and your WhaTap API token.

---

## Setup (4 steps)

### Step 1. Install Node.js

Check if you already have it:

```bash
node --version
```

If it prints `v18.x.x` or later, skip to Step 2.

If not installed, pick your OS:

<details>
<summary><b>macOS</b></summary>

```bash
brew install node
```

Don't have Homebrew? Install it from https://brew.sh, or download Node.js directly from https://nodejs.org

</details>

<details>
<summary><b>Windows</b></summary>

```powershell
winget install OpenJS.NodeJS.LTS
```

Or download the installer from https://nodejs.org (LTS version). After install, **open a new terminal**.

</details>

<details>
<summary><b>Linux (Ubuntu / Debian)</b></summary>

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

> The default `apt install nodejs` gives an old version. Use NodeSource for v18+.

</details>

<details>
<summary><b>Linux (Fedora / RHEL)</b></summary>

```bash
sudo dnf install -y nodejs npm
```

</details>

<details>
<summary><b>Any OS (via nvm)</b></summary>

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install --lts
```

</details>

### Step 2. Get your WhaTap API token

1. Log in to [WhaTap Console](https://service.whatap.io/)
2. Click your profile icon (top-right) → **Account Management**
3. Scroll to **API Token** → copy the token

### Step 3. Connect to your AI client

Pick your client and run **one command**:

**Claude Desktop** — edit `claude_desktop_config.json`:

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

Config file location: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) · `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

**Claude Code** — one command:

```bash
claude mcp add whatap \
  -e WHATAP_API_TOKEN=YOUR_TOKEN_HERE \
  -- npx -y github:whatap/whatap-open-mcp
```

**Codex CLI** — one command:

```bash
codex mcp add whatap \
  --env WHATAP_API_TOKEN=YOUR_TOKEN_HERE \
  -- npx -y github:whatap/whatap-open-mcp
```

**Gemini CLI** — one command:

```bash
gemini mcp add whatap \
  -e WHATAP_API_TOKEN=YOUR_TOKEN_HERE \
  -- npx -y github:whatap/whatap-open-mcp
```

### Step 4. Try it

Open your AI client and type:

```
List all my WhaTap projects
```

You should see your projects with their codes, names, and platforms. If you see them, setup is complete.

---

## What you can ask

```
"Show CPU usage for project 12345 over the last hour"
"What's the TPS trend for my Java APM project?"
"Are there any anomalies in project 12345?"
"What data is available for project 12345?"
"Show Kubernetes pod status for my cluster"
"Generate a JVM heap report for the last week"
"Detect performance bottlenecks between services"
```

## How it works

```
You → AI Assistant → whatap-mcp → WhaTap API → monitoring data
```

The server provides 8 tools to your AI assistant:

| Tool | What it does |
|------|-------------|
| `whatap_list_projects` | List all your monitoring projects |
| `whatap_project_info` | Get project details |
| `whatap_list_agents` | List servers/instances in a project |
| `whatap_data_availability` | Browse 640 available queries with semantic badges |
| `whatap_describe_mxql` | Understand a query before running it |
| `whatap_query_mxql` | Run a query — returns data with context, units, and thresholds |
| `whatap_apm_anomaly` | Detect APM performance anomalies |
| `whatap_service_topology` | Map service connections and bottlenecks |

Your AI assistant picks the right tools automatically. You just ask questions in plain language.

## Configuration

| Variable | Required | Default |
|----------|----------|---------|
| `WHATAP_API_TOKEN` | Yes | — |
| `WHATAP_API_URL` | No | `https://api.whatap.io` |

Override `WHATAP_API_URL` only for government or on-premises installations.

## Troubleshooting

**"WHATAP_API_TOKEN environment variable is required"**
→ Token not set. Re-run Step 3 with your actual token.

**"No API token found for project XXXXX"**
→ Project code doesn't exist or isn't accessible. Ask: `List all my WhaTap projects`

**"npx: command not found"**
→ Node.js not installed. Go back to Step 1.

**Tools don't appear in AI client**
→ Restart the AI client after Step 3. For Claude Desktop, fully quit and reopen.

## Documentation

- [User Manual](docs/user-manual.md) — detailed setup for all AI clients with regional configuration
- [Tool Reports](docs/tool/) — per-tool test reports and analysis

## For developers

```bash
npm install        # Install dev dependencies
npm run build      # Build
npm run dev        # Dev mode (needs WHATAP_API_TOKEN env var)
npx @modelcontextprotocol/inspector node dist/index.js   # Test with MCP Inspector
```

## License

[MIT](LICENSE)
