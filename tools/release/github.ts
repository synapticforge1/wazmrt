// tools/release/github.ts — the CI side of a wazmrt release, over GitHub's REST API (no `gh`:
// workspace Tooling rule 9). The owner's order (2026-11-10, workspace `release-process.md` § 5):
// CI checks first, then CI pushes the tag, then the Release page FROM the tag. wazmrt publishes to
// no registry, so there is no publish step; the `readback` job builds the tag as a user would.
//
//   bun tools/release/github.ts is-release            # writes version=, tag=, release= to $GITHUB_OUTPUT
//   bun tools/release/github.ts tag <vX.Y.Z>          # annotated tag on $GITHUB_SHA, read back
//   bun tools/release/github.ts release <vX.Y.Z>      # the Release page from that tag, read back
//   (any of them) --dry-run                           # reads only; never writes
//
// Environment: GITHUB_REPOSITORY (owner/name), GITHUB_SHA (the commit `checks` passed),
// GITHUB_TOKEN (writes only), GITHUB_API_URL (default https://api.github.com; tests point it at a mock).
//
// 🔒 The hazard rule (loader-rs, 2026-11-09): `POST /releases` CREATES a missing tag on the default
// branch, so a page is only ever made for a tag that already exists AND peels to $GITHUB_SHA.
// A tag that exists elsewhere is never moved (a published tag never moves): refused.

import { readFileSync } from "node:fs";

export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export interface Ctx {
  api: string;
  repo: string;
  sha: string;
  token?: string;
  dryRun: boolean;
  fetch: Fetch;
  log: (line: string) => void;
}

const TIMEOUT_MS = 30_000; // every request (workspace best-practices 7.21)

export async function call(ctx: Ctx, method: string, path: string, body?: unknown): Promise<{ status: number; json: any }> {
  if (method !== "GET" && ctx.dryRun) throw new Error(`dry run: refusing to ${method} ${path}`);
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "wazmrt-release",
  };
  if (ctx.token) headers.Authorization = `Bearer ${ctx.token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await ctx.fetch(`${ctx.api}/repos/${ctx.repo}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

/** The commit a tag finally points at (annotated tags followed), or null when the tag is absent. */
export async function peel(ctx: Ctx, tag: string): Promise<string | null> {
  const ref = await call(ctx, "GET", `/git/ref/tags/${encodeURIComponent(tag)}`);
  if (ref.status === 404) return null;
  if (ref.status !== 200) throw new Error(`reading tag ${tag}: HTTP ${ref.status}`);
  let obj = ref.json.object as { type: string; sha: string };
  for (let hops = 0; obj.type === "tag"; hops++) {
    if (hops > 8) throw new Error(`tag ${tag}: too many tag-to-tag hops`);
    const t = await call(ctx, "GET", `/git/tags/${obj.sha}`);
    if (t.status !== 200) throw new Error(`reading tag object ${obj.sha}: HTTP ${t.status}`);
    obj = t.json.object;
  }
  if (obj.type !== "commit") throw new Error(`tag ${tag} points at a ${obj.type}, not a commit`);
  return obj.sha;
}

/** `src/root.zig`'s `pub const version` — the one truth in code (`cmem/releasing.md`). */
export function rootVersion(source: string): string {
  const m = source.match(/^pub const version: \[:0\]const u8 = "(\d+\.\d+\.\d+)";$/m);
  if (!m) throw new Error("src/root.zig: no `pub const version` line");
  return m[1];
}

/**
 * A version is a release when its tag does not exist yet, OR already peels to THIS commit — a
 * half-finished release (tag made, page failed) re-run (review round 3, A1: it used to read
 * "released", skip `tag` and `release`, and end green with no page; U12's "re-run failed jobs"
 * could not finish it). `tag` and `release` are re-run safe, so they complete what is missing.
 * A tag on ANOTHER commit means "released before".
 *
 * And only the BUMP commit is a release (round 5): after a bump whose checks failed, every later push
 * at the same, still-untagged version used to read "release", and `tag` then refused it — a red run
 * for correct work. A commit that is not `bump to v<version>` is not a release (said in the log); an
 * unreadable commit is an error, never "no". Whether the bump is on `main` is `tag`'s and `release`'s
 * check, so a bump commit off main is still a RED run, as it should be.
 */
export async function isRelease(ctx: Ctx, version: string): Promise<boolean> {
  const subject = await subjectOf(ctx);
  if (subject !== `bump to v${version}`) {
    ctx.log(`not a release: ${ctx.sha} is "${subject}", not "bump to v${version}"`);
    return false;
  }
  const at = await peel(ctx, `v${version}`);
  return at === null || at === ctx.sha;
}

/** The first line of ctx.sha's commit message; THROWS when the commit cannot be read. */
async function subjectOf(ctx: Ctx): Promise<string> {
  const c = await call(ctx, "GET", `/git/commits/${ctx.sha}`);
  if (c.status !== 200) throw new Error(`reading commit ${ctx.sha}: HTTP ${c.status}`);
  return String(c.json.message ?? "").split("\n")[0].trim();
}

/**
 * 🔒 Only the BUMP commit, and only while it is on `main` (review round 1, C4). `push.ts` pushes
 * exactly that commit, but a later push to `main`, or a re-run of an old run after a force-push,
 * would otherwise tag whichever checked commit got here first. Returns why it refuses, or null.
 */
export async function bumpOnMain(ctx: Ctx, name: string): Promise<string | null> {
  let subject: string;
  try {
    subject = await subjectOf(ctx);
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
  if (subject !== `bump to ${name}`) return `${ctx.sha} is "${subject}", not the bump commit "bump to ${name}"`;
  const cmp = await call(ctx, "GET", `/compare/${ctx.sha}...${MAIN}`);
  if (cmp.status !== 200) return `comparing ${ctx.sha} with ${MAIN}: HTTP ${cmp.status}`;
  if (cmp.json.status !== "ahead" && cmp.json.status !== "identical")
    return `${ctx.sha} is not on ${MAIN} (compare: ${cmp.json.status})`;
  return null;
}

const MAIN = "main";

/** Create the annotated tag on ctx.sha. Exit code: 0 done (or already there), 1 refused / failed. */
export async function tag(ctx: Ctx, name: string, message: string): Promise<number> {
  const at = await peel(ctx, name);
  if (at !== null && at !== ctx.sha) {
    ctx.log(`REFUSED: tag ${name} exists at ${at}, not ${ctx.sha}; a published tag never moves`);
    return 1;
  }
  // 🔒 Before EVERY outcome, the early "done" included (review round 4, A1: once `isRelease`
  // accepted a tag already at this commit, a hand-pushed tag on a non-bump commit reached here as
  // "done" and `release` made its page).
  const why = await bumpOnMain(ctx, name);
  if (why) {
    ctx.log(`REFUSED: ${why}`);
    return 1;
  }
  if (at === ctx.sha) {
    ctx.log(`tag ${name} already peels to ${ctx.sha}: done`);
    return 0;
  }
  if (ctx.dryRun) {
    ctx.log(`dry run: would create annotated tag ${name} on ${ctx.sha}`);
    return 0;
  }
  const obj = await call(ctx, "POST", "/git/tags", { tag: name, message, object: ctx.sha, type: "commit" });
  if (obj.status !== 201) {
    ctx.log(`creating tag object ${name}: HTTP ${obj.status}`);
    return 1;
  }
  const ref = await call(ctx, "POST", "/git/refs", { ref: `refs/tags/${name}`, sha: obj.json.sha });
  if (ref.status === 422) {
    // Another run created the ref between our check and our create (review round 1, B7): done if
    // it is the same commit, refused if not — the same rule as the check at the top.
    const raced = await peel(ctx, name);
    if (raced === ctx.sha) {
      ctx.log(`tag ${name} was created concurrently at ${ctx.sha}: done`);
      return 0;
    }
    if (raced === null) {
      // Not a race: GitHub refused the ref for another reason (review round 2, A4).
      ctx.log(`creating ref refs/tags/${name}: HTTP 422 and no such tag exists (${JSON.stringify(ref.json)})`);
      return 1;
    }
    ctx.log(`REFUSED: tag ${name} appeared at ${raced} while creating it; a published tag never moves`);
    return 1;
  }
  if (ref.status !== 201) {
    ctx.log(`creating ref refs/tags/${name}: HTTP ${ref.status}`);
    return 1;
  }
  const back = await peel(ctx, name);
  if (back !== ctx.sha) {
    ctx.log(`READ-BACK FAILED: ${name} peels to ${back}, expected ${ctx.sha}`);
    return 1;
  }
  ctx.log(`tag ${name} created; read back: peels to ${back}`);
  return 0;
}

/**
 * The page for `name`, published OR DRAFT, or null when there is none. Owner, 2026-11-13 (review
 * round 4, A2, option 2): a page is RETIRED by switching it to draft, not by deleting it — and a
 * draft must count as "there is a page", or a re-run (which finishes half-done releases, round 3 A1)
 * would publish a new one. `GET /releases/tags/{tag}` does not return drafts, so the releases are
 * listed (a token with `contents: write` sees drafts), every page of them.
 */
export async function findRelease(ctx: Ctx, name: string): Promise<{ draft: boolean; url: string } | null> {
  for (let page = 1; page <= MAX_RELEASE_PAGES; page++) {
    const r = await call(ctx, "GET", `/releases?per_page=100&page=${page}`);
    if (r.status !== 200 || !Array.isArray(r.json)) throw new Error(`listing releases (page ${page}): HTTP ${r.status}`);
    const hit = r.json.find((x: any) => x.tag_name === name);
    if (hit) return { draft: hit.draft === true, url: String(hit.html_url) };
    if (r.json.length < 100) return null; // the last page
  }
  throw new Error(`listing releases: more than ${MAX_RELEASE_PAGES * 100}; refusing to guess`);
}

const MAX_RELEASE_PAGES = 50;

/** 0 when a page for `name` exists (published or draft), 1 when the listing failed, undefined when none. */
async function existingPage(ctx: Ctx, name: string): Promise<number | undefined> {
  let existing: { draft: boolean; url: string } | null;
  try {
    existing = await findRelease(ctx, name);
  } catch (err) {
    ctx.log(`${err instanceof Error ? err.message : err}`);
    return 1;
  }
  if (!existing) return undefined;
  ctx.log(`release ${name} already exists${existing.draft ? " as a DRAFT (retired by the owner)" : ""} (${existing.url}): done`);
  return 0;
}

/** Make the Release page from an existing tag (H32's order). Exit code as for `tag`. */
export async function release(ctx: Ctx, name: string, body: string): Promise<number> {
  const at = await peel(ctx, name);
  if (at !== ctx.sha) {
    ctx.log(`REFUSED: tag ${name} ${at === null ? "does not exist" : `peels to ${at}`}; expected ${ctx.sha}`);
    return 1;
  }
  // The page is made only for the bump commit on main, whatever made the tag (round 4, A1) — checked
  // before EVERY outcome, the early "done" included, as in `tag` (round 5).
  const why = await bumpOnMain(ctx, name);
  if (why) {
    ctx.log(`REFUSED: ${why}`);
    return 1;
  }
  const existingNow = await existingPage(ctx, name);
  if (existingNow !== undefined) return existingNow;
  if (ctx.dryRun) {
    ctx.log(`dry run: would create the Release page for ${name}`);
    return 0;
  }
  const made = await call(ctx, "POST", "/releases", {
    tag_name: name,
    // 🔒 Pinned (review round 1, B2): if the tag vanished after the check above, GitHub would
    // CREATE it — on this commit, never on the default branch's head. The read-back still checks.
    target_commitish: ctx.sha,
    name: `wazmrt ${name}`,
    body,
    draft: false,
    prerelease: false,
    // GitHub's documented meaning of "legacy": "the latest release should be determined based on the
    // release creation date and higher semantic version". Not forced "true" (review round 1, B2);
    // what GitHub does for an older line beyond that sentence is unmeasured (round 2, A5).
    make_latest: "legacy",
    generate_release_notes: true,
  });
  if (made.status === 422) {
    // Another run made the page between our check and our create (round 5) — GitHub's
    // `already_exists` on `tag_name`, and ONLY that (round 7): any other 422 is GitHub refusing
    // THIS request, a failure even if a page happens to exist.
    const errors: any[] = Array.isArray(made.json?.errors) ? made.json.errors : [];
    const already = errors.some((e) => e?.code === "already_exists" && e?.field === "tag_name"); // round 7: the field too
    const raced = already ? await existingPage(ctx, name) : undefined;
    if (raced !== undefined) return raced;
    ctx.log(`creating release ${name}: HTTP 422${already ? " (already_exists) and no such page exists" : ""} (${JSON.stringify(made.json)})`);
    return 1;
  }
  if (made.status !== 201) {
    ctx.log(`creating release ${name}: HTTP ${made.status}`);
    return 1;
  }
  const back = await call(ctx, "GET", `/releases/tags/${encodeURIComponent(name)}`);
  if (back.status !== 200 || back.json.tag_name !== name || back.json.draft !== false) {
    ctx.log(`READ-BACK FAILED: release ${name}: HTTP ${back.status}, draft=${back.json?.draft}`);
    return 1;
  }
  const again = await peel(ctx, name);
  if (again !== ctx.sha) {
    ctx.log(`READ-BACK FAILED: after the page, ${name} peels to ${again}, expected ${ctx.sha}`);
    return 1;
  }
  ctx.log(`release ${name} created: ${back.json.html_url}`);
  return 0;
}

/**
 * The release's summary from `cmem/release.md` § Release History, for the page body. THROWS when
 * the version has no entry or the entry has no summary paragraph (review round 1, B3): a release
 * whose notes were not written is not ready (U2), and an empty page is not a pass.
 */
export function releaseNotes(releaseMd: string, version: string, minZig: string): string {
  const head = `### \`${version}\``;
  const lines = releaseMd.split("\n");
  const at = lines.findIndex((l) => l === head || l.startsWith(`${head} `));
  if (at < 0) throw new Error(`cmem/release.md has no "${head}" entry; write the release notes first (U2)`);
  const para: string[] = [];
  for (const line of lines.slice(at + 1)) {
    if (/^#{1,6}\s/.test(line) || line.startsWith(">")) break; // the next heading or the record block
    if (line.trim() === "" && para.length) break;
    if (line.trim() !== "") para.push(line.trim());
  }
  const summary = para.join(" ");
  if (!summary) throw new Error(`cmem/release.md's "${head}" entry has no summary paragraph`);
  return [
    summary,
    "",
    `wazmrt publishes to no registry: build it from this tag with Zig ${minZig} or later (\`zig build -Doptimize=small\`).`,
  ].join("\n").trim();
}

async function main(argv: string[]): Promise<number> {
  const dryRun = argv.includes("--dry-run");
  const args = argv.filter((a) => a !== "--dry-run");
  const [cmd, name] = args;
  const env = process.env;
  const ctx: Ctx = {
    api: env.GITHUB_API_URL ?? "https://api.github.com",
    repo: env.GITHUB_REPOSITORY ?? "",
    sha: env.GITHUB_SHA ?? "",
    token: env.GITHUB_TOKEN || undefined,
    dryRun,
    fetch: (url, init) => fetch(url, init),
    log: (line) => console.log(line),
  };
  if (!/^[\w.-]+\/[\w.-]+$/.test(ctx.repo)) throw new Error("GITHUB_REPOSITORY must be owner/name");
  if (!/^[0-9a-f]{40}$/.test(ctx.sha)) throw new Error("GITHUB_SHA must be a full commit id"); // is-release needs it too (A1)
  if (cmd !== "is-release" && !dryRun && !ctx.token) throw new Error("GITHUB_TOKEN is required to write (or pass --dry-run)");

  const version = rootVersion(readFileSync("src/root.zig", "utf8"));
  if (cmd === "is-release") {
    const rel = await isRelease(ctx, version);
    const out = `version=${version}\ntag=v${version}\nrelease=${rel}\n`;
    if (env.GITHUB_OUTPUT) await Bun.write(env.GITHUB_OUTPUT, (await Bun.file(env.GITHUB_OUTPUT).text().catch(() => "")) + out);
    console.log(out.trim());
    return 0;
  }
  if (!name || name !== `v${version}`) throw new Error(`the tag must be v${version} (src/root.zig), got ${name}`);
  if (cmd === "tag") return tag(ctx, name, `wazmrt ${version}`);
  if (cmd === "release") {
    const zon = readFileSync("build.zig.zon", "utf8").match(/\.minimum_zig_version = "([^"]+)"/)?.[1] ?? "?";
    return release(ctx, name, releaseNotes(readFileSync("cmem/release.md", "utf8"), version, zon));
  }
  throw new Error("usage: github.ts is-release | tag <vX.Y.Z> | release <vX.Y.Z> [--dry-run]");
}

if (import.meta.main) {
  main(Bun.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.error(`github.ts: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    },
  );
}
