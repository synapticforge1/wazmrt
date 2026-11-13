// Self-test for tools/release/github.ts against an in-memory GitHub (no network). Run: `bun test tools/release`.
// Every refusal must send NO write; every success must read back; every guard has a case that fails
// without it (review round 1, B8: six guards had none).
import { describe, expect, test } from "bun:test";
import { type Ctx, call, isRelease, peel, release, releaseNotes, rootVersion, tag } from "./github.ts";

const SHA = "a".repeat(40);
const OTHER = "b".repeat(40);
const TAG = "v5.0.1";

interface MockOpts {
  refs?: Record<string, { type: string; sha: string }>;
  tagObjs?: Record<string, { type: string; sha: string }>;
  releases?: Record<string, { draft: boolean }>;
  failPost?: string; // a write path answered 422
  failPostJson?: unknown; // ... with this body (default: a 422 for some other reason)
  subject?: string; // the commit's subject (default: the bump commit)
  compare?: string; // GitHub's compare status for SHA...main (default "identical")
  refStatus?: number; // force a status on GET /git/ref/*
  listStatus?: number; // force a status on GET /releases (the listing, drafts included)
  padding?: number; // other releases listed BEFORE ours, to push it onto a later page
  afterRefPost?: (refs: Record<string, { type: string; sha: string }>) => void; // what POST /git/refs really did
  draftOnCreate?: boolean;
  tagLookupShowsDrafts?: boolean; // model an API where the by-tag lookup DID return drafts
  commitStatus?: number; // force a status on GET /git/commits/<sha>
  listJson?: unknown; // the listing answers 200 with THIS body instead
  readBackTagName?: string; // the by-tag read-back answers with this tag_name
  afterReleasePost?: (refs: Record<string, { type: string; sha: string }>) => void; // what else happened
  pageAppearsOnPost?: { draft: boolean }; // another run made the page just before our POST
  lag?: Record<string, number>; // GET <exact path> answers 404 this many times first (a lagging read)
  refLagAfterCreate?: number; // after POST /git/refs, the tag's GET answers 404 this many times
  timeoutOn?: string; // "<METHOD> <path>": the fetch throws a TimeoutError
}

function mock(o: MockOpts = {}) {
  const refs = { ...(o.refs ?? {}) };
  const tagObjs = { ...(o.tagObjs ?? {}) };
  const releases = { ...(o.releases ?? {}) };
  const writes: string[] = [];
  const bodies: any[] = [];
  const lag = { ...(o.lag ?? {}) };
  let refLag = 0;
  let n = 0;
  const reply = (status: number, json?: unknown) => new Response(json === undefined ? "" : JSON.stringify(json), { status });
  const fetch = async (url: string, init: RequestInit): Promise<Response> => {
    const path = url.replace("https://api.test/repos/o/r", "");
    const method = init.method ?? "GET";
    if (o.timeoutOn === `${method} ${path}`) throw new DOMException("The operation timed out.", "TimeoutError");
    if (method === "GET" && lag[path] > 0) {
      lag[path]--;
      return reply(404);
    }
    if (method === "GET" && refLag > 0 && path.startsWith("/git/ref/tags/")) {
      refLag--;
      return reply(404);
    }
    if (method !== "GET") {
      writes.push(`${method} ${path}`);
      bodies.push(JSON.parse(String(init.body)));
      if (o.failPost && path === o.failPost) {
        if (o.pageAppearsOnPost && path === "/releases") releases[bodies.at(-1).tag_name] = o.pageAppearsOnPost;
        return reply(422, o.failPostJson ?? { message: "nope" });
      }
    }
    let m: RegExpMatchArray | null;
    if (method === "GET" && (m = path.match(/^\/git\/ref\/tags\/(.+)$/))) {
      if (o.refStatus) return reply(o.refStatus);
      const r = refs[decodeURIComponent(m[1])];
      return r ? reply(200, { object: r }) : reply(404);
    }
    if (method === "GET" && (m = path.match(/^\/git\/tags\/(\w+)$/))) {
      const t = tagObjs[m[1]];
      return t ? reply(200, { object: t }) : reply(404);
    }
    // Keyed on the EXACT path (review round 2, A3): a lookup of another commit, or the compare
    // reversed, gets a 404 here, so reading the wrong commit or the wrong direction cannot pass.
    if (method === "GET" && path === `/git/commits/${SHA}`) {
      if (o.commitStatus) return reply(o.commitStatus);
      return reply(200, { message: `${o.subject ?? `bump to ${TAG}`}\n\nbody` });
    }
    if (method === "GET" && path === `/compare/${SHA}...main`) return reply(200, { status: o.compare ?? "identical" });
    if (method === "POST" && path === "/git/tags") {
      const b = bodies.at(-1);
      const sha = `t${++n}`.padEnd(40, "0");
      tagObjs[sha] = { type: b.type, sha: b.object };
      return reply(201, { sha });
    }
    if (method === "POST" && path === "/git/refs") {
      const b = bodies.at(-1);
      refs[b.ref.replace("refs/tags/", "")] = { type: "tag", sha: b.sha };
      refLag = o.refLagAfterCreate ?? 0;
      o.afterRefPost?.(refs);
      return reply(201, {});
    }
    // As GitHub: the by-tag lookup does NOT return drafts; the listing (with a write token) does.
    if (method === "GET" && (m = path.match(/^\/releases\/tags\/(.+)$/))) {
      const t = decodeURIComponent(m[1]);
      const visible = releases[t] && (!releases[t].draft || o.tagLookupShowsDrafts);
      return visible ? reply(200, { tag_name: o.readBackTagName ?? t, draft: releases[t].draft, html_url: `https://x/${t}` }) : reply(404);
    }
    if (method === "GET" && (m = path.match(/^\/releases\?per_page=100&page=(\d+)$/))) {
      if (o.listStatus) return reply(o.listStatus);
      if (o.listJson !== undefined) return reply(200, o.listJson);
      const all = [
        ...Array.from({ length: o.padding ?? 0 }, (_, i) => ({ tag_name: `v0.0.${i}`, draft: false, html_url: `https://x/v0.0.${i}` })),
        ...Object.entries(releases).map(([t, r]) => ({ tag_name: t, draft: r.draft, html_url: `https://x/${t}` })),
      ];
      const page = Number(m[1]);
      return reply(200, all.slice((page - 1) * 100, page * 100));
    }
    if (method === "POST" && path === "/releases") {
      const b = bodies.at(-1);
      if (o.pageAppearsOnPost) releases[b.tag_name] = o.pageAppearsOnPost;
      // As GitHub: a page for that tag already there (a draft too) is 422 "already_exists" (round 5).
      if (releases[b.tag_name]) return reply(422, { message: "Validation Failed", errors: [{ code: "already_exists", field: "tag_name" }] });
      // What the request asked for, unless the test makes GitHub answer otherwise (round 3, A2).
      releases[b.tag_name] = { draft: o.draftOnCreate ?? b.draft };
      o.afterReleasePost?.(refs);
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
    sleep: async () => {}, // retries without the real wait
    ...extra,
  });
  return { ctx, writes, bodies, lines, refs, releases };
}

describe("peel", () => {
  test("a lightweight tag", async () => {
    expect(await peel(mock({ refs: { v1: { type: "commit", sha: SHA } } }).ctx(), "v1")).toBe(SHA);
  });
  test("an annotated tag is followed to its commit", async () => {
    const t = "x".repeat(40);
    expect(await peel(mock({ refs: { v1: { type: "tag", sha: t } }, tagObjs: { [t]: { type: "commit", sha: SHA } } }).ctx(), "v1")).toBe(SHA);
  });
  test("an absent tag is null", async () => {
    expect(await peel(mock().ctx(), "v9.9.9")).toBeNull();
  });
  test("a tag on a non-commit is refused", async () => {
    await expect(peel(mock({ refs: { v1: { type: "tree", sha: SHA } } }).ctx(), "v1")).rejects.toThrow(/not a commit/);
  });
  test("an HTTP error is an error, never 'absent'", async () => {
    await expect(peel(mock({ refStatus: 502 }).ctx(), "v1")).rejects.toThrow(/HTTP 502/);
  });
  test("a tag-to-tag loop ends in a refusal, not a hang (the hop limit; round 5: untested)", async () => {
    const t = "c".repeat(40);
    const m = mock({ refs: { v1: { type: "tag", sha: t } }, tagObjs: { [t]: { type: "tag", sha: t } } });
    const ctx = m.ctx();
    let reads = 0;
    const inner = ctx.fetch;
    ctx.fetch = (url, init) => {
      if (url.includes("/git/tags/")) reads++;
      if (reads > 50) throw new Error("the hop limit did not stop the loop");
      return inner(url, init);
    };
    await expect(peel(ctx, "v1")).rejects.toThrow(/too many tag-to-tag hops/);
    expect(reads).toBeLessThanOrEqual(10);
  });
});

describe("tag", () => {
  test("absent: creates the annotated tag on the bump commit and reads it back", async () => {
    const m = mock();
    expect(await tag(m.ctx(), TAG, "wazmrt 5.0.1")).toBe(0);
    expect(m.writes).toEqual(["POST /git/tags", "POST /git/refs"]);
    expect(await peel(m.ctx(), TAG)).toBe(SHA);
  });
  test("already at this commit: done, no write", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } } });
    expect(await tag(m.ctx(), TAG, "x")).toBe(0);
    expect(m.writes).toEqual([]);
  });
  test("already at this commit, but it is NOT the bump commit: refused, not 'done' (round 4, A1)", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, subject: "docs: hand-tagged" });
    expect(await tag(m.ctx(), TAG, "x")).toBe(1);
    expect(m.writes).toEqual([]);
  });
  test("at ANOTHER commit: refused, never moved, no write", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: OTHER } } });
    expect(await tag(m.ctx(), TAG, "x")).toBe(1);
    expect(m.writes).toEqual([]);
  });
  test("not the bump commit: refused, no write (C4)", async () => {
    const m = mock({ subject: "docs: something pushed after the bump" });
    expect(await tag(m.ctx(), TAG, "x")).toBe(1);
    expect(m.writes).toEqual([]);
  });
  for (const status of ["diverged", "behind"]) {
    test(`the bump commit is not on main (compare "${status}"): refused, no write (C4)`, async () => {
      const m = mock({ compare: status });
      expect(await tag(m.ctx(), TAG, "x")).toBe(1);
      expect(m.writes).toEqual([]);
    });
  }
  test(`the bump commit with main moved on past it (compare "ahead"): tagged`, async () => {
    const m = mock({ compare: "ahead" });
    expect(await tag(m.ctx(), TAG, "x")).toBe(0);
  });
  test("a 422 on the ref with NO tag behind it is a failure, not a race (A4)", async () => {
    const m = mock({ failPost: "/git/refs" });
    expect(await tag(m.ctx(), TAG, "x")).toBe(1);
    expect(m.lines.join("\n")).toContain("no such tag exists");
  });
  test("dry run: no write", async () => {
    const m = mock();
    expect(await tag(m.ctx({ dryRun: true }), TAG, "x")).toBe(0);
    expect(m.writes).toEqual([]);
  });
  test("a failed tag-object POST is a failure", async () => {
    expect(await tag(mock({ failPost: "/git/tags" }).ctx(), TAG, "x")).toBe(1);
  });
  test("read-back: the ref created but peeling elsewhere is a failure", async () => {
    const m = mock({ afterRefPost: (refs) => (refs[TAG] = { type: "commit", sha: OTHER }) });
    expect(await tag(m.ctx(), TAG, "x")).toBe(1);
  });
  test("a concurrent create at THIS commit (422 on the ref) is done (B7)", async () => {
    const m = mock({ failPost: "/git/refs" });
    const ctx = m.ctx();
    // the racing run's ref appears between our check and our create
    const realFetch = ctx.fetch;
    ctx.fetch = async (url, init) => {
      if ((init.method ?? "GET") === "POST" && url.endsWith("/git/refs")) m.refs[TAG] = { type: "commit", sha: SHA };
      return realFetch(url, init);
    };
    expect(await tag(ctx, TAG, "x")).toBe(0);
  });
  test("a concurrent create at ANOTHER commit (422) is refused", async () => {
    const m = mock({ failPost: "/git/refs" });
    const ctx = m.ctx();
    const realFetch = ctx.fetch;
    ctx.fetch = async (url, init) => {
      if ((init.method ?? "GET") === "POST" && url.endsWith("/git/refs")) m.refs[TAG] = { type: "commit", sha: OTHER };
      return realFetch(url, init);
    };
    expect(await tag(ctx, TAG, "x")).toBe(1);
  });
});

describe("release", () => {
  test("tag missing: refused, no write (POST /releases would CREATE the tag)", async () => {
    const m = mock();
    expect(await release(m.ctx(), TAG, "notes")).toBe(1);
    expect(m.writes).toEqual([]);
  });
  test("tag at another commit: refused, no write", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: OTHER } } });
    expect(await release(m.ctx(), TAG, "notes")).toBe(1);
    expect(m.writes).toEqual([]);
  });
  test("page already there: done, no write (re-run safe)", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, releases: { [TAG]: { draft: false } } });
    expect(await release(m.ctx(), TAG, "notes")).toBe(0);
    expect(m.writes).toEqual([]);
  });
  test("a page RETIRED to draft by the owner: done, no write — a re-run does not publish it again (round 4, A2)", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, releases: { [TAG]: { draft: true } } });
    expect(await release(m.ctx(), TAG, "notes")).toBe(0);
    expect(m.writes).toEqual([]);
    expect(m.lines.join("\n")).toContain("DRAFT");
  });
  test("the page found on a LATER page of the listing: done, no write", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, releases: { [TAG]: { draft: true } }, padding: 150 });
    expect(await release(m.ctx(), TAG, "notes")).toBe(0);
    expect(m.writes).toEqual([]);
  });
  test("an error listing the pages is a failure, not 'absent': no write", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, listStatus: 500 });
    expect(await release(m.ctx(), TAG, "notes")).toBe(1);
    expect(m.writes).toEqual([]);
  });
  test("a listing exactly a page long, ours absent: reads the next page before deciding 'none'", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, padding: 100 });
    expect(await release(m.ctx(), TAG, "notes")).toBe(0);
    expect(m.writes).toEqual(["POST /releases"]);
  });
  test("creates the page pinned to the commit, not 'Latest' by force, and reads it back (B2)", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } } });
    expect(await release(m.ctx(), TAG, "notes")).toBe(0);
    expect(m.writes).toEqual(["POST /releases"]);
    // The WHOLE request, not two fields of it (round 3, A2: `prerelease: true` passed every test).
    expect(m.bodies[0]).toEqual({
      tag_name: TAG,
      target_commitish: SHA,
      name: `wazmrt ${TAG}`,
      body: "notes",
      draft: false,
      prerelease: false,
      make_latest: "legacy",
      generate_release_notes: true,
    });
  });
  test("read-back: a page that came back as a draft is a failure (as GitHub: the by-tag lookup 404s)", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, draftOnCreate: true });
    expect(await release(m.ctx(), TAG, "notes")).toBe(1);
  });
  test("read-back: a draft is a failure even if the by-tag lookup ever DID return drafts (the draft check itself)", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, draftOnCreate: true, tagLookupShowsDrafts: true });
    expect(await release(m.ctx(), TAG, "notes")).toBe(1);
  });
  test("dry run: no write", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } } });
    expect(await release(m.ctx({ dryRun: true }), TAG, "notes")).toBe(0);
    expect(m.writes).toEqual([]);
  });
  test("the guard in `call` itself: a write in dry run throws and reaches nothing", async () => {
    // a code path that forgot to check dryRun still cannot write
    const m = mock();
    await expect(call(m.ctx({ dryRun: true }), "POST", "/releases", {})).rejects.toThrow(/dry run/);
    expect(m.writes).toEqual([]);
  });
  test("a hand-pushed tag on a NON-bump commit: no page, no write (round 4, A1)", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, subject: "docs: not a bump" });
    expect(await release(m.ctx(), TAG, "notes")).toBe(1);
    expect(m.writes).toEqual([]);
  });
  test("the tag's commit is no longer on main: no page, no write (round 4, A1)", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, compare: "diverged" });
    expect(await release(m.ctx(), TAG, "notes")).toBe(1);
    expect(m.writes).toEqual([]);
  });
  test("a 422 for another reason is a failure, not a race (round 7)", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, failPost: "/releases" });
    expect(await release(m.ctx(), TAG, "notes")).toBe(1);
    expect(m.lines.join("\n")).toContain('"message":"nope"');
  });
  test("a 422 for another reason while a page DOES exist is still a failure, not 'done' (round 7)", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, failPost: "/releases", pageAppearsOnPost: { draft: false } });
    expect(await release(m.ctx(), TAG, "notes")).toBe(1);
    expect(m.lines.join("\n")).not.toContain("already exists");
  });
  test("already_exists on ANOTHER field is not a page race: a failure even with a page there (round 7)", async () => {
    const m = mock({
      refs: { [TAG]: { type: "commit", sha: SHA } },
      failPost: "/releases",
      pageAppearsOnPost: { draft: false },
      failPostJson: { message: "Validation Failed", errors: [{ code: "already_exists", field: "name" }] },
    });
    expect(await release(m.ctx(), TAG, "notes")).toBe(1);
    expect(m.lines.join("\n")).not.toContain("already exists (");
  });
  test("already_exists on tag_name, the page there: done (the real race shape)", async () => {
    const m = mock({
      refs: { [TAG]: { type: "commit", sha: SHA } },
      failPost: "/releases",
      pageAppearsOnPost: { draft: true },
      failPostJson: { message: "Validation Failed", errors: [{ resource: "Release", code: "already_exists", field: "tag_name" }] },
    });
    expect(await release(m.ctx(), TAG, "notes")).toBe(0);
  });
  for (const [shape, body] of [
    ["a custom code on tag_name", { message: "Validation Failed", errors: [{ resource: "Release", code: "custom", field: "tag_name", message: "tag_name was used by an immutable release" }] }],
    ["only a top-level message", { message: "tag_name was used by an immutable release" }],
  ] as const) {
    test(`a tag held by an IMMUTABLE release (${shape}), the page there: done (round 8 — the shape is unmeasured, so either is read)`, async () => {
      const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, failPost: "/releases", pageAppearsOnPost: { draft: false }, failPostJson: body });
      expect(await release(m.ctx(), TAG, "notes")).toBe(0);
    });
    test(`a tag held by an immutable release (${shape}) but NO page listed: a failure, never 'done'`, async () => {
      const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, failPost: "/releases", failPostJson: body });
      expect(await release(m.ctx(), TAG, "notes")).toBe(1);
    });
  }
  test("ANY code on tag_name re-reads the listing (round 8): a custom code, no 'immutable' wording, the page there: done", async () => {
    const m = mock({
      refs: { [TAG]: { type: "commit", sha: SHA } },
      failPost: "/releases",
      pageAppearsOnPost: { draft: false },
      failPostJson: { message: "Validation Failed", errors: [{ resource: "Release", code: "custom", field: "tag_name", message: "held" }] },
    });
    expect(await release(m.ctx(), TAG, "notes")).toBe(0);
  });
  test("already_exists with no page found: a failure that says so", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, failPost: "/releases", failPostJson: { message: "Validation Failed", errors: [{ code: "already_exists", field: "tag_name" }] } });
    expect(await release(m.ctx(), TAG, "notes")).toBe(1);
    expect(m.lines.join("\n")).toContain("about the tag, and no page for it exists");
  });
  for (const draft of [false, true]) {
    test(`another run made the page (${draft ? "a draft" : "published"}) between our check and our POST: done (round 5)`, async () => {
      const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, pageAppearsOnPost: { draft } });
      expect(await release(m.ctx(), TAG, "notes")).toBe(0);
      expect(m.writes).toEqual(["POST /releases"]);
      expect(m.lines.join("\n")).toContain("already exists");
    });
  }
  test("a page already there on a NON-bump commit: refused, not 'done' — the bump check comes first (round 5)", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, releases: { [TAG]: { draft: false } }, subject: "docs: not a bump" });
    expect(await release(m.ctx(), TAG, "notes")).toBe(1);
    expect(m.lines.join("\n")).toContain("REFUSED");
  });
  test("more releases than the listing reads, ours not among them: a failure, never 'absent' (the page cap; round 5)", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, padding: 5000 });
    expect(await release(m.ctx(), TAG, "notes")).toBe(1);
    expect(m.writes).toEqual([]);
    expect(m.lines.join("\n")).toContain("refusing to guess");
  });
  test("a listing that is not a list: a failure that SAYS so, no write (round 5)", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, listJson: { message: "not a list" } });
    expect(await release(m.ctx(), TAG, "notes")).toBe(1);
    expect(m.writes).toEqual([]);
    expect(m.lines.join("\n")).toContain("listing releases (page 1): HTTP 200");
  });
  test("read-back: a page for ANOTHER tag name is a failure (round 5: untested)", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, readBackTagName: "v0.0.0" });
    expect(await release(m.ctx(), TAG, "notes")).toBe(1);
    expect(m.lines.join("\n")).toContain("READ-BACK FAILED");
  });
  test("read-back: the tag moved while the page was made is a failure (round 5: untested)", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, afterReleasePost: (refs) => (refs[TAG] = { type: "commit", sha: OTHER }) });
    expect(await release(m.ctx(), TAG, "notes")).toBe(1);
    expect(m.lines.join("\n")).toContain(`peels to ${OTHER}`);
  });
});

describe("lagging reads, timeouts and exact matches (round 8)", () => {
  test("the page's read-back lags once: read again, done", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, lag: { [`/releases/tags/${TAG}`]: 1 } });
    expect(await release(m.ctx(), TAG, "notes")).toBe(0);
    expect(m.lines.join("\n")).toContain("GitHub may lag");
  });
  test("the compare lags twice right after the push: read again, tagged", async () => {
    const m = mock({ lag: { [`/compare/${SHA}...main`]: 2 } });
    expect(await tag(m.ctx(), TAG, "x")).toBe(0);
  });
  test("the commit itself lags once (just pushed): read again, a release", async () => {
    expect(await isRelease(mock({ lag: { [`/git/commits/${SHA}`]: 1 } }).ctx(), "5.0.1")).toBe(true);
  });
  test("the tag's read-back lags once after its create: read again, done", async () => {
    const m = mock({ refLagAfterCreate: 1 });
    expect(await tag(m.ctx(), TAG, "x")).toBe(0);
  });
  test("a read that never settles: a failure after the retries, never 'done'", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, lag: { [`/releases/tags/${TAG}`]: 99 } });
    expect(await release(m.ctx(), TAG, "notes")).toBe(1);
    expect(m.lines.filter((l) => l.includes("GitHub may lag")).length).toBe(3);
  });
  test("a WRITE that times out says it may have been done, and that a re-run is safe", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, timeoutOn: "POST /releases" });
    await expect(release(m.ctx(), TAG, "notes")).rejects.toThrow("it MAY have been done");
  });
  test("a READ that times out says only that it timed out", async () => {
    const m = mock({ timeoutOn: `GET /git/ref/tags/${TAG}` });
    const err = await peel(m.ctx(), TAG).catch((e) => e as Error);
    expect(String(err)).toContain("no answer in 30 s");
    expect(String(err)).not.toContain("MAY have been done");
  });
  test("a page for V5.0.1 is not the page for v5.0.1: tag names match exactly (round 8: untested)", async () => {
    const m = mock({ refs: { [TAG]: { type: "commit", sha: SHA } }, releases: { "V5.0.1": { draft: false } } });
    expect(await release(m.ctx(), TAG, "notes")).toBe(0);
    expect(m.writes).toEqual(["POST /releases"]);
  });
  test("the subject is trimmed: `bump to v5.0.1` with a trailing CR or space is the bump (round 8: untested)", async () => {
    expect(await isRelease(mock({ subject: "bump to v5.0.1 \r" }).ctx(), "5.0.1")).toBe(true);
  });
});

describe("version and notes", () => {
  test("rootVersion reads src/root.zig's line", () => {
    expect(rootVersion('x\npub const version: [:0]const u8 = "5.0.1";\ny')).toBe("5.0.1");
    expect(() => rootVersion("pub const version = 5;")).toThrow();
  });
  test("isRelease: true while the tag is absent", async () => {
    expect(await isRelease(mock().ctx(), "5.0.1")).toBe(true);
  });
  test("isRelease: true when the tag already peels to THIS commit — a half-finished release re-run (round 3, A1)", async () => {
    expect(await isRelease(mock({ refs: { "v5.0.1": { type: "commit", sha: SHA } } }).ctx(), "5.0.1")).toBe(true);
  });
  test("isRelease: false when the tag is on another commit (released before)", async () => {
    // The bump commit's subject, so only the tag can make it "no".
    expect(await isRelease(mock({ refs: { "v5.0.0": { type: "commit", sha: OTHER } }, subject: "bump to v5.0.0" }).ctx(), "5.0.0")).toBe(false);
  });
  test("isRelease: false, and SAID, for a commit that is not the bump at an untagged version (round 5: was a red run)", async () => {
    const m = mock({ subject: "fix: after a bump whose checks failed" });
    expect(await isRelease(m.ctx(), "5.0.1")).toBe(false);
    expect(m.lines.join("\n")).toContain("not a release");
  });
  test("isRelease: an unreadable commit is an error, never 'not a release' (round 5)", async () => {
    await expect(isRelease(mock({ commitStatus: 502 }).ctx(), "5.0.1")).rejects.toThrow(/HTTP 502/);
  });
  test("releaseNotes takes the version's summary paragraph, through a '#' that is not a heading", () => {
    const md = "## Release History\n\n### `5.0.1` — 2026-11-12\n\nPatch. Zig 0.17.1.\n#42 fixed too.\n\n> 🔒 detail\n\n### `5.0.0` — x\n\nOld.";
    const n = releaseNotes(md, "5.0.1", "0.17.1");
    expect(n.startsWith("Patch. Zig 0.17.1. #42 fixed too.")).toBe(true);
    expect(n).toContain("Zig 0.17.1 or later");
    expect(n).not.toContain("Old.");
  });
  test("releaseNotes refuses a missing entry and an empty one (B3)", () => {
    expect(() => releaseNotes("### `5.0.0` — x\n\nOld.", "9.9.9", "0.17.1")).toThrow(/no "### `9.9.9`" entry/);
    expect(() => releaseNotes("### `5.0.1` — x\n\n> only a block\n", "5.0.1", "0.17.1")).toThrow(/no summary/);
    expect(() => releaseNotes("### `5.0.10` — x\n\nTen.", "5.0.1", "0.17.1")).toThrow(/no "### `5.0.1`" entry/);
  });
});
