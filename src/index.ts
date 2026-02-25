import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { WhatapApiClient } from "./api/client.js";
import { registerAllTools } from "./tools/index.js";

async function main() {
  const config = loadConfig();
  const client = new WhatapApiClient(config);

  const server = new McpServer({
    name: "whatap-mcp",
    version: "1.0.0",
  });

  registerAllTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Failed to start WhaTap MCP server:", err);
  process.exit(1);
});
