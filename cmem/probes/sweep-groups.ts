// Group an `opcode-sweep.ts` result by agreement PATTERN (wasm-tools · wazmrt · wasmrt · binaryang),
// so "which opcodes does only X know" reads at a glance. Replaces the ad-hoc `deno eval` one-liners
// this was first done with (INDEX.md → TOOLING forbids those).
//
//   deno run -A opcode-sweep.ts … > result.txt ;  deno run -A sweep-groups.ts result.txt [--full]

const [file] = Deno.args;
const full = Deno.args.includes("--full");
const rows = Deno.readTextFileSync(file).split("\n").filter((l) => /^0x/.test(l));
const groups = new Map<string, string[]>();
for (const l of rows) {
  const op = l.slice(0, 12).trim(); // "0xe0" or "0xfe 4f" — the opcode column is fixed-width
  const cells = l.slice(12).trim().split(/\s+/);
  const key = cells.join(" ");
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key)!.push(op);
}
console.log("wasm-tools wazmrt wasmrt binaryang   count   opcodes");
for (const [k, ops] of groups) {
  const shown = full || ops.length <= 16 ? ops.join(", ") : `${ops.slice(0, 8).join(", ")} … ${ops.slice(-3).join(", ")}`;
  console.log(`${k.padEnd(18)} ${String(ops.length).padStart(4)}   ${shown}`);
}
