//! Spec-conformance runner: walk a WebAssembly spec-testsuite checkout (a
//! directory of `.wast` files), run each through wazmrt's in-process `.wast`
//! runner, aggregate pass/fail/skip totals, and exit non-zero if any assertion
//! fails. Invoked by `zig build conformance -Dtestsuite=<dir>`.
//!
//! The corpus is intentionally not vendored (it is large and lives upstream — see
//! cmem/testing.md); clone it and point the step at it:
//!   git clone https://github.com/WebAssembly/testsuite
//!   zig build conformance -Dtestsuite=path/to/testsuite
//!
//! 🔁 **S2 of H6's rule 3, behaviour carried forward** (owner, 2026-10-23; `cmem/releasing.md` →
//! "Rule 3 as behaviour carried forward"). Besides the expected-failure baseline, the step keeps
//! a RELEASE's per-file results (`tools/conformance-released.txt`): `-Drecord-released=true`
//! writes them after a release, and `-Dreleased=<file>` compares against them. Pinned by CONTENT:
//! each line carries the file's SHA-256, so only a file whose bytes are the release's is compared,
//! and a moved corpus is reported, never silently compared against the wrong text. A file that
//! lost passes, gained failures or gained skips (passes turned into skips are a loss too) is a
//! regression SINCE THE RELEASE. 🔒 The stages run in order (owner): S2 runs after S1 is clean,
//! and S3 waits for S2.

const std = @import("std");
const Io = std.Io;
const wazmrt = @import("wazmrt");

/// A baseline entry: how many assertion failures this file is *known* to have
/// (or that it is known to fail the runner outright).
const Expected = struct { runner_error: bool, failures: usize };

/// What a file actually did this run — kept so `-Dwrite-baseline=true` can emit
/// a fresh baseline and so the summary can name regressions.
const Observed = struct { path: []const u8, runner_error: bool, failures: usize };

/// S2: one file's result, for EVERY file (not only failing ones), with the content hash that pins
/// it. `runner_error` files record zeros and are marked, so a later run can tell the two apart.
const Result = struct { path: []const u8, sha: [64]u8, passed: usize, failed: usize, skipped: usize, runner_error: bool };

pub fn main(init: std.process.Init) !void {
    const arena = init.arena.allocator();
    const io = init.io;

    var stdout_buffer: [4096]u8 = undefined;
    var writer: Io.File.Writer = .init(.stdout(), io, &stdout_buffer);
    const out = &writer.interface;
    defer out.flush() catch {};

    const args = try init.minimal.args.toSlice(arena);
    const dir_path = if (args.len > 1) args[1] else "";
    const baseline_path = if (args.len > 2) args[2] else "";
    const write_baseline = args.len > 3 and std.mem.eql(u8, args[3], "write");
    // How many failures to list per failing file (`-Dfailures=N`). 1 keeps the
    // historical one-line-per-file output.
    const show_failures: usize = if (args.len > 4) (std.fmt.parseInt(usize, args[4], 10) catch 1) else 1;
    // S2: the release's per-file results to compare against (`-Dreleased=<file>`), and whether to
    // RECORD this run as the release's instead (`-Drecord-released=true`).
    const released_path = if (args.len > 5) args[5] else "";
    const record_released = args.len > 6 and std.mem.eql(u8, args[6], "record");
    if (dir_path.len == 0) {
        try out.print(
            \\conformance: no testsuite directory given.
            \\  Clone the WebAssembly spec testsuite and point this step at it:
            \\    git clone https://github.com/WebAssembly/testsuite
            \\    zig build conformance -Dtestsuite=path/to/testsuite
            \\
        , .{});
        return;
    }

    var dir = Io.Dir.cwd().openDir(io, dir_path, .{ .iterate = true }) catch |e| {
        try out.print("conformance: cannot open '{s}': {s}\n", .{ dir_path, @errorName(e) });
        return error.CannotOpenTestsuite;
    };
    defer dir.close(io);

    // Expected-failure baseline. Without one this step can only gate on ZERO
    // failures, which the upstream testsuite has never satisfied here (see the
    // snapshot in cmem/testing.md: linking 37, return_call_ref 9, …) — so it
    // would fail forever and gate nothing. With a baseline it gates on
    // *regressions*, which is what a CI step is actually for.
    var baseline: std.StringHashMapUnmanaged(Expected) = .empty;
    if (baseline_path.len != 0) {
        if (Io.Dir.cwd().readFileAlloc(io, baseline_path, arena, .limited(4 << 20))) |text| {
            var lines = std.mem.splitScalar(u8, text, '\n');
            while (lines.next()) |raw| {
                const line = std.mem.trim(u8, raw, " \t\r");
                if (line.len == 0 or line[0] == '#') continue;
                const sp = std.mem.indexOfScalar(u8, line, ' ') orelse continue;
                const tok = line[0..sp];
                const path = std.mem.trim(u8, line[sp + 1 ..], " \t");
                const exp: Expected = if (std.mem.eql(u8, tok, "error"))
                    .{ .runner_error = true, .failures = 0 }
                else
                    .{ .runner_error = false, .failures = std.fmt.parseInt(usize, tok, 10) catch continue };
                try baseline.put(arena, try arena.dupe(u8, path), exp);
            }
        } else |e| if (!write_baseline) {
            try out.print("conformance: cannot read baseline '{s}': {s}\n", .{ baseline_path, @errorName(e) });
            return error.CannotOpenBaseline;
        }
    }

    // Collected for `-Dwrite-baseline=true` and for the regression verdict.
    var observed: std.ArrayList(Observed) = .empty;
    // S2: every file's result, for `-Drecord-released` and the comparison against a release.
    var results: std.ArrayList(Result) = .empty;
    var regressions: usize = 0;
    var improvements: usize = 0;

    var total_pass: usize = 0;
    var total_fail: usize = 0;
    var total_skip: usize = 0;
    var files: usize = 0;
    var bad_files: usize = 0;

    var walker = try dir.walk(arena);
    defer walker.deinit();
    while (true) {
        // Per-*file* errors are already handled gracefully below; a directory
        // iteration error used to propagate and abandon the entire run, so one
        // unreadable subdirectory would discard every result gathered so far.
        // Count it like a bad file and stop walking, keeping what we have.
        const maybe = walker.next(io) catch |e| {
            try out.print("  ! directory walk stopped: {s}\n", .{@errorName(e)});
            bad_files += 1;
            regressions += 1;
            break;
        };
        const ent = maybe orelse break;
        if (ent.kind != .file) continue;
        if (!std.mem.endsWith(u8, ent.basename, ".wast")) continue;
        files += 1;

        // A fresh arena per file so memory doesn't accumulate across a testsuite
        // of thousands of scripts. `ent.path`/`.basename` are invalidated by the
        // next `walker.next`, so everything using them stays inside this iteration.
        var file_arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);
        defer file_arena.deinit();
        const a = file_arena.allocator();

        // `ent.path` is invalidated by the next `walker.next`, so anything kept
        // past this iteration is duped into the outer arena.
        const exp: Expected = baseline.get(ent.path) orelse .{ .runner_error = false, .failures = 0 };

        const bytes = ent.dir.readFileAlloc(io, ent.basename, a, .limited(64 << 20)) catch |e| {
            try out.print("  ! {s}: read failed ({s})\n", .{ ent.path, @errorName(e) });
            bad_files += 1;
            regressions += 1; // an unreadable file is never an acceptable baseline
            continue;
        };
        var digest: [32]u8 = undefined;
        std.crypto.hash.sha2.Sha256.hash(bytes, &digest, .{});
        const sha = std.fmt.bytesToHex(digest, .lower);
        // One spelling of the path on every host, so a record made on Windows compares on POSIX.
        const rel_path = try arena.dupe(u8, ent.path);
        std.mem.replaceScalar(u8, rel_path, '\\', '/');

        // `ent.path` is walk-relative (`proposals/threads/imports.wast`), which is exactly the
        // granularity the era policy keys on — see `wast.featuresForPath`.
        const s = wazmrt.wast.runScript(a, bytes, ent.path) catch |e| {
            try results.append(arena, .{ .path = rel_path, .sha = sha, .passed = 0, .failed = 0, .skipped = 0, .runner_error = true });
            try observed.append(arena, .{ .path = try arena.dupe(u8, ent.path), .runner_error = true, .failures = 0 });
            bad_files += 1;
            if (exp.runner_error) {
                try out.print("  ~ {s}: runner error ({s}) — known, in baseline\n", .{ ent.path, @errorName(e) });
            } else {
                try out.print("  ! {s}: runner error ({s}) — NOT in baseline\n", .{ ent.path, @errorName(e) });
                regressions += 1;
            }
            continue;
        };
        total_pass += s.passed;
        total_fail += s.failed;
        total_skip += s.skipped;
        try results.append(arena, .{ .path = rel_path, .sha = sha, .passed = s.passed, .failed = s.failed, .skipped = s.skipped, .runner_error = false });
        if (s.failed != 0 or exp.failures != 0 or exp.runner_error)
            try observed.append(arena, .{ .path = try arena.dupe(u8, ent.path), .runner_error = false, .failures = s.failed });

        if (s.failed > exp.failures or (exp.runner_error and s.failed != 0)) {
            bad_files += 1;
            regressions += 1;
            try out.print("  FAIL {s}: {d} passed, {d} failed (baseline {d}), {d} skipped", .{ ent.path, s.passed, s.failed, exp.failures, s.skipped });
            if (s.first_failure) |ff| try out.print(" — first: {s}", .{ff});
            try out.print("\n", .{});
            // `-Dfailures=N` lists up to N per file instead of just the first.
            // Triage by first-failure text alone mislabelled three of the five
            // items on the 2026-08-11 fix list: that text names a symptom, and
            // the failures behind it are what identify the cause.
            if (show_failures > 1) for (s.failures.items, 0..) |f, i| {
                if (i + 1 > show_failures) {
                    try out.print("      ... and {d} more\n", .{s.failed - i});
                    break;
                }
                try out.print("      [{d}] {s}\n", .{ i + 1, f });
            };
        } else if (s.failed < exp.failures or (exp.runner_error and s.failed == 0)) {
            improvements += 1;
            try out.print("  improved {s}: {d} failed (baseline {d}) — update the baseline\n", .{ ent.path, s.failed, exp.failures });
        } else if (s.failed != 0) {
            try out.print("  ~ {s}: {d} failed — known, in baseline\n", .{ ent.path, s.failed });
        }
    }

    try out.print(
        "\nconformance: {d} files — {d} passed, {d} failed, {d} skipped ({d} file(s) with failures/errors)\n",
        .{ files, total_pass, total_fail, total_skip, bad_files },
    );

    // ---- S2: record, or compare against, the RELEASE's per-file results ---------------------------
    std.mem.sort(Result, results.items, {}, struct {
        fn lt(_: void, x: Result, y: Result) bool {
            return std.mem.order(u8, x.path, y.path) == .lt;
        }
    }.lt);
    var list_hasher = std.crypto.hash.sha2.Sha256.init(.{});
    for (results.items) |r| {
        list_hasher.update(r.path);
        list_hasher.update(" ");
        list_hasher.update(&r.sha);
        list_hasher.update("\n");
    }
    var list_digest: [32]u8 = undefined;
    list_hasher.final(&list_digest);
    const list_sha = std.fmt.bytesToHex(list_digest, .lower);
    var since_release: usize = 0;

    if (record_released) {
        if (released_path.len == 0) {
            try out.print("conformance: -Drecord-released needs -Dreleased=<file>\n", .{});
            return error.NoReleasedPath;
        }
        // 🔒 A release recorded WITH failures would make them the standard the next release is
        // held to. Fix or baseline them first; the record is of a clean release.
        if (total_fail != 0 or bad_files != 0) {
            try out.print("conformance: refusing to record a release with {d} failure(s) in {d} file(s)\n", .{ total_fail, bad_files });
            return error.ReleaseHasFailures;
        }
        var buf: std.ArrayList(u8) = .empty;
        try buf.print(arena,
            \\# wazmrt spec-conformance results of a RELEASE — S2 of H6's rule 3 (`cmem/releasing.md`).
            \\# GENERATED by `zig build conformance -Dtestsuite=<dir> -Dreleased=<this file> -Drecord-released=true`
            \\# after the release commit, in its own commit. Never edited by hand.
            \\# One line per file: <sha256 of its bytes> <passed> <failed> <skipped> <path>; `error` for a runner error.
            \\# released-as: {s}
            \\# corpus: {d} files, list sha256 {s}
            \\
        , .{ wazmrt.version, results.items.len, list_sha });
        for (results.items) |r| {
            if (r.runner_error) {
                try buf.print(arena, "{s} error 0 0 {s}\n", .{ &r.sha, r.path });
            } else try buf.print(arena, "{s} {d} {d} {d} {s}\n", .{ &r.sha, r.passed, r.failed, r.skipped, r.path });
        }
        Io.Dir.cwd().writeFile(io, .{ .sub_path = released_path, .data = buf.items }) catch |e| {
            try out.print("conformance: cannot write '{s}': {s}\n", .{ released_path, @errorName(e) });
            return error.CannotWriteReleased;
        };
        try out.print("conformance: recorded {d} files as released-as {s} in '{s}' — commit it on its own\n", .{ results.items.len, wazmrt.version, released_path });
    } else if (released_path.len != 0) {
        // 🔒 Named but absent is a FAILURE: a comparison that compares nothing is not a gate.
        const text = Io.Dir.cwd().readFileAlloc(io, released_path, arena, .limited(16 << 20)) catch |e| {
            try out.print("conformance: cannot read the released results '{s}': {s}\n", .{ released_path, @errorName(e) });
            return error.CannotReadReleased;
        };
        const Rel = struct { sha: []const u8, passed: usize, failed: usize, skipped: usize, runner_error: bool };
        var rel: std.StringHashMapUnmanaged(Rel) = .empty;
        var released_as: []const u8 = "?";
        var it = std.mem.splitScalar(u8, text, '\n');
        while (it.next()) |raw| {
            const line = std.mem.trimEnd(u8, raw, "\r");
            if (line.len == 0) continue;
            if (line[0] == '#') {
                if (std.mem.startsWith(u8, line, "# released-as: ")) released_as = line["# released-as: ".len..];
                continue;
            }
            var f = std.mem.tokenizeScalar(u8, line, ' ');
            const sha = f.next() orelse return error.MalformedReleased;
            const p = f.next() orelse return error.MalformedReleased;
            const fl = f.next() orelse return error.MalformedReleased;
            const sk = f.next() orelse return error.MalformedReleased;
            const path = f.rest();
            const is_err = std.mem.eql(u8, p, "error");
            try rel.put(arena, path, .{
                .sha = sha,
                .passed = if (is_err) 0 else try std.fmt.parseInt(usize, p, 10),
                .failed = try std.fmt.parseInt(usize, fl, 10),
                .skipped = try std.fmt.parseInt(usize, sk, 10),
                .runner_error = is_err,
            });
        }
        var compared: usize = 0;
        var moved: usize = 0;
        var added: usize = 0;
        var seen: usize = 0;
        for (results.items) |r| {
            const want = rel.get(r.path) orelse {
                added += 1;
                continue;
            };
            seen += 1;
            if (!std.mem.eql(u8, want.sha, &r.sha)) {
                moved += 1;
                continue;
            }
            compared += 1;
            const worse = (r.runner_error and !want.runner_error) or r.passed < want.passed or r.failed > want.failed or r.skipped > want.skipped;
            if (worse) {
                since_release += 1;
                try out.print("  S2 REGRESSION since {s}: {s}: passed {d} → {d}, failed {d} → {d}, skipped {d} → {d}{s}\n", .{ released_as, r.path, want.passed, r.passed, want.failed, r.failed, want.skipped, r.skipped, if (r.runner_error) " (runner error)" else "" });
            }
        }
        const gone = rel.count() - seen;
        try out.print("conformance: S2 vs release {s}: {d} file(s) compared, {d} regressed", .{ released_as, compared, since_release });
        if (moved + added + gone != 0) try out.print("; the corpus MOVED — {d} changed, {d} new, {d} gone (compared on the unchanged files only)", .{ moved, added, gone });
        try out.print("\n", .{});
        if (compared == 0) {
            try out.print("conformance: S2 compared NOTHING — no file's bytes match the release's; re-record against this corpus deliberately\n", .{});
            return error.ReleasedComparedNothing;
        }
    }

    if (write_baseline) {
        // Emit a baseline capturing exactly today's results, so adopting one is
        // a single command rather than hand-transcribing failure counts.
        var buf: std.ArrayList(u8) = .empty;
        try buf.appendSlice(arena,
            \\# wazmrt conformance baseline — EXPECTED failures per .wast file.
            \\# Generated by `zig build conformance -Dtestsuite=<dir> -Dwrite-baseline=true`.
            \\# The step fails only when a file does WORSE than its line here, so this
            \\# gates against regressions rather than against a zero that upstream has
            \\# never reached. A file that improves is reported, not failed — re-generate
            \\# to lock the improvement in. `error <path>` = the runner cannot parse it.
            \\
        );
        for (observed.items) |o| {
            if (o.runner_error) {
                try buf.appendSlice(arena, "error ");
                try buf.appendSlice(arena, o.path);
            } else {
                try buf.print(arena, "{d} {s}", .{ o.failures, o.path });
            }
            try buf.append(arena, '\n');
        }
        Io.Dir.cwd().writeFile(io, .{ .sub_path = baseline_path, .data = buf.items }) catch |e| {
            try out.print("conformance: cannot write baseline '{s}': {s}\n", .{ baseline_path, @errorName(e) });
            return error.CannotWriteBaseline;
        };
        try out.print("conformance: wrote baseline '{s}' ({d} entries)\n", .{ baseline_path, observed.items.len });
        try out.flush();
        return;
    }

    if (baseline_path.len == 0) {
        // No baseline: the only sound verdict is the strict one. Say so, because
        // upstream will not pass it and a silent forever-red step teaches people
        // to ignore it.
        if (total_fail != 0 or bad_files != 0) {
            try out.print(
                "conformance: no baseline given, so this gates on ZERO failures. " ++
                    "Upstream has known failures here — generate a baseline with " ++
                    "-Dbaseline=<file> -Dwrite-baseline=true, then pass -Dbaseline=<file> to gate on regressions.\n",
                .{},
            );
            try out.flush();
            return error.ConformanceFailed;
        }
    } else {
        try out.print("conformance: {d} regression(s), {d} improvement(s) vs baseline '{s}'\n", .{ regressions, improvements, baseline_path });
        try out.flush();
        if (regressions != 0) return error.ConformanceRegressed;
    }
    // S2's verdict comes after the baseline's, so a run reports both; either one is a failure.
    if (since_release != 0) {
        try out.print("conformance: {d} file(s) regressed SINCE THE RELEASE (S2). Resolve before S3: fix them, or, when the change is INTENDED, re-record deliberately with the major it demands\n", .{since_release});
        try out.flush();
        return error.RegressedSinceRelease;
    }
    try out.flush();
}
