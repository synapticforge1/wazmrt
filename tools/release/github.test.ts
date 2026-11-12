// Self-test for tools/release/github.ts against an in-memory GitHub (no network). Run: `bun test tools/release`.
// Every refusal must send NO write; every success must read back.
import { describe, expect, test } from "bun:test";
import { type Ctx, isRelease, peel, release, releaseNotes, rootVersion, tag } from "./github.ts";

const SHA = "a".repeat(40);
const OTHER = "b".repeat(40);

function mock(opts: { refs?: Record<string, { type: string; sha: string }>; tagObjs?: Record<string, string>; releases?: string[]; failPost?: string } = {}) {
  const refs = { ...(opts.refs ?? {}) };
  const tagObjs: Record<string, { type: string; sha: string }> = {};
  for (const [k, v] of Object.entries(opts.tagObjs ?? {})) tagObjs[k] = { type: "commit", sha: v };
  const releases = new Set(opts.releases ?? []);
  const writes: string[] = [];
  let n = 0;
  const reply = (status: number, json?: unknown) => new Response(json === undefined ? "" : JSON.stringify(json), { status });
  const fetch = async (url: string, init: RequestInit): Promise<Response> => {
    const path = url.replace("https://api.test/repos/o/r", "");
    const method = init.method ?? "GET";
    if (method !== "GET") {
      writes.push(`${method} ${path}`);
      if (opts.failPost && path === opts.failPost) return reply(422, { message: "nope" });
    }
    let m: RegExpMatchArray | null;
    if (method === "GET" && (m = path.match(/^\/git\/ref\/tags\/(.+)$/))) {
      const r = refs[decodeURIComponent(m[1])];
      return r ? reply(200, { object: r }) : reply(404);
    }
    if (method === "GET" && (m = path.match(/^\/git\/tags\/(\w+)$/))) {
      const t = tagObjs[m[1]];
      return t ? reply(200, { object: t }) : reply(404);
    }
    if (method === "POST" && path === "/git/tags") {
      const b = JSON.parse(String(init.body));
      const sha = `t${++n}`.padEnd(40, "0");
      tagObjs[sha] = { type: b.type, sha: b.object };
      return reply(201, { sha });
    }
    if (method === "POST" && path === "/git/refs") {
      const b = JSON.parse(String(init.body));
      refs[b.ref.replace("refs/tags/", "")] = { type: "tag", sha: b.sha };
      return reply(201, {});
    }
    if (method === "GET" && (m = path.match(/^\/releases\/tags\/(.+)$/))) {
      const t = decodeURIComponent(m[1]);
      return releases.has(t) ? reply(200, { tag_name: t, draft: false, html_url: `https://x/${t}` }) : reply(404);
    }
    if (method === "POST" && path === "/releases") {
      const b = JSON.parse(String(init.body));
      releases.add(b.tag_name);
      return reply(201, { tag_name: b.tag_name });
    }
    return reply(500);
  };
  const lines: string[] = [];
  const ctx = (extra: Partial<Ctx> = {}): Ctx => ({
    api: "https://api.test",
    repo: "o/r",
    sha: SHA,
    token: "t",
    dryRun: false,
    fetch,
    log: (l) => lines.push(l),
    ...extra,
  });
  return { ctx, writes, lines, refs, releases };
}

describe("peel", () => {
  test("a lightweight tag", async () => {
    const m = mock({ refs: { v1: { type: "commit", sha: SHA } } });
    expect(await peel(m.ctx(), "v1")).toBe(SHA);
  });
  test("an annotated tag is followed to its commit", async () => {
    const m = mock({ refs: { v1: { type: "tag", sha: "x".repeat(40) } }, tagObjs: { ["x".repeat(40)]: SHA } });
    expect(await peel(m.ctx(), "v1")).toBe(SHA);
  });
  test("an absent tag is null", async () => {
    expect(await peel(mock().ctx(), "v9.9.9")).toBeNull();
  });
});

describe("tag", () => {
  test("absent: creates the annotated tag and reads it back", async () => {
    const m = mock();
    expect(await tag(m.ctx(), "v5.0.1", "wazmrt 5.0.1")).toBe(0);
    expect(m.writes).toEqual(["POST /git/tags", "POST /git/refs"]);
    expect(await peel(m.ctx(), "v5.0.1")).toBe(SHA);
  });
  test("already at this commit: done, no write", async () => {
    const m = mock({ refs: { "v5.0.1": { type: "commit", sha: SHA } } });
    expect(await tag(m.ctx(), "v5.0.1", "x")).toBe(0);
    expect(m.writes).toEqual([]);
  });
  test("at ANOTHER commit: refused, never moved, no write", async () => {
    const m = mock({ refs: { "v5.0.1": { type: "commit", sha: OTHER } } });
    expect(await tag(m.ctx(), "v5.0.1", "x")).toBe(1);
    expect(m.writes).toEqual([]);
  });
  test("dry run: no write", async () => {
    const m = mock();
    expect(await tag(m.ctx({ dryRun: true }), "v5.0.1", "x")).toBe(0);
    expect(m.writes).toEqual([]);
  });
  test("a failed POST is a failure", async () => {
    const m = mock({ failPost: "/git/tags" });
    expect(await tag(m.ctx(), "v5.0.1", "x")).toBe(1);
  });
});

describe("release", () => {
  test("tag missing: refused, no write (POST /releases would CREATE the tag)", async () => {
    const m = mock();
    expect(await release(m.ctx(), "v5.0.1", "notes")).toBe(1);
    expect(m.writes).toEqual([]);
  });
  test("tag at another commit: refused, no write", async () => {
    const m = mock({ refs: { "v5.0.1": { type: "commit", sha: OTHER } } });
    expect(await release(m.ctx(), "v5.0.1", "notes")).toBe(1);
    expect(m.writes).toEqual([]);
  });
  test("page already there: done, no write (re-run safe)", async () => {
    const m = mock({ refs: { "v5.0.1": { type: "commit", sha: SHA } }, releases: ["v5.0.1"] });
    expect(await release(m.ctx(), "v5.0.1", "notes")).toBe(0);
    expect(m.writes).toEqual([]);
  });
  test("creates the page from the tag and reads it back", async () => {
    const m = mock({ refs: { "v5.0.1": { type: "commit", sha: SHA } } });
    expect(await release(m.ctx(), "v5.0.1", "notes")).toBe(0);
    expect(m.writes).toEqual(["POST /releases"]);
    expect(m.releases.has("v5.0.1")).toBe(true);
  });
  test("dry run: no write", async () => {
    const m = mock({ refs: { "v5.0.1": { type: "commit", sha: SHA } } });
    expect(await release(m.ctx({ dryRun: true }), "v5.0.1", "notes")).toBe(0);
    expect(m.writes).toEqual([]);
  });
  test("a 422 is a failure", async () => {
    const m = mock({ refs: { "v5.0.1": { type: "commit", sha: SHA } }, failPost: "/releases" });
    expect(await release(m.ctx(), "v5.0.1", "notes")).toBe(1);
  });
});

describe("version and notes", () => {
  test("rootVersion reads src/root.zig's line", () => {
    expect(rootVersion('x\npub const version: [:0]const u8 = "5.0.1";\ny')).toBe("5.0.1");
    expect(() => rootVersion("pub const version = 5;")).toThrow();
  });
  test("isRelease: true only while the tag is absent", async () => {
    expect(await isRelease(mock().ctx(), "5.0.1")).toBe(true);
    expect(await isRelease(mock({ refs: { "v5.0.0": { type: "commit", sha: OTHER } } }).ctx(), "5.0.0")).toBe(false);
  });
  test("releaseNotes takes the version's summary paragraph from release.md", () => {
    const md = "## Release History\n\n### `5.0.1` — 2026-11-12\n\nPatch. Zig 0.17.1.\nSecond line.\n\n> 🔒 detail\n\n### `5.0.0` — x\n\nOld.";
    const n = releaseNotes(md, "5.0.1", "0.17.1");
    expect(n.startsWith("Patch. Zig 0.17.1. Second line.")).toBe(true);
    expect(n).toContain("Zig 0.17.1 or later");
    expect(n).not.toContain("Old.");
  });
});
