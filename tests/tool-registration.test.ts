import { describe, it, expect } from 'vitest';
import { McpServer } from '../src/mcp/server.ts';
import { WhatapApiClient } from '../src/api/client.ts';
import { registerAllTools } from '../src/tools/index.ts';

describe('tool registration', () => {
  it('registers all 10 tools with correct names', () => {
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    const client = new WhatapApiClient({
      apiToken: 'test',
      apiUrl: 'http://localhost',
    });

    registerAllTools(server, client);

    const tools = (server as any)._tools as Map<string, unknown>;
    expect(tools.size).toBe(10);

    const expectedNames = [
      'whatap_list_projects',
      'whatap_project_info',
      'whatap_list_agents',
      'whatap_data_availability',
      'whatap_describe_query',
      'whatap_query_data',
      'whatap_apm_anomaly',
      'whatap_service_topology',
      'whatap_install_agent',
      'whatap_create_promql',
    ];

    for (const name of expectedNames) {
      expect(tools.has(name)).toBe(true);
    }
  });
});
