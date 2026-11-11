import { z } from "zod";
import manifest from "../../config/sources.json";

// IDs are opaque Google identifiers, never URLs or paths. Syntax cannot prove
// that a document exists or is public; anonymous accessibility is checked in M1.
export const sourceSchema = z.strictObject({
  id: z.string().min(1).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1).max(200),
  googleDocId: z.string().min(20).max(128).regex(/^[A-Za-z0-9_-]+$/),
  enabled: z.boolean(),
});

export const sourcesSchema = z.strictObject({
  sources: z.array(sourceSchema).min(1).max(20),
}).superRefine(({ sources }, ctx) => {
  const ids = new Set<string>();
  const documentIds = new Set<string>();
  sources.forEach((source, index) => {
    for (const [field, seen] of [["id", ids], ["googleDocId", documentIds]] as const) {
      if (seen.has(source[field])) {
        ctx.addIssue({ code: "custom", path: ["sources", index, field], message: `Duplicate ${field}` });
      }
      seen.add(source[field]);
    }
  });
  if (!sources.some((source) => source.enabled)) {
    ctx.addIssue({ code: "custom", path: ["sources"], message: "At least one source must be enabled" });
  }
});

export type Source = Readonly<z.infer<typeof sourceSchema>>;

export function parseSources(input: unknown): readonly Source[] {
  const result = sourcesSchema.safeParse(input);
  if (!result.success) {
    // Report field locations and validation reasons, never raw config values.
    throw new Error(`Invalid source manifest: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  }
  return Object.freeze(result.data.sources.map((source) => Object.freeze(source)));
}

// Fail at module startup, before any MCP requests can be accepted.
export const configuredSources = parseSources(manifest);
export const enabledSources = Object.freeze(configuredSources.filter((source) => source.enabled));
