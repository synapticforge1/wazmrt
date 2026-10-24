//! cli_behaviour.zig — S1 for the CLI: which command lines does this build ACCEPT, and with what
//! exit code? (Owner, 2026-10-24: "the gate should cover the CLI".)
//!
//! `beh` sees which MODULES the library accepts; the `cli` surface lines see the SYNTAX `--help`
//! prints. Neither sees what a command line DOES. `2.0.1` refused `--pins missing.txt` and
//! `--env A`, both of which `2.0.0` ran, and the gate called it a patch: a CLI behaviour change
//! passed it silently. This closes that hole.
//!
//! Each line of `<case dir>/cases.txt` is one command line, run against the BUILT `wazmrt` from
//! `<case dir>` with stdin closed (no TTY, so no prompt can block). The verdict is the exit code:
//!   - 0, or 10 and above (the fixtures exit with 10 + what they observed) → ACCEPTED, and a line
//!     `run <args> exits <rc>`;
//!   - 1 to 9 → REFUSED by the host: no line.
//! Only accepted cases are lines, as in `beh`: accepted → refused REMOVES a line (major), refused →
//! accepted adds one (minor), and the same command line exiting differently is a removal plus an
//! addition (major). Any change at all also drifts `current.txt`, so nothing moves unrecorded.
//!
//! ⚠️ A crash, a signal or a timeout is not a verdict: the tool fails, naming the case.
//! ⚠️ A ROOT-OWNED pin DB on the machine (`interop.md` §3.3) can change the verification cases'
//! verdicts; the gate's numbers are for a machine without one.
//!
//! Usage: `cli_behaviour <wazmrt exe> <case dir> <out file>`

const std = @import("std");
const Io = std.Io;

pub fn main(init: std.process.Init) !void {
    const arena = init.arena.allocator();
    const io = init.io;
    const args = try init.minimal.args.toSlice(arena);
    if (args.len != 4) return error.BadUsage;
    const exe = args[1];
    const case_dir = args[2];
    const out_path = args[3];

    const cases_path = try std.fs.path.join(arena, &.{ case_dir, "cases.txt" });
    const text = try Io.Dir.cwd().readFileAlloc(io, cases_path, arena, .limited(1 << 20));

    var lines: std.ArrayList([]const u8) = .empty;
    var cases: usize = 0;
    var it = std.mem.splitScalar(u8, text, '\n');
    while (it.next()) |raw| {
        const line = std.mem.trim(u8, raw, " \t\r");
        if (line.len == 0 or line[0] == '#') continue;
        cases += 1;

        var argv: std.ArrayList([]const u8) = .empty;
        try argv.append(arena, exe);
        var words = std.mem.tokenizeScalar(u8, line, ' ');
        while (words.next()) |w| try argv.append(arena, w);

        const r = std.process.run(arena, io, .{
            .argv = argv.items,
            .cwd = .{ .path = case_dir },
            // Generous: every case finishes in milliseconds, and `loop.wat` is always bounded.
            .timeout = .{ .duration = .{ .raw = .fromSeconds(60), .clock = .awake } },
        }) catch |e| {
            std.debug.print("cli_behaviour: `wazmrt {s}` did not complete: {s}\n", .{ line, @errorName(e) });
            return error.CaseDidNotComplete;
        };
        const rc = switch (r.term) {
            .exited => |c| c,
            else => {
                std.debug.print("cli_behaviour: `wazmrt {s}` did not exit normally: {any}\n", .{ line, r.term });
                return error.CaseCrashed;
            },
        };
        if (rc >= 1 and rc <= 9) continue; // refused by the host
        try lines.append(arena, try std.fmt.allocPrint(arena, "run {s} exits {d}", .{ line, rc }));
    }
    // 🔒 No cases, or none accepted, is a gate that checks nothing (the size gate's lesson).
    if (cases == 0 or lines.items.len == 0) {
        std.debug.print("cli_behaviour: {d} cases, {d} accepted — nothing to record\n", .{ cases, lines.items.len });
        return error.NothingJudged;
    }
    std.mem.sort([]const u8, lines.items, {}, lessThan);

    var out: std.ArrayList(u8) = .empty;
    for (lines.items) |l| {
        try out.appendSlice(arena, l);
        try out.append(arena, '\n');
    }
    try Io.Dir.cwd().writeFile(io, .{ .sub_path = out_path, .data = out.items });
}

fn lessThan(_: void, x: []const u8, y: []const u8) bool {
    return std.mem.order(u8, x, y) == .lt;
}
