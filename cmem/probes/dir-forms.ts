// What HOST path spellings does `--dir` accept today? The guest half is pinned
// with `::` so the host spelling is isolated from the separator question.
//
// Run from a directory that contains ./data and ./q, with the repo's wat file
// passed absolutely.
//   deno run -A dir-forms.ts <wazmrt.exe> <abs module.wat>

const exe = Deno.args[0];
const mod = Deno.args[1];

const hosts: Array<[string, string]> = [
  // the three forms the owner listed
  ["C:/Users", "drive + forward slashes (owner form 1)"],
  ["./data", "cwd-relative with ./ (owner form 2)"],
  ["../probe2/data", "parent-relative with ../ (owner form 3)"],
  // forms the list does not mention
  ["data", "BARE relative — no ./ prefix (Node/TS accept this)"],
  [".", "bare dot — the host half of --help's own `--dir .:/`"],
  ["..", "bare dotdot"],
  ["C:\\Users", "drive + BACKslashes (Windows native, Node accepts)"],
  ["/Users", "drive-less absolute — Node maps to the cwd's drive"],
  ["C:", "bare drive, no separator"],
  ["C:/", "drive root"],
  ["C:Users", "DRIVE-RELATIVE — Node: relative to the cwd ON drive C"],
  ["//localhost/c$", "UNC with forward slashes"],
  ["\\\\localhost\\c$", "UNC with backslashes"],
  ["./data/", "trailing separator"],
  ["./nope", "a ./ path that does not exist (control)"],
];

const rows: string[] = [];
for (const [h, why] of hosts) {
  const out = await new Deno.Command(exe, {
    args: [mod, "--dir", `${h}::/m`],
    stdout: "piped",
    stderr: "piped",
  }).output();
  const txt = (new TextDecoder().decode(out.stdout) +
    new TextDecoder().decode(out.stderr)).trim().split("\n")[0] ?? "";
  const verdict = out.code === 0 ? "✅ accepted" : "❌ rc " + out.code;
  rows.push(`| \`${h}\` | ${verdict} | ${txt.slice(0, 70)} | ${why} |`);
}
console.log("| host spelling | verdict | first line | note |");
console.log("| --- | --- | --- | --- |");
for (const r of rows) console.log(r);
