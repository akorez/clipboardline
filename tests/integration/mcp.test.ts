import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { unstable_dev, type Unstable_DevWorker } from "wrangler";

describe("local Worker Streamable HTTP handshake", () => {
  let worker: Unstable_DevWorker;
  beforeAll(async () => {
    worker = await unstable_dev("src/index.ts", {
      config: "wrangler.jsonc", local: true, ip: "127.0.0.1", port: 0,
      inspectorPort: 0, persist: false, logLevel: "error",
      experimental: { disableExperimentalWarning: true, disableDevRegistry: true },
    });
  }, 60_000);
  afterAll(async () => { await worker?.stop(); });

  const rpc = (body: unknown, headers: Record<string, string> = {}) => worker.fetch("/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...headers },
    body: JSON.stringify(body),
  });
  // Legacy Streamable HTTP clients receive SSE frames; modern requests can
  // receive JSON. Exercise the legacy Inspector-compatible wire format too.
  const readRpc = async (response: Awaited<ReturnType<typeof rpc>>) => {
    const body = await response.text();
    if (response.headers.get("content-type")?.includes("text/event-stream")) {
      const data = body.split(/\r?\n/).find((line) => line.startsWith("data: "));
      if (!data) throw new Error("Missing MCP response frame");
      return JSON.parse(data.slice(6));
    }
    return JSON.parse(body);
  };

  it("initializes, lists only ping, and calls it without a session", async () => {
    const initialized = await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: {
      protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "m0-local-check", version: "0.0.0" },
    } });
    expect(initialized.status).toBe(200);
    expect(initialized.headers.get("mcp-session-id")).toBeNull();
    expect(await readRpc(initialized)).toMatchObject({ id: 1, result: { serverInfo: { name: "inburgeren-nl-mcp" }, capabilities: { tools: {} } } });
    const list = await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    expect(list.status).toBe(200);
    expect(await readRpc(list)).toMatchObject({ result: { tools: [{ name: "ping", annotations: { readOnlyHint: true } }] } });
    const listed = await rpc({ jsonrpc: "2.0", id: 3, method: "tools/list", params: {} });
    const data = await readRpc(listed) as { result: { tools: unknown[] } };
    expect(data.result.tools).toHaveLength(1);
    const pong = await rpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "ping", arguments: {} } });
    expect(await readRpc(pong)).toMatchObject({ result: { content: [{ type: "text", text: '{"status":"ok","enabledSources":1}' }] } });
  });

  it("rejects unexpected ping input", async () => {
    const response = await rpc({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "ping", arguments: { url: "https://example.invalid" } } });
    const body = await readRpc(response) as { error?: unknown; result?: { isError?: boolean } };
    expect(Boolean(body.error) || body.result?.isError === true).toBe(true);
  });
  it("restricts the route and methods", async () => {
    expect((await worker.fetch("/")).status).toBe(404);
    for (const method of ["GET", "DELETE", "PUT", "OPTIONS"]) {
      expect((await worker.fetch("/mcp", { method })).status).toBe(405);
    }
  });
  it("rejects an untrusted Origin and emits no open CORS headers", async () => {
    const response = await rpc({ jsonrpc: "2.0", id: 6, method: "tools/list" }, { Origin: "https://evil.invalid" });
    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });
});
