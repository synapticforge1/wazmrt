// Fixtures for guest_names.wasm. Each file's CONTENT names which file it is, so
// the guest's report shows exactly which file wazmrt resolved a name to.
//
//   bun guest-fixtures.ts <dir>

import { mkdir, readdir, rm, symlink, writeFile } from "node:fs/promises";

const root = process.argv[2];
await rm(root, { recursive: true }).catch(() => {});
await mkdir(`${root}/x`, { recursive: true });
const files: Array<[string, string]> = [
  ["plain.txt", "i-am-plain.txt"],
  ["a:b", "i-am-a:b"],
  ["x\\y", "i-am-the-ONE-file-named-x-backslash-y"],
  ["x/y", "i-am-y-inside-directory-x"],
  ["c:", "i-am-c:"],
  // The file a mis-resolved `a:b` symlink landed on before the 2026-09-21 fix: the old
  // drive strip turned target `a:b` into `b`. Present so that bug shows as WRONG CONTENT.
  ["b", "i-am-b-an-UNRELATED-file"],
];
for (const [name, body] of files) await writeFile(`${root}/${name}`, body + "\n");
// Host-made symlinks whose TARGETS contain `\` — the follow path (`pushReversed`)
// splits targets on `\` as well.
await symlink("x\\y", `${root}/link-to-backslash`); // should reach the ONE file x\y
await symlink("a:b", `${root}/link-to-colon`); // should reach a:b
for (const e of await readdir(root, { withFileTypes: true })) console.log(`${e.isDirectory() ? "dir " : "file"}  ${JSON.stringify(e.name)}`);
