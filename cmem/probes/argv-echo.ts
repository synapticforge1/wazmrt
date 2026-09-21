// Prints its own argv, byte for byte, so we measure what the SHELL delivered
// rather than what wazmrt did with it. wazmrt is deliberately not involved.
//
//   deno run -A argv-echo.ts <spec> [<spec> ...]
for (const a of Deno.args) {
  console.log(JSON.stringify(a));
}
