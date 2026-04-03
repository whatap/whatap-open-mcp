import { McpServer } from "./mcp/server.js";
import { StdioTransport } from "./mcp/transport.js";
import { loadConfig } from "./config.js";
import { WhatapApiClient } from "./api/client.js";
import { registerAllTools } from "./tools/index.js";
import { VERSION } from "./version.js";

export { VERSION };

if (process.argv.includes("--version") || process.argv.includes("-v")) {
  console.log(`whatap-mcp ${VERSION}`);
  process.exit(0);
}

async function main() {
  const config = loadConfig();
  const client = new WhatapApiClient(config);

  const server = new McpServer({
    name: "whatap-mcp",
    version: VERSION,
  });

  registerAllTools(server, client);

  const transport = new StdioTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Failed to start WhaTap MCP server:", err);
  process.exit(1);
});
