# Inburgeren NL MCP — M0

Foundation for an anonymous, read-only, multi-document Google Docs MCP server.
Only M0 is implemented. The sole tool is a temporary `ping({})`; document
retrieval, caching, `search`, and `fetch` await explicit requests for M1–M3.

## Local development

Use Node.js 22.12+ (Node 22 LTS is used in CI) and npm.

```sh
npm ci
npm run dev
```

The local-only endpoint is `http://127.0.0.1:8787/mcp`. No Cloudflare login,
API key, Google login, OAuth, inference service, or paid resource is needed.
Only POST is accepted; other paths return 404. GET streams and session deletion
are unnecessary for this stateless server and return 405.

```sh
npm run typecheck
npm test
npm run build
```

`build` means `wrangler deploy --dry-run --outdir dist`: it bundles locally and
does not upload or deploy. CI runs these checks only, with `contents: read`, no
persisted checkout credentials, and no production secrets or deployment step.
The lockfile pins the dependency graph; `npm ci` reproduces it.

## Inspector

With the local Worker running, open MCP Inspector, choose **Streamable HTTP**,
and connect to `http://127.0.0.1:8787/mcp` without authentication. Initialize,
list tools (only `ping`), and call `ping` with `{}`. Expected text content:

```json
{"status":"ok","enabledSources":1}
```

Inspector's Node proxy can connect without a browser Origin. The server emits
no CORS headers and rejects untrusted browser Origins; direct cross-origin
browser access is not enabled. The Cloudflare handler supplies local Host and
Origin validation. Local integration tests run the actual Worker runtime and
exercise initialize, tools/list, tools/call, strict input validation, routing,
methods and Origin rejection. The interactive Inspector UI is a separate manual
check and has not been exercised by the automated tests.

## Fixed multi-source manifest

`config/sources.json` is the sole source allowlist. The supplied real document
is preserved. Change only this file to add future owner-provided public sources;
never enter guessed IDs or user-supplied URLs. Each entry requires:

| Field | Validation |
| --- | --- |
| `id` | Unique lowercase letters/digits with single hyphens; 1–64 characters |
| `title` | Nonempty trimmed label, up to 200 characters |
| `googleDocId` | Unique opaque ID; 20–128 ASCII letters/digits/underscores/hyphens |
| `enabled` | Required boolean |

The parser rejects unknown properties, duplicate IDs (including disabled
entries), malformed values, zero enabled sources, and more than 20 configured
entries. The total cap is deliberately stricter than an enabled-only cap, as the
plan specifies 1–20 configured documents. Validation runs at module startup and
returns immutable entries; errors identify fields without echoing raw values.
Syntax validation cannot establish that a document is public or exists; safe
anonymous retrieval belongs to M1. No Google Docs requests happen in M0.

Tests include three explicitly synthetic sources; their IDs are mock values
and are never fetched. No extra real document links or contents were invented.

## Verified API versions

Verified on 2026-11-11 against official documentation and npm peer metadata:
`agents@0.33.0` requires the exact `@modelcontextprotocol/server@2.4.0` peer.
The server uses a fresh `McpServer` factory through `agents/mcp/server`, with
no Durable Object or session storage. Zod is pinned to `4.6.7`, Wrangler to
`4.160.1`, TypeScript to `7.0.2`, and Vitest to `5.1.0`.

- [Cloudflare stateless MCP handler](https://developers.cloudflare.com/agents/model-context-protocol/apis/handler-api/)
- [Official MCP TypeScript SDK v2](https://ts.sdk.modelcontextprotocol.io/v2/)
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)

The Cloudflare documentation example references SDK 2.3.1; the installed Agents
release's exact 2.4.0 peer takes precedence and is checked by the local runtime
test. Legacy Streamable HTTP clients remain supported without server sessions.

## Privacy, cost and remaining milestones

Application code does not log requests, prompts, IPs, tokens, or documents.
Worker observability and Wrangler metrics are disabled. Wrangler's local
terminal may display development diagnostics; do not share local debug output
containing private data. No remote provider behavior or account-level logging
setting has been changed.

No service bindings, database, inference calls, external account changes, or
deployment are configured. `workers_dev` and preview URLs are disabled. A local
bundle does not establish Workers Free CPU compliance; realistic 5/10/20-document
resource measurements, retrieval protections, bounded payloads and broader
security checks remain mandatory in their planned milestones before deployment.
Use the free static-index contingency if later measurements fail; no paid tier
upgrade is authorized.

Stop after M0. M1 requires an explicit developer request. Deployment requires
separate human approval of the target account, exact command, free resources,
and permission. Public directory approval or general Free-user access is not
promised. `ping` must be removed by M3 when the two final tools are registered.
