import type { McpServer } from "../mcp/server.js";
import type { WhatapApiClient } from "../api/client.js";
import { registerProjectTools } from "./project.js";
import { registerYardTools } from "./yard.js";
import { registerMeshTools } from "./mesh.js";
import { registerInstallTools } from "./install.js";
import { registerPromqlTools } from "./promql.js";

export function registerAllTools(
  server: McpServer,
  client: WhatapApiClient
): void {
  registerProjectTools(server, client);
  registerYardTools(server, client);
  registerMeshTools(server, client);
  registerInstallTools(server, client);
  registerPromqlTools(server, client);
}
