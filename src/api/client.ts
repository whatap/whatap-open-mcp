import type { Config } from "../config.js";
import type {
  Project,
  ProjectInfo,
  ProjectAccess,
  Agent,
  MxqlTextParams,
  MxqlPathParams,
  MxqlResult,
} from "./types.js";

const REQUEST_TIMEOUT = 30_000;

interface AgentInfo {
  oname: string;
  okindName?: string;
}

export class WhatapApiClient {
  private baseUrl: string;
  private accountToken: string;
  private projectTokenCache = new Map<number, string>();
  private agentCache = new Map<number, Map<number, AgentInfo>>();

  constructor(config: Config) {
    this.baseUrl = config.apiUrl;
    this.accountToken = config.apiToken;
  }

  // --- Account-level operations ---

  async listProjects(): Promise<Project[]> {
    const res = await this.fetchAccount("/open-mcp/api/json/projects");
    const body = await res.json();
    const projects: Project[] = body.data ?? body;
    // Cache project tokens
    for (const p of projects) {
      if (p.apiToken && p.projectCode) {
        this.projectTokenCache.set(p.projectCode, p.apiToken);
      }
    }
    return projects;
  }

  async getProjectInfo(pcode: number): Promise<ProjectInfo> {
    const token = await this.getProjectToken(pcode);
    const res = await this.fetchProject(
      "/open-mcp/api/json/project",
      pcode,
      token
    );
    return res.json();
  }

  async getProjectAccess(pcode: number): Promise<ProjectAccess> {
    const token = await this.getProjectToken(pcode);
    const res = await this.fetchProject(
      `/open-mcp/api/json/project/access/${pcode}`,
      pcode,
      token
    );
    return res.json();
  }

  // --- Project-level operations ---

  async getAgents(pcode: number): Promise<Agent[]> {
    const token = await this.getProjectToken(pcode);
    const res = await this.fetchProject(
      "/open-mcp/json/agents",
      pcode,
      token
    );
    const body = await res.json();
    const agents: Agent[] = body.data ?? [];

    // Populate agent cache for oid→oname resolution
    const oidMap = new Map<number, AgentInfo>();
    for (const a of agents) {
      if (a.oid != null && a.oname) {
        oidMap.set(a.oid, {
          oname: a.oname,
          okindName: (a as unknown as Record<string, unknown>).okindName as string | undefined,
        });
      }
    }
    this.agentCache.set(pcode, oidMap);

    return agents;
  }

  /**
   * Resolve oid values to oname strings for a project.
   * Auto-fetches agent list if cache is cold.
   * Returns a map of oid → AgentInfo (oname + optional okindName).
   */
  async resolveOids(
    pcode: number,
    oids: number[]
  ): Promise<Map<number, AgentInfo>> {
    // Ensure cache is populated
    if (!this.agentCache.has(pcode)) {
      await this.getAgents(pcode);
    }

    const cache = this.agentCache.get(pcode)!;
    const result = new Map<number, AgentInfo>();
    for (const oid of oids) {
      const info = cache.get(oid);
      if (info) result.set(oid, info);
    }
    return result;
  }

  // --- Event history ---

  /**
   * Get alert/event history for a project via REST API.
   * Works for all project types (APM, DB, Server, K8s, etc.).
   */
  async getEventHistory(
    pcode: number,
    params: { stime: number; etime: number }
  ): Promise<{ records: Array<Record<string, unknown>>; total: number }> {
    const token = await this.getProjectToken(pcode);
    const qs = `stime=${params.stime}&etime=${params.etime}&progress=true`;
    const res = await this.fetchProject(
      `/open-mcp/api/json/event/history?${qs}`,
      pcode,
      token
    );
    const text = await res.text();
    if (!text || text.trim() === "") {
      return { records: [], total: 0 };
    }
    const body = JSON.parse(text);
    // Handle 204 no content
    if (body?.code === 204 || body?.result === "no content") {
      return { records: [], total: 0 };
    }
    return {
      records: body?.records ?? body?.data ?? [],
      total: body?.total ?? 0,
    };
  }

  // --- PromQL / OpenMetrics operations ---

  /**
   * Execute a PromQL query via the MXQL text endpoint using OPENMX wrapper.
   */
  async executePromql(
    pcode: number,
    params: { query: string; stime: number; etime: number; limit?: number }
  ): Promise<MxqlResult> {
    const mql = `OPENMX ${params.query}`;
    return this.executeMxqlText(pcode, {
      stime: params.stime,
      etime: params.etime,
      mql,
      limit: params.limit ?? 500,
    });
  }

  /**
   * List available OpenMetrics for a project via OPENMX ls.
   * Returns rows with: time, metric, type (gauge/counter/histogram).
   */
  async listOpenMetrics(
    pcode: number,
    params: { stime: number; etime: number; filter?: string; limit?: number }
  ): Promise<MxqlResult> {
    const mql = params.filter
      ? `OPENMX ls ${params.filter}`
      : `OPENMX ls`;
    return this.executeMxqlText(pcode, {
      stime: params.stime,
      etime: params.etime,
      mql,
      limit: params.limit ?? 500,
    });
  }

  /**
   * Describe an OpenMetric: type, label sets, cardinality via OPENMX status.
   */
  async describeOpenMetric(
    pcode: number,
    params: { stime: number; etime: number; metric: string }
  ): Promise<MxqlResult> {
    const mql = `OPENMX status ${params.metric}`;
    return this.executeMxqlText(pcode, {
      stime: params.stime,
      etime: params.etime,
      mql,
      limit: 500,
    });
  }

  // --- MXQL operations ---

  async executeMxqlText(
    pcode: number,
    params: MxqlTextParams
  ): Promise<MxqlResult> {
    const token = await this.getProjectToken(pcode);
    // Ensure pageKey is set
    const payload = { pageKey: "mxql", ...params };
    const res = await this.fetchProject(
      "/open-mcp/api/flush/mxql/text",
      pcode,
      token,
      {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      }
    );
    const data = await res.json();
    // Response is a flat array of row objects
    if (Array.isArray(data)) return data;
    // Detect error objects returned as non-array JSON
    if (data && typeof data === "object") {
      const errMsg = data.error || data.message || data.msg;
      if (errMsg) {
        throw new Error(
          `MXQL query error for project ${pcode}: ${errMsg}`
        );
      }
    }
    return [];
  }

  async executeMxqlPath(
    pcode: number,
    params: MxqlPathParams
  ): Promise<MxqlResult> {
    const token = await this.getProjectToken(pcode);
    const payload = { pageKey: "mxql", ...params };
    const res = await this.fetchProject(
      "/open-mcp/api/flush/mxql/path",
      pcode,
      token,
      {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      }
    );
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object") {
      const errMsg = data.error || data.message || data.msg;
      if (errMsg) {
        throw new Error(
          `MXQL path query error for project ${pcode}: ${errMsg}`
        );
      }
    }
    return [];
  }

  // --- Category probing ---

  /**
   * Probe a single category to check if it has data for a project.
   * Returns true if at least one row is returned.
   */
  async probeCategory(
    pcode: number,
    category: string,
    loadType: "TAGLOAD" | "FLEXLOAD" | "LogCountLoad" | "unknown" = "TAGLOAD"
  ): Promise<boolean> {
    const etime = Date.now();
    const stime = etime - 2 * 60_000; // 2 minutes (safe: 5-min cache buffer)

    const load =
      loadType === "FLEXLOAD"
        ? "FLEXLOAD"
        : loadType === "LogCountLoad"
          ? "FLEXLOAD"
          : "TAGLOAD";

    const selectField =
      loadType === "FLEXLOAD" ? "oid" : "time";

    const mql = `CATEGORY ${category}\n${load}\nSELECT [${selectField}]\nLIMIT 1`;

    try {
      const result = await this.executeMxqlText(pcode, {
        stime,
        etime,
        mql,
        limit: 1,
      });
      return Array.isArray(result) && result.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Probe multiple categories in parallel for a project.
   * Returns a map of category → hasData.
   */
  async probeCategoriesForProject(
    pcode: number,
    categories: Array<{ name: string; loadType?: "TAGLOAD" | "FLEXLOAD" | "LogCountLoad" | "unknown" }>
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const promises = categories.map(async ({ name, loadType }) => {
      const hasData = await this.probeCategory(pcode, name, loadType);
      results.set(name, hasData);
    });
    await Promise.all(promises);
    return results;
  }

  // --- Open API stat endpoints ---

  async getOpenApi(
    path: string,
    pcode: number,
    queryParams?: Record<string, string | number>
  ): Promise<unknown> {
    const token = await this.getProjectToken(pcode);
    let url = path;
    if (queryParams) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(queryParams)) {
        qs.set(k, String(v));
      }
      url += `?${qs.toString()}`;
    }
    const res = await this.fetchProject(url, pcode, token);
    return res.json();
  }

  // --- Helpers ---

  async getProjectToken(pcode: number): Promise<string> {
    const cached = this.projectTokenCache.get(pcode);
    if (cached) return cached;

    // Fetch all projects to populate cache
    await this.listProjects();
    const token = this.projectTokenCache.get(pcode);
    if (!token) {
      throw new Error(
        `No API token found for project ${pcode}. ` +
          `Ensure your account token has access to this project.`
      );
    }
    return token;
  }

  private async fetchAccount(
    path: string,
    init?: RequestInit
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        "x-whatap-token": this.accountToken,
        ...init?.headers,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `WhaTap API error (${res.status}): ${text || res.statusText}`
      );
    }
    return res;
  }

  private async fetchProject(
    path: string,
    pcode: number,
    token: string,
    init?: RequestInit
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        "x-whatap-token": token,
        "x-whatap-pcode": String(pcode),
        ...init?.headers,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `WhaTap API error (${res.status}) for project ${pcode}: ${text || res.statusText}`
      );
    }
    return res;
  }
}
