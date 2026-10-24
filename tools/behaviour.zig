//! behaviour.zig — S1 of H6's rule 3: which modules does this build ACCEPT, and under which
//! `--features`? (`cmem/releasing.md` → "Rule 3 as behaviour carried forward", owner 2026-10-23.)
//!
//! The surface gate sees what a consumer can NAME; this sees what a consumer can RELY ON. A
//! release that starts refusing a module the last one accepted ("accepting less", kind 4) changes
//! no name, yet breaks a working consumer: `1.0.3` refused a mutable-global export under `mvp`,
//! and the measurement that scoped this check found exactly that and nothing else.
//!
//! For every module in the corpus dir and every configuration (each preset, and each single
//! feature on top of `-all`), the verdict is the CLI's own: assemble a `.wat`, decode, and
//! `validateWith` the set that `--features <config>` parses to. ⚠️ It NEVER RUNS anything, which is
//! why this is a library call and not a spawned `wazmrt`: the CLI runs a module with `_start`,
//! and a validation verdict must not depend on what the module does when run. The parser is the
//! CLI's, moved into `features.zig` for exactly this, so the two cannot disagree.
//!
//! Output: one line per ACCEPTED pair, `beh <config> accepts <module>`, sorted. It feeds
//! `tools/surface.zig` as a fourth surface kind, so a pair that disappears is a removed surface
//! line (major) and a pair that appears is an added one (minor).
//!
//! Usage: `behaviour <corpus dir> <out file>`

const std = @import("std");
const Io = std.Io;
const wazmrt = @import("wazmrt");

pub fn main(init: std.process.Init) !void {
    const arena = init.arena.allocator();
    const io = init.io;
    const args = try init.minimal.args.toSlice(arena);
    if (args.len != 3) return error.BadUsage;
    const corpus_path = args[1];
    const out_path = args[2];

    // ---- the configurations: every preset, and every single feature on top of nothing ---------
    var configs: std.ArrayList([]const u8) = .empty;
    for ([_][]const u8{ "all", "-all", "mvp", "wasm1", "wasm2", "wasm3", "lime1" }) |p| try configs.append(arena, p);
    for (0..wazmrt.features.count) |i| {
        const f: wazmrt.features.Feature = @enumFromInt(@as(u8, @intCast(i)));
        // The hyphenated spelling, the one a user writes (`bulk-memory`, not `bulk_memory`).
        const n = try arena.dupe(u8, f.name());
        std.mem.replaceScalar(u8, n, '_', '-');
        try configs.append(arena, try std.fmt.allocPrint(arena, "-all,{s}", .{n}));
    }
    const sets = try arena.alloc(wazmrt.features.Set, configs.items.len);
    for (configs.items, sets) |c, *s| {
        var buf: [4096]u8 = undefined;
        var sink: Io.Writer = .fixed(&buf);
        // A configuration this parser refuses is a bug in THIS list, never a verdict.
        s.* = wazmrt.features.parseFeatures(c, .{}, &sink) catch {
            std.debug.print("behaviour: --features {s} does not parse:\n{s}\n", .{ c, sink.buffered() });
            return error.ConfigDoesNotParse;
        };
    }

    // ---- the corpus ------------------------------------------------------------------------------
    var names: std.ArrayList([]const u8) = .empty;
    var dir = try Io.Dir.cwd().openDir(io, corpus_path, .{ .iterate = true });
    defer dir.close(io);
    var walker = try dir.walk(arena);
    defer walker.deinit();
    while (try walker.next(io)) |ent| {
        if (ent.kind != .file) continue;
        if (!std.mem.endsWith(u8, ent.basename, ".wat") and !std.mem.endsWith(u8, ent.basename, ".wasm")) continue;
        try names.append(arena, try arena.dupe(u8, ent.path));
    }
    std.mem.sort([]const u8, names.items, {}, lessThan);
    // 🔒 An empty corpus judges nothing and would report a clean floor: a gate that checks
    // nothing is not a gate (the size gate's lesson).
    if (names.items.len == 0) {
        std.debug.print("behaviour: no .wat / .wasm in {s}\n", .{corpus_path});
        return error.EmptyCorpus;
    }

    var lines: std.ArrayList([]const u8) = .empty;
    for (names.items) |name| {
        const bytes = try dir.readFileAlloc(io, name, arena, .limited(16 << 20));
        const is_wat = std.mem.endsWith(u8, name, ".wat");
        const display = try arena.dupe(u8, name);
        std.mem.replaceScalar(u8, display, '\\', '/');
        for (configs.items, sets) |c, s| {
            if (accepts(bytes, is_wat, s)) try lines.append(arena, try std.fmt.allocPrint(arena, "beh {s} accepts {s}", .{ c, display }));
        }
    }
    std.mem.sort([]const u8, lines.items, {}, lessThan);

    var text: std.ArrayList(u8) = .empty;
    for (lines.items) |l| {
        try text.appendSlice(arena, l);
        try text.append(arena, '\n');
    }
    try Io.Dir.cwd().writeFile(io, .{ .sub_path = out_path, .data = text.items });
}

/// The CLI's verdict for `wazmrt --features <set> <module>` on a module it does not run.
fn accepts(bytes: []const u8, is_wat: bool, set: wazmrt.features.Set) bool {
    // A fresh arena per judgement: about fifteen hundred of them, and nothing outlives one.
    var arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
    defer arena.deinit();
    const a = arena.allocator();
    const bin = if (is_wat) wazmrt.wat.assemble(a, bytes) catch return false else bytes;
    var module = wazmrt.decode(a, bin) catch return false;
    defer module.deinit();
    wazmrt.validateWith(a, &module, set) catch return false;
    return true;
}

fn lessThan(_: void, x: []const u8, y: []const u8) bool {
    return std.mem.order(u8, x, y) == .lt;
}
