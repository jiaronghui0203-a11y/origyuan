export function buildResponse({ ok = true, source, message, data = {} }) {
  return {
    ok,
    source,
    message,
    data,
    ts: new Date().toISOString()
  };
}

export function sendJson(res, statusCode, payload) {
  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(statusCode).json(payload);
  }

  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}
