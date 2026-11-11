import { describe, expect, it } from "vitest";
import manifest from "../../config/sources.json";
import fixtures from "../fixtures/multi-source/sources.json";
import { configuredSources, enabledSources, parseSources } from "../../src/config/sources";

const first = fixtures.sources[0]!;
const makeSources = (count: number) => Array.from({ length: count }, (_, i) => ({
  ...first, id: `fixture-${i}`, googleDocId: `mock_document_${i}_000000000000000000000000000`,
}));

describe("fixed source manifest", () => {
  it("loads the supplied one-source manifest unchanged", () => {
    expect(parseSources(manifest)).toEqual(manifest.sources);
    expect(configuredSources).toHaveLength(1);
    expect(enabledSources).toHaveLength(1);
  });
  it("loads three independent synthetic sources", () => {
    expect(parseSources(fixtures)).toEqual(fixtures.sources);
  });
  it("accepts twenty configured sources", () => {
    expect(parseSources({ sources: makeSources(20) })).toHaveLength(20);
  });
  it("retains disabled entries without enabling them", () => {
    const sources = fixtures.sources.map((source, i) => ({ ...source, enabled: i === 0 }));
    expect(parseSources({ sources }).filter((source) => source.enabled)).toHaveLength(1);
  });
  it("rejects duplicate source IDs, including disabled entries", () => {
    expect(() => parseSources({ sources: [first, { ...fixtures.sources[1], id: first.id, enabled: false }] })).toThrow("Duplicate id");
  });
  it("rejects duplicate Google document IDs", () => {
    expect(() => parseSources({ sources: [first, { ...first, id: "another" }] })).toThrow("Duplicate googleDocId");
  });
  it.each(["", "short", "https://evil.test/document", "../document", "a".repeat(129), "a".repeat(20) + "?", "a".repeat(20) + "/"])("rejects malformed Google ID %s", (googleDocId) => {
    expect(() => parseSources({ sources: [{ ...first, googleDocId }] })).toThrow("googleDocId");
  });
  it("rejects zero enabled sources", () => {
    expect(() => parseSources({ sources: fixtures.sources.map((source) => ({ ...source, enabled: false })) })).toThrow("At least one source");
  });
  it("rejects an empty manifest", () => {
    expect(() => parseSources({ sources: [] })).toThrow("Invalid source manifest");
  });
  it("rejects twenty-one enabled sources", () => {
    expect(() => parseSources({ sources: makeSources(21) })).toThrow("Invalid source manifest");
  });
  it("also bounds total configured sources including disabled entries", () => {
    expect(() => parseSources({ sources: makeSources(21).map((source, i) => ({ ...source, enabled: i === 0 })) })).toThrow();
  });
  it.each([
    { ...first, id: "../bad" }, { ...first, title: " " },
    { ...first, enabled: "true" }, { ...first, url: "https://evil.test" },
    { id: first.id, title: first.title, googleDocId: first.googleDocId },
  ])("rejects invalid fields and arbitrary URL properties", (source) => {
    expect(() => parseSources({ sources: [source] })).toThrow();
  });
  it("rejects unknown top-level properties", () => {
    expect(() => parseSources({ ...fixtures, url: "https://evil.test" })).toThrow();
  });
});
