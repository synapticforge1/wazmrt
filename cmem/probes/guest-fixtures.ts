// Fixtures for guest_names.wasm. Each file's CONTENT names which file it is, so
// the guest's report shows exactly which file wazmrt resolved a name to.
//
//   deno run -A guest-fixtures.ts <dir>

const root = Deno.args[0];
await Deno.remove(root, { recursive: true }).catch(() => {});
await Deno.mkdir(`${root}/x`, { recursive: true });
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
for (const [name, body] of files) await Deno.writeTextFile(`${root}/${name}`, body + "\n");
// Host-made symlinks whose TARGETS contain `\` — the follow path (`pushReversed`)
// splits targets on `\` as well.
await Deno.symlink("x\\y", `${root}/link-to-backslash`); // should reach the ONE file x\y
await Deno.symlink("a:b", `${root}/link-to-colon`); // should reach a:b
for await (const e of Deno.readDir(root)) console.log(`${e.isDirectory ? "dir " : "file"}  ${JSON.stringify(e.name)}`);
