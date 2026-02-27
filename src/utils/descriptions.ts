// src/utils/descriptions.ts
// Shared Zod .describe() constants reused across all tool files.

export const PARAM_PROJECT_CODE =
  "Project code (pcode). " +
  "Get this by calling whatap_list_projects first — " +
  "it returns all accessible projects with their pcodes.";

export const PARAM_TIME_RANGE =
  'Time range to query. ' +
  'Examples: "5m", "1h", "6h", "1d", "7d", "last 30 minutes". ' +
  'Shorter ranges are faster. Start with "5m" for recent data.';

export const PARAM_TIME_RANGE_OPTIONAL =
  'Time range (default: "1h"). ' +
  'Examples: "5m", "1h", "6h", "1d", "last 30 minutes".';

export const PARAM_OID_SERVER =
  "Agent OID to filter by (optional). " +
  "Get OIDs by calling whatap_list_agents(projectCode). " +
  "Omit to return data for all servers.";

export const PARAM_OID_DB =
  "Database instance OID to filter by (optional). " +
  "Get OIDs by calling whatap_db_instance_list(projectCode).";

export const PARAM_CATEGORY =
  "MXQL category name (e.g., server_base, app_counter, kube_pod_stat). " +
  "Discover valid names with whatap_list_categories.";
