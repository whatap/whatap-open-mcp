// Project types (field names match actual API response)
export interface Project {
  projectCode: number;
  projectName: string;
  platform: string;
  productType: string;
  apiToken: string;
  createTime?: string;
  status?: string;
}

export interface ProjectListResponse {
  data: Project[];
  accountEmail?: string;
  total?: number;
}

// Project info (from /open/api/json/project - uses different field names)
export interface ProjectInfo {
  projectCode: number;
  name: string;
  platform: string;
  productType: string;
  gatewayName?: string;
  status?: string;
}

// Agent types (field names match actual API response)
export interface Agent {
  oname: string;
  active: boolean;
  host_ip?: string;
  oid?: number;
  os?: string;
  version?: string;
}

export interface AgentListResponse {
  data: Agent[];
}

// MXQL types (field names match actual API: "mql" not "mxql", "param" not "params")
export interface MxqlTextParams {
  stime: number;
  etime: number;
  mql: string;
  limit?: number;
  pageKey?: string;
  param?: Record<string, string>;
  inject?: Record<string, string>;
}

export interface MxqlPathParams {
  stime: number;
  etime: number;
  mxqlPath: string;
  limit?: number;
  pageKey?: string;
  param?: Record<string, string>;
}

// MXQL response is a flat array of row objects
export type MxqlResult = MxqlRow[];

export interface MxqlRow {
  [key: string]: unknown;
}

// API error
export interface ApiError {
  code: number;
  message: string;
  msg?: string;
}

// Alert/Event types
export interface AlertEvent {
  id?: number;
  title: string;
  message?: string;
  level: string;
  time: number;
  oname?: string;
  status?: string;
}

// Stat types
export interface TransactionStat {
  url: string;
  count: number;
  totalTime: number;
  avgTime: number;
  maxTime: number;
  errorCount: number;
}
