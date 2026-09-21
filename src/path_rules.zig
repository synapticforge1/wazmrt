//! path_rules.zig — which bytes are path SYNTAX on which host. One definition, used by the CLI's
//! `--dir` parser (`main.zig`) and by the WASI sandbox resolver (`wasi.zig`).
//!
//! 🐧 **Why this file exists (2026-09-21, the first native Linux run).** Both places had applied
//! Windows path rules on every platform: `\` as a separator and a `:` at index 1 as a drive. On
//! POSIX both are **ordinary filename bytes**, and the result was not a refusal but a **silent wrong
//! file** — a guest opening the one legal file `x\y` got `x/y`, and a symlink to `a:b` opened `b`.
//! 🎓 *None of it was visible from Windows, and the unit suite could not even compile on Linux until
//! the same day, so the only evidence that POSIX worked was a clean cross-compile of the exe — which
//! compiles no tests.*
//!
//! The rules are a VALUE, not a read of `builtin` at each use site, so **every POSIX row is under
//! unit test on a Windows host** and every Windows row on a POSIX one.

const builtin = @import("builtin");

pub const PathRules = enum {
    windows,
    posix,

    /// The rules of the host this binary runs on.
    pub const native: PathRules = if (builtin.os.tag == .windows) .windows else .posix;

    /// The separator set, for `std.mem.splitAny`.
    pub fn separators(r: PathRules) []const u8 {
        return switch (r) {
            .windows => "/\\",
            .posix => "/",
        };
    }

    pub fn isSep(r: PathRules, c: u8) bool {
        return c == '/' or (r == .windows and c == '\\');
    }

    /// `<letter>:` at the start — a drive on Windows. Never one on POSIX, where `a:b` is a name.
    pub fn hasDrivePrefix(r: PathRules, p: []const u8) bool {
        return r == .windows and p.len >= 2 and p[1] == ':';
    }
};

test "separators and drives are Windows-only" {
    const std = @import("std");
    try std.testing.expect(PathRules.windows.isSep('\\'));
    try std.testing.expect(!PathRules.posix.isSep('\\'));
    try std.testing.expect(PathRules.posix.isSep('/'));
    try std.testing.expect(PathRules.windows.hasDrivePrefix("C:\\x"));
    try std.testing.expect(!PathRules.posix.hasDrivePrefix("a:b"));
}
