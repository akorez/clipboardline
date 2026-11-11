import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { enabledSources } from "../config/sources";

export function createServer(): McpServer {
  const server = new McpServer({ name: "inburgeren-nl-mcp", version: "0.0.0" });
  // Temporary M0 handshake tool. Remove when search/fetch are wired in M3.
  server.registerTool("ping", {
    description: "Temporary M0 connectivity check; returns no document content.",
    inputSchema: z.strictObject({}),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async () => ({
    content: [{ type: "text", text: JSON.stringify({ status: "ok", enabledSources: enabledSources.length }) }],
  }));
  return server;
}
