import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { WhatapApiClient } from "../api/client.js";
import { registerCatalogTools } from "./catalog.js";
import { registerProjectTools } from "./project.js";
import { registerServerTools } from "./server.js";
import { registerApmTools } from "./apm.js";
import { registerKubernetesTools } from "./kubernetes.js";
import { registerDatabaseTools } from "./database.js";
import { registerLogTools } from "./log.js";
import { registerAlertTools } from "./alert.js";
import { registerMxqlTools } from "./mxql.js";

export function registerAllTools(
  server: McpServer,
  client: WhatapApiClient
): void {
  registerCatalogTools(server, client);
  registerProjectTools(server, client);
  registerServerTools(server, client);
  registerApmTools(server, client);
  registerKubernetesTools(server, client);
  registerDatabaseTools(server, client);
  registerLogTools(server, client);
  registerAlertTools(server, client);
  registerMxqlTools(server, client);
}
