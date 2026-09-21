// The `--dir` grammar on a REAL POSIX host. Creates its own fixtures in the cwd,
// including names that are legal on POSIX and impossible on Windows, then runs
// wazmrt with no shell in the argv path.
//
//   deno run -A posix-forms.ts <wazmrt> <abs module.wat>

const exe = Deno.args[0];
const mod = Deno.args[1];

for (const d of ["data", "q", "a:b", "back\\slash"]) {
  await Deno.mkdir(d, { recursive: true });
}

const cases: Array<[string, string]> = [
  // accepted forms
  ["./data:/m", "✅ expect ok"],
  ["./q:/m", "✅ one-letter dir behind ./"],
  ["./q::/m", "✅ same with ::"],
  [".:/", "✅ help's old form"],
  [".::/", "✅ help's new form"],
  ["/tmp:/m", "✅ absolute"],
  ["/tmp::/m", "✅ absolute with ::"],
  ["//tmp::/m", "✅ // is just absolute on POSIX"],
  ["../probe2/data::/m", "✅ parent-relative"],
  ["./a:b::/m", "✅ dir literally named a:b — only :: can name it"],
  ["./back\\slash::/m", "✅ dir literally named back\\slash — \\ is an ordinary byte"],
  // rejected forms
  ["q:/m", "❌ no drives on POSIX: splits to host q, bare relative"],
  ["q::/m", "❌ bare relative"],
  ["data:/m", "❌ bare relative"],
  ["C:/Users", "❌ splits to host C, bare relative"],
  ["C:", "❌ bare relative C (NOT drive-relative: no drives)"],
  ["\\\\srv\\share::/m", "❌ \\ is not a separator: bare relative"],
  [".\\data::/m", "❌ .\\data is a bare name on POSIX"],
  ["a:b::/m", "❌ bare relative a:b"],
];

console.log("| --dir spec | rc | first line | expectation |");
console.log("| --- | --- | --- | --- |");
for (const [s, want] of cases) {
  const out = await new Deno.Command(exe, {
    args: [mod, "--dir", s],
    stdout: "piped",
    stderr: "piped",
  }).output();
  const txt = (new TextDecoder().decode(out.stdout) +
    new TextDecoder().decode(out.stderr)).trim().split("\n")[0] ?? "";
  const expectOk = want.startsWith("✅");
  const agrees = (out.code === 0) === expectOk ? "" : "  ⚠️ MISMATCH";
  console.log(`| \`${s}\` | ${out.code} | ${txt.slice(0, 80)} | ${want}${agrees} |`);
}
