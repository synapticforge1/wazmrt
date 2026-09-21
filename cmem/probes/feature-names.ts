// Workspace letter H8 / divergence I6 — do the runtimes accept every `--features` name that
// wasm-tools lists? The list is READ from wasm-tools' own error output, not recalled. A name a runtime
// does not know makes `--features <name> <module>` fail with "unknown"; any other outcome means the
// name resolved. The module is a trivial valid one, so validation cannot be the reason for a failure.
//
//   deno run -A feature-names.ts <module.wat> <runtime exe>...
//
// ⚠️ Accepting a name is not the same as GATING the proposal it names (see wazmrt's
// `extended_const`, a published gate that could never fire). This measures the vocabulary only.

const [mod, ...runtimes] = Deno.args;

async function run(cmd: string, args: string[]) {
  const r = await new Deno.Command(cmd, { args, stdout: "piped", stderr: "piped" }).output();
  return { code: r.code, text: new TextDecoder().decode(r.stdout) + new TextDecoder().decode(r.stderr) };
}

const probe = await run("wasm-tools", ["validate", "--features", "no-such-feature", mod]);
const line = probe.text.split("\n").find((l) => l.startsWith("Valid features:"));
if (!line) throw new Error("could not read wasm-tools' feature list:\n" + probe.text);
const names = line.replace("Valid features:", "").split(",").map((s) => s.trim()).filter(Boolean);

const unknownOn: Record<string, string[]> = {};
for (const exe of runtimes) {
  const tag = exe.split(/[\\/]/).pop()!;
  unknownOn[tag] = [];
  for (const n of names) {
    const r = await run(exe, ["--features", n, mod]);
    if (r.code !== 0 && /unknown/i.test(r.text)) unknownOn[tag].push(n);
  }
}
console.log(`wasm-tools lists ${names.length} names.`);
for (const [tag, miss] of Object.entries(unknownOn)) {
  console.log(`${tag}: knows ${names.length - miss.length}/${names.length}; UNKNOWN: ${miss.join(", ") || "(none)"}`);
}
