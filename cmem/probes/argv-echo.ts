// Prints its own argv, byte for byte, so we measure what the SHELL delivered
// rather than what wazmrt did with it. wazmrt is deliberately not involved.
//
//   bun argv-echo.ts <spec> [<spec> ...]
for (const a of process.argv.slice(2)) {
  console.log(JSON.stringify(a));
}
