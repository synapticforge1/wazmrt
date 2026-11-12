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

async function call(ctx: Ctx, method: string, path: string, body?: unknown): Promise<{ status: number; json: any }> {
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

/** A version is a release when its tag does not exist yet. A tag elsewhere means "released before". */
export async function isRelease(ctx: Ctx, version: string): Promise<boolean> {
  return (await peel(ctx, `v${version}`)) === null;
}

/** Create the annotated tag on ctx.sha. Exit code: 0 done (or already there), 1 refused / failed. */
export async function tag(ctx: Ctx, name: string, message: string): Promise<number> {
  const at = await peel(ctx, name);
  if (at === ctx.sha) {
    ctx.log(`tag ${name} already peels to ${ctx.sha}: done`);
    return 0;
  }
  if (at !== null) {
    ctx.log(`REFUSED: tag ${name} exists at ${at}, not ${ctx.sha}; a published tag never moves`);
    return 1;
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

/** Make the Release page from an existing tag (H32's order). Exit code as for `tag`. */
export async function release(ctx: Ctx, name: string, body: string): Promise<number> {
  const at = await peel(ctx, name);
  if (at !== ctx.sha) {
    ctx.log(`REFUSED: tag ${name} ${at === null ? "does not exist" : `peels to ${at}`}; expected ${ctx.sha}`);
    return 1;
  }
  const existing = await call(ctx, "GET", `/releases/tags/${encodeURIComponent(name)}`);
  if (existing.status === 200) {
    ctx.log(`release ${name} already exists (${existing.json.html_url}): done`);
    return 0;
  }
  if (existing.status !== 404) {
    ctx.log(`reading release ${name}: HTTP ${existing.status}`);
    return 1;
  }
  if (ctx.dryRun) {
    ctx.log(`dry run: would create the Release page for ${name}`);
    return 0;
  }
  const made = await call(ctx, "POST", "/releases", {
    tag_name: name,
    name: `wazmrt ${name}`,
    body,
    draft: false,
    prerelease: false,
    generate_release_notes: true,
  });
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

/** The release's summary from `cmem/release.md` § Release History, for the page body. */
export function releaseNotes(releaseMd: string, version: string, minZig: string): string {
  const head = `### \`${version}\``;
  const at = releaseMd.indexOf(head);
  let summary = "";
  if (at >= 0) {
    const rest = releaseMd.slice(at + head.length).split("\n").slice(1);
    const para: string[] = [];
    for (const line of rest) {
      if (line.startsWith("#") || line.startsWith(">")) break;
      if (line.trim() === "" && para.length) break;
      if (line.trim() !== "") para.push(line.trim());
    }
    summary = para.join(" ");
  }
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
  if (cmd !== "is-release" && !/^[0-9a-f]{40}$/.test(ctx.sha)) throw new Error("GITHUB_SHA must be a full commit id");
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
