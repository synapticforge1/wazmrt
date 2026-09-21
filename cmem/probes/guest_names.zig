//! WASI guest probe: open a fixed list of names in preopen fd 3 and report what
//! came back — the errno, or the first bytes of the file that was ACTUALLY opened.
//! Pairs with fixtures whose contents name the file, so a mis-resolution shows up
//! as the wrong content rather than as a silent success.
//!
//!   zig build-exe guest_names.zig -target wasm32-wasi -O ReleaseSmall -femit-bin=guest_names.wasm

const std = @import("std");
const w = std.os.wasi;

const dir_fd: w.fd_t = 3;
const rights_all: w.rights_t = @bitCast(@as(u64, (1 << 29) - 1));

fn puts(s: []const u8) void {
    var iov = w.ciovec_t{ .base = s.ptr, .len = s.len };
    var nw: usize = 0;
    _ = w.fd_write(1, @ptrCast(&iov), 1, &nw);
}

const names = [_][]const u8{
    "plain.txt", // control
    "a:b", // legal on POSIX; the resolver refuses any component with ':'
    "x\\y", // legal on POSIX as ONE name; the resolver splits it into x / y
    "x/y", // the file x\y would be mistaken for
    "c:", // `path[1] == ':'` → treated as a drive-qualified absolute path
    "link-to-backslash", // symlink → "x\y": the follow path splits targets too
    "link-to-colon", // symlink → "a:b"
    // Escape attempts — the fix must not loosen confinement.
    "../../../../etc/passwd", // must be NOTCAPABLE on every host
    "..\\..\\..\\..\\etc\\passwd", // POSIX: ONE odd filename → must be NOENT, never /etc/passwd
};

pub fn main(init: std.process.Init) !void {
    _ = init;
    for (names) |n| {
        puts(n);
        puts("\t");
        var fd: w.fd_t = -1;
        // SYMLINK_FOLLOW: without it a symlink as the final component is ELOOP by
        // design (O_NOFOLLOW semantics), which would hide the follow path entirely.
        const rc = w.path_open(dir_fd, .{ .SYMLINK_FOLLOW = true }, n.ptr, n.len, .{}, rights_all, rights_all, .{}, &fd);
        if (rc != .SUCCESS) {
            puts("errno ");
            puts(@tagName(rc));
            puts("\n");
            continue;
        }
        var buf: [64]u8 = undefined;
        var iov = w.iovec_t{ .base = &buf, .len = buf.len };
        var nr: usize = 0;
        _ = w.fd_read(fd, @ptrCast(&iov), 1, &nr);
        _ = w.fd_close(fd);
        puts("opened, content=");
        puts(std.mem.trimEnd(u8, buf[0..nr], "\n"));
        puts("\n");
    }
}
