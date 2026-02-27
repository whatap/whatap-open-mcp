import type { Config } from "../config.js";
import type {
  Project,
  ProjectInfo,
  Agent,
  MxqlTextParams,
  MxqlPathParams,
  MxqlResult,
} from "./types.js";

const REQUEST_TIMEOUT = 30_000;

export class WhatapApiClient {
  private baseUrl: string;
  private accountToken: string;
  private projectTokenCache = new Map<number, string>();

  constructor(config: Config) {
    this.baseUrl = config.apiUrl;
    this.accountToken = config.apiToken;
  }

  // --- Account-level operations ---

  async listProjects(): Promise<Project[]> {
    const res = await this.fetchAccount("/open/api/json/projects");
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
      "/open/api/json/project",
      pcode,
      token
    );
    return res.json();
  }

  // --- Project-level operations ---

  async getAgents(pcode: number): Promise<Agent[]> {
    const token = await this.getProjectToken(pcode);
    const res = await this.fetchProject(
      "/open/json/agents",
      pcode,
      token
    );
    const body = await res.json();
    return body.data ?? [];
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
      "/open/api/flush/mxql/text",
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
      "/open/api/flush/mxql/path",
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
