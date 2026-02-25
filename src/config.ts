export interface Config {
  apiToken: string;
  apiUrl: string;
}

export function loadConfig(): Config {
  const apiToken = process.env.WHATAP_API_TOKEN;
  if (!apiToken) {
    throw new Error(
      "WHATAP_API_TOKEN environment variable is required. " +
        "Set it to your WhaTap account API token."
    );
  }

  const apiUrl = (
    process.env.WHATAP_API_URL || "https://api.whatap.io"
  ).replace(/\/+$/, "");

  return { apiToken, apiUrl };
}
