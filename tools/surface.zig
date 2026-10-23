//! surface.zig — wazmrt's PUBLIC SURFACE, generated from the sources, snapshotted, and diffed into
//! the minimum version bump it demands (workspace letter H6; `../../cmem/layout-and-packaging.md`
//! § "The compatibility gate", 🔒 owner 2026-09-20: *"backward compatible" is a gate result, never a
//! judgment made at bump time*).
//!
//! The surface is what a consumer can depend on, produced by this tool and never by hand:
//!   - `c`   — `include/wazmrt.h`: every prototype, typedef and `#define` (the include guard aside),
//!             one line each; enum members one line each WITH their ordinal, because C integers are
//!             frozen: appending a member is an addition, moving one is a break;
//!   - `zig` — `src/root.zig`'s `pub` declarations (signatures, not bodies). ⚠️ Names and re-exports
//!             only: a change INSIDE a re-exported module is not seen here (`cmem/releasing.md`);
//!   - `cli` — the SYNTAX lines of `wazmrt --help`: usage shapes, flag definitions, subcommand shapes.
//!             Descriptions are left out on purpose, so rewording help text is not a surface change;
//!             `argv[0]` is normalized to `wazmrt`, because the binary prints the path it was run by.
//!
//! Two snapshots live in `tools/surface/`:
//!   - `current.txt`  — the surface as committed. If the sources say otherwise the build is RED: a
//!                      surface change is re-baselined in its OWN commit with the reason (rule 5);
//!   - `released.txt` — the surface of the last RELEASE, headed `# released-as: X.Y.Z`. The floor is
//!                      computed against it: anything removed or changed → major, only additions →
//!                      minor, nothing → patch. Once `root.version` moves past `released-as`, a bump
//!                      below the floor is refused, with the lines that set it (rule 2).
//!
//! Usage: `surface <check|update|release> <snapshot dir> <wazmrt.h> <root.zig> <help.txt>`
//!   check   — the gate (`zig build surface`, and part of `zig build test`);
//!   update  — rewrite `current.txt` (`zig build surface -Dsurface=update`), its own commit;
//!   release — rewrite `released.txt` at the new version, after the release commit, its own commit.

const std = @import("std");
const Io = std.Io;
const Allocator = std.mem.Allocator;

const Kind = enum(u2) { patch, minor, major };

pub fn main(init: std.process.Init) !void {
    const arena = init.arena.allocator();
    const io = init.io;

    var stdout_buffer: [4096]u8 = undefined;
    var writer: Io.File.Writer = .init(.stdout(), io, &stdout_buffer);
    const out = &writer.interface;
    defer out.flush() catch {};

    const args = try init.minimal.args.toSlice(arena);
    if (args.len != 6) {
        try out.print("usage: surface <check|update|release> <snapshot dir> <wazmrt.h> <root.zig> <help.txt>\n", .{});
        return error.BadUsage;
    }
    const mode = args[1];
    const dir = args[2];
    const cwd = Io.Dir.cwd();
    const header = try cwd.readFileAlloc(io, args[3], arena, .limited(4 << 20));
    const root = try cwd.readFileAlloc(io, args[4], arena, .limited(4 << 20));
    const help = try cwd.readFileAlloc(io, args[5], arena, .limited(4 << 20));

    var lines: std.ArrayList([]const u8) = .empty;
    try surfaceOfHeader(arena, header, &lines);
    try surfaceOfRoot(arena, root, &lines);
    try surfaceOfHelp(arena, help, &lines);
    const version = rootVersion(root) orelse return error.NoVersionInRoot;
    // Every gate reads `lines` as a SET; the file is sorted so a diff of two snapshots is readable.
    std.mem.sort([]const u8, lines.items, {}, lessThan);
    const generated = try render(arena, lines.items, null);

    const current_path = try std.fs.path.join(arena, &.{ dir, "current.txt" });
    const released_path = try std.fs.path.join(arena, &.{ dir, "released.txt" });

    if (std.mem.eql(u8, mode, "update")) {
        try cwd.writeFile(io, .{ .sub_path = current_path, .data = generated });
        try out.print("  surface: wrote {s} ({d} lines). Commit it ON ITS OWN, saying why the surface changed.\n", .{ current_path, lines.items.len });
        return;
    }

    // ---- 1. the committed snapshot must BE the sources' surface ---------------------------------
    const committed = cwd.readFileAlloc(io, current_path, arena, .limited(4 << 20)) catch |e| {
        try out.print("  surface: cannot read {s}: {s} — run `zig build surface -Dsurface=update`\n", .{ current_path, @errorName(e) });
        return error.NoSnapshot;
    };
    const committed_lines = try parse(arena, committed);
    const drift = try diff(arena, committed_lines.lines, lines.items);
    if (drift.removed.len + drift.added.len != 0) {
        try out.print("\n  surface: the sources' public surface differs from {s}:\n", .{current_path});
        try printDiff(out, drift);
        try out.print("\n  Unrecorded surface change. If it is intended, re-baseline IN ITS OWN COMMIT with the reason:\n", .{});
        try out.print("      zig build surface -Dsurface=update\n  If it is not intended, the change that caused it is the bug.\n\n", .{});
        return error.SurfaceNotRebaselined;
    }

    // ---- 2. the floor, against the last RELEASE -------------------------------------------------
    const released_text = cwd.readFileAlloc(io, released_path, arena, .limited(4 << 20)) catch |e| {
        // BOOTSTRAP, once: with no released snapshot there is nothing to bump against, so `release`
        // records the CURRENT surface as the current version's. Honest only when the sources have
        // not changed the surface since that version shipped — the caller's claim to verify (for
        // 1.0.3: `git diff <release commit> HEAD -- include src` was empty, 2026-10-23).
        if (std.mem.eql(u8, mode, "release") and e == error.FileNotFound) {
            try cwd.writeFile(io, .{ .sub_path = released_path, .data = try render(arena, lines.items, version) });
            try out.print("  surface: BOOTSTRAP — wrote {s} as released-as {s}\n", .{ released_path, version });
            return;
        }
        try out.print("  surface: cannot read {s}: {s}\n", .{ released_path, @errorName(e) });
        return error.NoReleasedSnapshot;
    };
    const released = try parse(arena, released_text);
    const released_as = released.released_as orelse {
        try out.print("  surface: {s} has no `# released-as: X.Y.Z` line\n", .{released_path});
        return error.NoReleasedVersion;
    };
    const since = try diff(arena, released.lines, lines.items);
    const floor: Kind = if (since.removed.len != 0) .major else if (since.added.len != 0) .minor else .patch;

    const from = try parseSemver(released_as);
    const to = try parseSemver(version);
    const order = cmpSemver(to, from);

    if (std.mem.eql(u8, mode, "release")) {
        if (order != .gt) {
            try out.print("  surface: release needs root.version ({s}) past released-as ({s})\n", .{ version, released_as });
            return error.NotABump;
        }
        try checkBump(out, released_as, version, from, to, floor, since);
        const data = try render(arena, lines.items, version);
        try cwd.writeFile(io, .{ .sub_path = released_path, .data = data });
        try out.print("  surface: wrote {s} as released-as {s}. Commit it ON ITS OWN, after the release commit.\n", .{ released_path, version });
        return;
    }
    if (!std.mem.eql(u8, mode, "check")) {
        try out.print("  surface: unknown mode '{s}' (check | update | release)\n", .{mode});
        return error.BadUsage;
    }

    switch (order) {
        .lt => {
            try out.print("  surface: root.version {s} is BELOW released-as {s}\n", .{ version, released_as });
            return error.VersionWentBackwards;
        },
        .eq => {
            try out.print("  surface: OK — {d} lines, snapshot current; since {s}: +{d} -{d}, so the next bump is at least {s}\n", .{ lines.items.len, released_as, since.added.len, since.removed.len, @tagName(floor) });
            if (floor != .patch) try printDiff(out, since);
        },
        .gt => {
            try checkBump(out, released_as, version, from, to, floor, since);
            try out.print("  surface: OK — {s} → {s} meets the floor ({s}); run `-Dsurface=release` after the release commit\n", .{ released_as, version, @tagName(floor) });
        },
    }
}

/// Refuse a bump below the floor, naming the lines that set it.
fn checkBump(out: *Io.Writer, from_s: []const u8, to_s: []const u8, from: [3]u64, to: [3]u64, floor: Kind, since: Diff) !void {
    const kind: Kind = if (to[0] != from[0]) .major else if (to[1] != from[1]) .minor else .patch;
    // SemVer resets: a minor bump must zero the patch, a major bump the minor and patch.
    const resets_ok = switch (kind) {
        .major => to[1] == 0 and to[2] == 0,
        .minor => to[2] == 0,
        .patch => true,
    };
    if (!resets_ok) {
        try out.print("  surface: {s} → {s} is a {s} bump that does not reset the lower components\n", .{ from_s, to_s, @tagName(kind) });
        return error.BadSemverBump;
    }
    if (@intFromEnum(kind) < @intFromEnum(floor)) {
        try out.print("\n  surface: {s} → {s} is a {s} bump, but the surface since {s} demands at least {s}:\n", .{ from_s, to_s, @tagName(kind), from_s, @tagName(floor) });
        try printDiff(out, since);
        try out.print("\n", .{});
        return error.BumpBelowFloor;
    }
}

// ---- the three surfaces ---------------------------------------------------------------------------

fn surfaceOfHeader(a: Allocator, src: []const u8, lines: *std.ArrayList([]const u8)) !void {
    const text = try stripComments(a, src);
    var body: std.ArrayList(u8) = .empty;
    var it = std.mem.splitScalar(u8, text, '\n');
    var cplusplus: usize = 0; // inside `#ifdef __cplusplus` … `#endif`: C++ linkage glue, not API
    while (it.next()) |raw| {
        const line = std.mem.trim(u8, raw, " \t\r");
        if (line.len != 0 and line[0] == '#') {
            const d = collapse(a, line[1..]) catch line;
            if (std.mem.startsWith(u8, d, "ifdef __cplusplus")) cplusplus += 1 else if (cplusplus != 0 and std.mem.startsWith(u8, d, "endif")) cplusplus -= 1 else if (cplusplus == 0 and std.mem.startsWith(u8, d, "define ") and !std.mem.startsWith(u8, d, "define WAZMRT_H")) {
                try lines.append(a, try std.fmt.allocPrint(a, "c #{s}", .{d}));
            }
            continue;
        }
        if (cplusplus != 0) continue;
        try body.appendSlice(a, raw);
        try body.append(a, '\n');
    }
    // Top-level statements end at `;` outside any brace or paren.
    var depth: i32 = 0;
    var start: usize = 0;
    for (body.items, 0..) |ch, i| switch (ch) {
        '{', '(' => depth += 1,
        '}', ')' => depth -= 1,
        ';' => if (depth == 0) {
            const stmt = try normalizeC(a, body.items[start..i]);
            start = i + 1;
            if (stmt.len == 0) continue;
            if (std.mem.startsWith(u8, stmt, "typedef enum{")) {
                try enumMembers(a, stmt, lines);
            } else {
                try lines.append(a, try std.fmt.allocPrint(a, "c {s};", .{stmt}));
            }
        },
        else => {},
    };
}

/// `typedef enum{A=0,B=1}name` → one line per member, with its ordinal.
fn enumMembers(a: Allocator, stmt: []const u8, lines: *std.ArrayList([]const u8)) !void {
    const open = std.mem.indexOfScalar(u8, stmt, '{').?;
    const close = std.mem.lastIndexOfScalar(u8, stmt, '}') orelse return error.MalformedEnum;
    const name = std.mem.trim(u8, stmt[close + 1 ..], " ");
    var members = std.mem.splitScalar(u8, stmt[open + 1 .. close], ',');
    var ordinal: usize = 0;
    while (members.next()) |m| {
        const member = std.mem.trim(u8, m, " ");
        if (member.len == 0) continue;
        try lines.append(a, try std.fmt.allocPrint(a, "c enum {s}[{d}] {s}", .{ name, ordinal, member }));
        ordinal += 1;
    }
}

fn surfaceOfRoot(a: Allocator, src: []const u8, lines: *std.ArrayList([]const u8)) !void {
    var it = std.mem.splitScalar(u8, src, '\n');
    var pending: std.ArrayList(u8) = .empty;
    var in_decl = false;
    while (it.next()) |raw| {
        const line = std.mem.trimEnd(u8, raw, " \t\r");
        if (!in_decl) {
            if (!std.mem.startsWith(u8, line, "pub ")) continue;
            in_decl = true;
            pending.clearRetainingCapacity();
        }
        try pending.appendSlice(a, line);
        try pending.append(a, ' ');
        // A declaration ends at its first `;` or, for a function or a container, at its first `{`:
        // the SIGNATURE is the surface, the body is not.
        const p = pending.items;
        const semi = std.mem.indexOfScalar(u8, p, ';');
        const brace = std.mem.indexOfScalar(u8, p, '{');
        const end = if (semi != null and (brace == null or semi.? < brace.?)) semi.? + 1 else if (brace) |b| b else continue;
        var decl = try collapse(a, p[0..end]);
        if (brace != null and (semi == null or brace.? < semi.?)) decl = try std.fmt.allocPrint(a, "{s} {{ … }}", .{decl});
        // The version VALUE moves every release; the declaration is the surface.
        if (std.mem.startsWith(u8, decl, "pub const version:")) decl = "pub const version: [:0]const u8 = <version>;";
        try lines.append(a, try std.fmt.allocPrint(a, "zig {s}", .{decl}));
        in_decl = false;
    }
}

fn surfaceOfHelp(a: Allocator, help: []const u8, lines: *std.ArrayList([]const u8)) !void {
    // argv[0] is whatever path the binary was run by: read it off the first USAGE line, which is
    // `  <argv0> <module> …`, and write `wazmrt` everywhere instead.
    const usage_at = std.mem.indexOf(u8, help, "\nUSAGE") orelse return error.NoUsageInHelp;
    const first = std.mem.indexOfScalarPos(u8, help, usage_at + 1, '\n') orelse return error.NoUsageInHelp;
    const line_end = std.mem.indexOfScalarPos(u8, help, first + 1, '\n') orelse help.len;
    const usage_line = std.mem.trim(u8, help[first + 1 .. line_end], " \t\r");
    const argv0 = usage_line[0 .. std.mem.indexOf(u8, usage_line, " <") orelse return error.NoUsageInHelp];
    const text = try std.mem.replaceOwned(u8, a, help, argv0, "wazmrt");

    var section: []const u8 = "";
    var it = std.mem.splitScalar(u8, text, '\n');
    while (it.next()) |raw| {
        const line = std.mem.trimEnd(u8, raw, " \t\r");
        if (line.len == 0) continue;
        if (line[0] != ' ') {
            // A section header: `USAGE — …`, `WASI FLAGS (before `--`)`, `OPTIONS`.
            const cut = std.mem.indexOfAny(u8, line, "(—") orelse line.len;
            section = std.mem.trim(u8, line[0..cut], " ");
            continue;
        }
        // Only DEFINITION lines, indented exactly two spaces; continuations and examples are deeper.
        if (line.len < 3 or line[0] != ' ' or line[1] != ' ' or line[2] == ' ') continue;
        const body = line[2..];
        const keep = if (std.mem.eql(u8, section, "USAGE"))
            std.mem.startsWith(u8, body, "wazmrt")
        else if (std.mem.eql(u8, section, "SUBCOMMANDS"))
            true
        else if (std.mem.endsWith(u8, section, "FLAGS") or std.mem.eql(u8, section, "OPTIONS"))
            body[0] == '-'
        else
            false;
        if (!keep) continue;
        // The syntax ends where the description starts: the first run of two or more spaces.
        const syntax = body[0 .. std.mem.indexOf(u8, body, "  ") orelse body.len];
        try lines.append(a, try std.fmt.allocPrint(a, "cli {s}: {s}", .{ section, try collapse(a, syntax) }));
    }
}

fn rootVersion(root: []const u8) ?[]const u8 {
    const key = "pub const version: [:0]const u8 = \"";
    const at = std.mem.indexOf(u8, root, key) orelse return null;
    const start = at + key.len;
    const end = std.mem.indexOfScalarPos(u8, root, start, '"') orelse return null;
    return root[start..end];
}

// ---- text helpers ---------------------------------------------------------------------------------

/// Remove `/* … */` and `// …` comments, leaving string and char literals intact.
fn stripComments(a: Allocator, src: []const u8) ![]u8 {
    var o: std.ArrayList(u8) = .empty;
    var i: usize = 0;
    while (i < src.len) {
        const c = src[i];
        if (c == '"' or c == '\'') {
            const q = c;
            try o.append(a, c);
            i += 1;
            while (i < src.len and src[i] != q) : (i += 1) {
                if (src[i] == '\\' and i + 1 < src.len) {
                    try o.append(a, src[i]);
                    i += 1;
                }
                try o.append(a, src[i]);
            }
            if (i < src.len) try o.append(a, src[i]);
            i += 1;
        } else if (c == '/' and i + 1 < src.len and src[i + 1] == '*') {
            const end = std.mem.indexOfPos(u8, src, i + 2, "*/") orelse src.len;
            // Keep the newlines, so preprocessor lines stay on lines of their own.
            for (src[i..@min(end + 2, src.len)]) |x| if (x == '\n') try o.append(a, '\n');
            i = end + 2;
        } else if (c == '/' and i + 1 < src.len and src[i + 1] == '/') {
            while (i < src.len and src[i] != '\n') i += 1;
        } else {
            try o.append(a, c);
            i += 1;
        }
    }
    return o.items;
}

/// Collapse whitespace runs to one space and trim.
fn collapse(a: Allocator, s: []const u8) ![]const u8 {
    var o: std.ArrayList(u8) = .empty;
    var space = false;
    for (std.mem.trim(u8, s, " \t\r\n")) |c| {
        if (c == ' ' or c == '\t' or c == '\r' or c == '\n') {
            space = true;
            continue;
        }
        if (space) try o.append(a, ' ');
        space = false;
        try o.append(a, c);
    }
    return o.items;
}

/// One canonical spelling of a C statement: whitespace collapsed, and none around punctuation, so
/// that re-indenting the header or aligning its columns is not a surface change.
fn normalizeC(a: Allocator, s: []const u8) ![]const u8 {
    const c = try collapse(a, s);
    var o: std.ArrayList(u8) = .empty;
    for (c, 0..) |ch, i| {
        if (ch == ' ') {
            const prev = if (o.items.len != 0) o.items[o.items.len - 1] else ' ';
            const next = if (i + 1 < c.len) c[i + 1] else ' ';
            if (std.mem.indexOfScalar(u8, "(){},;*=[]", prev) != null or std.mem.indexOfScalar(u8, "(){},;*=[]", next) != null) continue;
        }
        try o.append(a, ch);
    }
    return o.items;
}

fn lessThan(_: void, x: []const u8, y: []const u8) bool {
    return std.mem.order(u8, x, y) == .lt;
}

fn render(a: Allocator, lines: []const []const u8, released_as: ?[]const u8) ![]u8 {
    var o: std.ArrayList(u8) = .empty;
    try o.appendSlice(a, "# wazmrt public surface — GENERATED by tools/surface.zig; never edit by hand.\n");
    try o.appendSlice(a, "# c = include/wazmrt.h · zig = src/root.zig `pub` decls · cli = `wazmrt --help` syntax lines\n");
    if (released_as) |v| try o.appendSlice(a, try std.fmt.allocPrint(a, "# released-as: {s}\n", .{v}));
    for (lines) |l| {
        try o.appendSlice(a, l);
        try o.append(a, '\n');
    }
    return o.items;
}

const Parsed = struct { lines: []const []const u8, released_as: ?[]const u8 };

fn parse(a: Allocator, text: []const u8) !Parsed {
    var lines: std.ArrayList([]const u8) = .empty;
    var released_as: ?[]const u8 = null;
    var it = std.mem.splitScalar(u8, text, '\n');
    while (it.next()) |raw| {
        const line = std.mem.trimEnd(u8, raw, "\r");
        if (line.len == 0) continue;
        if (line[0] == '#') {
            const key = "# released-as: ";
            if (std.mem.startsWith(u8, line, key)) released_as = std.mem.trim(u8, line[key.len..], " ");
            continue;
        }
        try lines.append(a, line);
    }
    return .{ .lines = lines.items, .released_as = released_as };
}

const Diff = struct { removed: []const []const u8, added: []const []const u8 };

/// Set difference both ways. A CHANGED line is a removal plus an addition, which is what makes a
/// changed signature a major: the old one is gone.
fn diff(a: Allocator, old: []const []const u8, new: []const []const u8) !Diff {
    var olds: std.StringHashMapUnmanaged(void) = .empty;
    var news: std.StringHashMapUnmanaged(void) = .empty;
    for (old) |l| try olds.put(a, l, {});
    for (new) |l| try news.put(a, l, {});
    var removed: std.ArrayList([]const u8) = .empty;
    var added: std.ArrayList([]const u8) = .empty;
    for (old) |l| if (!news.contains(l)) try removed.append(a, l);
    for (new) |l| if (!olds.contains(l)) try added.append(a, l);
    return .{ .removed = removed.items, .added = added.items };
}

fn printDiff(out: *Io.Writer, d: Diff) !void {
    for (d.removed) |l| try out.print("    - {s}\n", .{l});
    for (d.added) |l| try out.print("    + {s}\n", .{l});
}

fn parseSemver(s: []const u8) ![3]u64 {
    var r: [3]u64 = undefined;
    var it = std.mem.splitScalar(u8, s, '.');
    for (&r) |*part| part.* = try std.fmt.parseInt(u64, it.next() orelse return error.BadVersion, 10);
    if (it.next() != null) return error.BadVersion;
    return r;
}

fn cmpSemver(x: [3]u64, y: [3]u64) std.math.Order {
    for (x, y) |p, q| if (p != q) return std.math.order(p, q);
    return .eq;
}
