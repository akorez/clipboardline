import { createMcpHandler } from "agents/mcp/server";
import { createServer } from "./mcp/server";

const handler = createMcpHandler(createServer, {
  route: "/mcp",
  corsOptions: false,
  responseMode: "json",
});

export default {
  async fetch(request, env, ctx): Promise<Response> {
    if (new URL(request.url).pathname !== "/mcp") {
      return new Response("Not found", { status: 404 });
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
    }
    try {
      return await handler(request, env, ctx);
    } catch {
      return new Response("MCP request failed", { status: 500 });
    }
  },
} satisfies ExportedHandler;
