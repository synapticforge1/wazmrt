// Does a real POSIX bash rewrite `--dir` arguments the way Git Bash's MSYS layer
// does on Windows? Hand bash a command line exactly as a user would type it, and
// have argv-echo.ts report what arrived.
//
//   deno run -A bash-argv.ts <abs path to argv-echo.ts>

const echo = Deno.args[0];
const typed = [
  "./data:/m",
  ".:/",
  "/etc:/m",
  "q:/m",
  "C:/Users:/m",
  "a:b::/m",
  "//srv/share:/m",
];
const line = `deno run -A '${echo}' ` + typed.map((t) => `'${t}'`).join(" ");
const out = await new Deno.Command("bash", {
  args: ["-c", line],
  env: { PATH: `${Deno.env.get("HOME")}/.deno/bin:/usr/bin:/bin` },
  stdout: "piped",
  stderr: "piped",
}).output();
const got = new TextDecoder().decode(out.stdout).trim().split("\n").map((l) => JSON.parse(l));

console.log("| typed | bash delivered | verbatim? |");
console.log("| --- | --- | --- |");
typed.forEach((t, i) => {
  console.log(`| \`${t}\` | \`${got[i]}\` | ${got[i] === t ? "✅" : "💥 REWRITTEN"} |`);
});
const err = new TextDecoder().decode(out.stderr).trim();
if (err) console.log("\nstderr:", err);
