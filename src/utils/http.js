export async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8").trim();
  if (!rawBody) {
    return {};
  }

  return JSON.parse(rawBody);
}

export function joinUrl(baseUrl, path = "") {
  const normalizedBaseUrl = String(baseUrl || "").replace(/\/+$/, "");
  const normalizedPath = String(path || "").replace(/^\/+/, "");

  if (!normalizedBaseUrl) {
    return "";
  }

  if (!normalizedPath) {
    return normalizedBaseUrl;
  }

  return `${normalizedBaseUrl}/${normalizedPath}`;
}

export async function fetchJsonWithTimeout(url, { headers = {}, timeoutMs = 3000 } = {}) {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(timeoutMs)
  });
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return {
      response,
      body: await response.json()
    };
  }

  return {
    response,
    body: {
      raw: await response.text()
    }
  };
}

export function toErrorMessage(error) {
  if (!error) {
    return "Unknown error.";
  }

  if (error.name === "TimeoutError") {
    return "Request timed out.";
  }

  return error.message || String(error);
}
