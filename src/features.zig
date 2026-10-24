//! features.zig — per-proposal gating.
//!
//! A module that uses a DISABLED proposal is **invalid**: it is refused wholly, before execution,
//! rather than trapping part-way through. That is the only useful meaning for the switch, because
//! an embedder disables a proposal to say "I will not run guests that need this", and a check that
//! fires mid-execution has already run some of the guest.
//!
//! **Everything is enabled by default.** Restricting is opt-in, so the default path costs nothing:
//! `Set.all()` short-circuits the whole pass (see `check`).
//!
//! ⚠️ **THE COVERAGE PROBLEM, AND HOW IT IS SOLVED HERE.** A gate that misses an opcode is worse
//! than no gate: it reads as a control while letting the thing through. The mapping below is a
//! switch with an `else` for the MVP core — so a NEW opcode would silently default to "always
//! allowed". The `comptime` assertion at the bottom of this file pins the size of the `Op` enum,
//! so adding one fails the build until someone decides which proposal it belongs to. Do not
//! "fix" that assertion by bumping the number without making that decision.

const std = @import("std");
const Module = @import("Module.zig");
const opcode = @import("opcode.zig");
const types = @import("types.zig");

/// The proposals that can be individually refused. Values match `wazmrt_feature_t` in
/// `include/wazmrt.h` — the C ABI casts straight across, so the two must not drift.
pub const Feature = enum(u8) {
    sign_extension = 0,
    saturating_float_to_int = 1,
    multi_value = 2,
    reference_types = 3,
    bulk_memory = 4,
    extended_const = 5,
    simd = 6,
    relaxed_simd = 7,
    threads = 8,
    multi_memory = 9,
    memory64 = 10,
    function_references = 11,
    gc = 12,
    exceptions = 13,
    tail_call = 14,
    /// ⚠️ **NOT a wasm proposal name — deliberately finer-grained than the spec's own grouping.**
    /// Multiple tables arrived *inside* `reference_types`, so the spec has no separate switch for
    /// them. wazmrt needs one because gating on `reference_types` would also disable `funcref`,
    /// which `proposals/threads/imports.wast` legitimately uses in the very modules whose
    /// "multiple tables" assertions we need to honour. The split exists so a snapshot can be run
    /// **at its own era**; it is not a claim that the spec factors the proposals this way.
    /// Layered on `reference_types` — see `incoherent`.
    multi_table = 15,
    /// custom-descriptors. ⚠️ **This bit exists because the proposal CHANGES THE
    /// TYPING OF AN EXISTING INSTRUCTION, not merely because it adds new ones.**
    /// Under it, `br_on_cast`'s `rt2 <: rt1` requirement is relaxed to "`rt1` and
    /// `rt2` share a top type" — so the very same module is `assert_invalid` in
    /// the core testsuite and VALID in `proposals/custom-descriptors/`. There is
    /// no single answer that satisfies both files, which is exactly the situation
    /// `wast.featuresForPath` was built for (F4, `proposals/threads`).
    ///
    /// ✅ **FULLY enforced as of Track F.** It gates the six D3/D4 INSTRUCTIONS, the
    /// `br_on_cast` typing rule, **and** the three type-level formers — `(exact $t)`,
    /// `(descriptor $d)`, `(describes $s)` — wherever they appear: composite types,
    /// struct fields, table/global types, an EXACT func import (descriptor kind
    /// `0x20`), and the exactness carried in instruction immediates.
    ///
    /// ⚠️ It was knowingly partial until then, and the reason is worth keeping: the
    /// walk only visited INSTRUCTIONS, and these formers live in the TYPE SECTION, so
    /// a module using nothing but the type syntax was accepted with the bit off. **A
    /// proposal is not gated when its instructions are gated — it is gated when
    /// everything that makes a module NEED it is.** See `firstViolation`'s type pass.
    ///
    /// Layered on `gc` — see `incoherent`.
    custom_descriptors = 16,
    /// custom-page-sizes: `(memory 1 (pagesize 1))` — a memory declares its own page size,
    /// byte-granular instead of the fixed 64 KiB.
    ///
    /// ⚠️ **This bit was MISSING until Track F, and the proposal shipped without it.**
    /// Track P landed custom-page-sizes end to end — decoder, validator, every bounds
    /// check — and added no way to refuse it, so an embedder who turned off literally
    /// every switch in this enum still accepted byte-paged memories. **A proposal that
    /// ships without a bit here is not "enabled by default"; it is unrefusable**, and the
    /// only thing that would have caught it is the habit of grepping for the gate as part
    /// of landing the feature.
    ///
    /// Layered on nothing — it extends core memories, so it stands alone in `incoherent`.
    custom_page_sizes = 17,
    /// wide-arithmetic: `i64.add128`, `i64.sub128`, `i64.mul_wide_s`, `i64.mul_wide_u` —
    /// 128-bit add/sub and 64×64→128 multiply.
    ///
    /// ⚠️ **Layered on `multi_value`, and that is not a wazmrt invention.** Every one of the
    /// four returns TWO i64 results, so a module using any of them is a multi-value module by
    /// construction; enabling this while refusing multi-value describes nothing. See
    /// `incoherent`.
    wide_arithmetic = 18,

    // 🔬 **19–24 added 2026-09-21 (owner: support every wat/wasm feature name wasm-tools
    // accepts, and MATCH its semantics).** Each rule below was MEASURED against wasm-tools 1.259
    // (`cmem/probes/feature-matrix.ts`), not read off a spec: one minimal module per feature,
    // validated under every preset and every single name.

    /// mutable-global: importing or EXPORTING a mutable global. In `wasm1`, NOT in `mvp` —
    /// wasm-tools' own `--help` says the two select the same thing, and measured they do not.
    mutable_global = 19,
    /// floats: every `f32`/`f64` value type and every instruction whose name carries one,
    /// SIMD float lanes included (`f32x4.add` is refused with this off; `i32x4.add` is not).
    /// On in every preset from `mvp` up; only `-all` turns it off.
    floats = 20,
    /// bulk-memory-opt: `memory.copy` and `memory.fill` — the part of bulk memory `lime1` keeps.
    /// ⚠️ **A separate BIT, not an implication**: measured, `memory.copy` is refused under
    /// `all,-bulk-memory-opt` even with bulk-memory on. The NAME `bulk-memory` switches both
    /// bits (see `main.zig`'s spelling map); the check asks this one.
    bulk_memory_opt = 21,
    /// call-indirect-overlong: a `call_indirect` table index encoded in more bytes than its
    /// value needs (`opcode.CallIndirect.table_overlong`). The NAME `reference-types` switches
    /// this bit with its own, in both directions.
    call_indirect_overlong = 22,
    /// gc-types: every abstract reference type EXCEPT `func` and `exn` — `externref` included,
    /// which is why `reference-types` alone does not admit an `externref` — plus the struct and
    /// array composite types. Measured one type at a time.
    gc_types = 23,
    /// legacy-exceptions: `try`/`catch`/`catch_all`/`rethrow`/`delegate`. Needs `exceptions` AS
    /// WELL — measured, legacy `try` is refused under `all,-exceptions` with this on. Not in
    /// `wasm3`, and not in any preset.
    legacy_exceptions = 24,

    pub fn name(self: Feature) []const u8 {
        return @tagName(self);
    }
};

pub const count = @typeInfo(Feature).@"enum".fields.len;

/// Which proposals a module may use. All-on is the default and the fast path.
pub const Set = struct {
    bits: [count]bool = [_]bool{true} ** count,

    pub fn has(self: Set, f: Feature) bool {
        return self.bits[@intFromEnum(f)];
    }

    pub fn set(self: *Set, f: Feature, on: bool) void {
        self.bits[@intFromEnum(f)] = on;
    }

    /// True when nothing is restricted — the common case, and the one that skips the pass.
    pub fn all(self: Set) bool {
        for (self.bits) |b| if (!b) return false;
        return true;
    }

    /// Was: "a proposal layered on another cannot be enabled alone — reported, not repaired".
    ///
    /// 🔒 **Since 2026-09-21 NO set is incoherent, and the protection this gave now lives in the
    /// MODULE checks** (owner: match wasm-tools). Measured, wasm-tools never refuses a feature
    /// CONFIGURATION — `-all,relaxed-simd`, `all,-gc`, `-all,exceptions` are all accepted there —
    /// and refuses only MODULES that need something missing. The rule existed so a dependency
    /// was never silently enabled; that property holds as long as every module-level check
    /// requires everything the construct depends on, which `firstViolation` now does: a relaxed
    /// op's v128 operands need `simd`, a typed reference needs `reference_types`, several tables
    /// need `reference_types`, a descriptor needs its struct type's `gc`. Nothing is repaired and
    /// nothing is admitted that a missing layer should refuse — the refusal just moved from the
    /// config to the module, where wasm-tools puts it. Kept as a function (always null) because
    /// the C ABI and the CLI still ask; a pair returned here would be a regression to check.
    pub fn incoherent(self: Set) ?[2]Feature {
        _ = self;
        return null;
    }
};

pub const Error = error{DisabledProposal};

/// The proposal an instruction belongs to, or null for the WebAssembly 1.0 core.
///
/// ⚠️ Relaxed SIMD shares the `.simd` tag — the distinction is the `0xFD` sub-opcode, so it is
/// resolved by `instrFeature` rather than here.
fn opFeature(op: opcode.Op) ?Feature {
    return switch (op) {
        // Sign-extension operators.
        .i32_extend8_s, .i32_extend16_s, .i64_extend8_s, .i64_extend16_s, .i64_extend32_s => .sign_extension,

        // Non-trapping float→int truncation.
        .i32_trunc_sat_f32_s, .i32_trunc_sat_f32_u, .i32_trunc_sat_f64_s, .i32_trunc_sat_f64_u,
        .i64_trunc_sat_f32_s, .i64_trunc_sat_f32_u, .i64_trunc_sat_f64_s, .i64_trunc_sat_f64_u,
        => .saturating_float_to_int,

        // Bulk memory. `table.init`/`table.copy` + the drops belong to this proposal too.
        .memory_init, .data_drop, .table_init, .elem_drop, .table_copy => .bulk_memory,
        // …except the two `lime1` keeps, which wasm-tools gates on their own bit (see
        // `Feature.bulk_memory_opt`: the NAME bulk-memory sets both, the check asks this one).
        .memory_copy, .memory_fill => .bulk_memory_opt,

        // Reference types: the ref values themselves, typed select, and table get/set/grow/size/fill.
        .ref_null, .ref_is_null, .ref_func, .select_t, .table_get, .table_set, .table_grow, .table_size, .table_fill => .reference_types,

        // Typed function references.
        .call_ref, .return_call_ref, .ref_as_non_null, .br_on_null, .br_on_non_null => .function_references,

        // Tail calls. `return_call_ref` above belongs to function-references, not
        // here — it arrived with that proposal and is gated with its siblings.
        .return_call, .return_call_indirect => .tail_call,

        // WasmGC: i31, struct, array, equality and the casts.
        .ref_eq, .ref_i31, .i31_get_s, .i31_get_u,
        .struct_new, .struct_new_default, .struct_get, .struct_get_s, .struct_get_u, .struct_set,
        .array_new, .array_new_default, .array_new_fixed, .array_get, .array_get_s, .array_get_u,
        .array_set, .array_len,
        .array_new_data, .array_new_elem, .array_fill, .array_copy, .array_init_data, .array_init_elem,
        .extern_convert_any, .any_convert_extern,
        .ref_test, .ref_cast, .br_on_cast, .br_on_cast_fail,
        => .gc,

        // custom-descriptors (Tracks D3/D4). ⚠️ D3 filed these under `.gc` because
        // no `custom_descriptors` bit existed; D4 had to add one anyway — the
        // proposal RETYPES `br_on_cast`, and a typing rule cannot be filed under
        // the proposal it modifies. Now that the bit exists, the instructions
        // belong to it: "requires GC" was the closest true statement available,
        // not the accurate one.
        .struct_new_desc, .struct_new_default_desc, .ref_get_desc,
        .ref_cast_desc_eq, .br_on_cast_desc_eq, .br_on_cast_desc_eq_fail,
        => .custom_descriptors,

        // Exception handling, both encodings.
        .throw, .throw_ref, .try_table, .try_, .catch_, .catch_all, .rethrow, .delegate => .exceptions,

        // Wide arithmetic.
        .i64_add128, .i64_sub128, .i64_mul_wide_s, .i64_mul_wide_u => .wide_arithmetic,

        .simd => .simd, // relaxed vs not is decided by the sub-opcode
        .atomic => .threads,

        // WebAssembly 1.0 core. See the comptime assertion below: this `else` is why adding an
        // opcode must be a deliberate decision rather than a silent default.
        else => null,
    };
}

/// The lowest `0xFD` sub-opcode belonging to relaxed SIMD. Everything at or above this in the
/// SIMD space is the relaxed set; below it is fixed-width SIMD.
const first_relaxed_simd_sub: u32 = 0x100;

fn instrFeature(instr: opcode.Instr) ?Feature {
    const f = opFeature(instr.op) orelse return null;
    if (f == .simd and instr.imm == .simd and instr.imm.simd.sub >= first_relaxed_simd_sub) return .relaxed_simd;
    return f;
}

/// The `0xFD` sub-opcodes that operate on `f32x4`/`f64x2` lanes or convert to/from them — the
/// SIMD half of `floats`. **Pinned against the assembler's own mnemonic table** by a test in
/// `wat.zig` ("every SIMD mnemonic naming f32/f64 is in features.simd_float_subs, and nothing
/// else is"): this file cannot import the assembler (`-Dwat=false` builds leave it out), so the
/// list is numbers here and the NAMES are checked there. Sorted, for `std.sort.binarySearch`.
pub const simd_float_subs = [_]u32{
    0x13, 0x14, // f32x4.splat, f64x2.splat
    0x1f, 0x20, 0x21, 0x22, // f32x4/f64x2 extract_lane, replace_lane
    0x41, 0x42, 0x43, 0x44, 0x45, 0x46, // f32x4 eq ne lt gt le ge
    0x47, 0x48, 0x49, 0x4a, 0x4b, 0x4c, // f64x2 eq ne lt gt le ge
    0x5e, 0x5f, // f32x4.demote_f64x2_zero, f64x2.promote_low_f32x4
    0x67, 0x68, 0x69, 0x6a, // f32x4 ceil floor trunc nearest
    0x74, 0x75, 0x7a, // f64x2 ceil floor trunc
    0x94, // f64x2.nearest
    0xe0, 0xe1, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xeb, // f32x4 abs neg sqrt add sub mul div min max pmin pmax
    0xec, 0xed, 0xef, 0xf0, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, // f64x2 the same
    0xf8, 0xf9, 0xfa, 0xfb, // i32x4.trunc_sat_f32x4_s/u, f32x4.convert_i32x4_s/u
    0xfc, 0xfd, 0xfe, 0xff, // i32x4.trunc_sat_f64x2_s/u_zero, f64x2.convert_low_i32x4_s/u
    // ⚠️ **NO relaxed-SIMD sub-opcode (≥ 0x100) is here, and that is measured, not an
    // oversight**: wasm-tools admits `f32x4.relaxed_madd`, `i32x4.relaxed_trunc_f32x4_s` and
    // `f64x2.relaxed_min` under `all,-floats` while refusing `f32x4.add` and `f32x4.splat`. The
    // pinning test in `wat.zig` excludes the relaxed range for the same reason.
};

fn simdSubIsFloat(sub: u32) bool {
    return std.sort.binarySearch(u32, &simd_float_subs, sub, struct {
        fn order(k: u32, x: u32) std.math.Order {
            return std.math.order(k, x);
        }
    }.order) != null;
}

/// Does this (non-SIMD) opcode carry a float? **Decided by the opcode's NAME**, so a float opcode
/// added later is classified without anyone remembering to: `f32.add`, `i32.trunc_f64_s`,
/// `f64.promote_f32`, `i32.reinterpret_f32`, `f32.load` all contain `f32` or `f64`, and no other
/// opcode does. (`@tagName` spells them with `_`; the substring test does not care.)
fn opIsFloat(op: opcode.Op) bool {
    // 📐 **Decided at COMPILE time, and stored as a plain bitmap indexed by the opcode's VALUE.**
    // Measured with the size gate (2026-09-21), stubbing this function out each time:
    //   `@tagName(op)` + a substring search at run time  ~ +5 KiB exe, +10 KiB lib
    //   a comptime `std.EnumSet(Op)`                      ~ +8 KiB in every artifact
    // Both shipped machinery the question does not need. The rule is unchanged — the opcode's
    // NAME carries `f32`/`f64` — but it runs in the compiler, and the binary holds one bit per
    // opcode value. The `@compileError` keeps a future out-of-range opcode value from quietly
    // turning this into a large table.
    const float_bits = comptime blk: {
        @setEvalBranchQuota(100_000);
        var max: usize = 0;
        for (@typeInfo(opcode.Op).@"enum".fields) |f| max = @max(max, f.value);
        if (max >= 1024) @compileError("opcode.Op values reach past 1024; features.opIsFloat's bitmap would stop being small");
        var bits = std.StaticBitSet(1024).initEmpty();
        for (@typeInfo(opcode.Op).@"enum".fields) |f| {
            if (std.mem.indexOf(u8, f.name, "f32") != null or std.mem.indexOf(u8, f.name, "f64") != null)
                bits.set(f.value);
        }
        break :blk bits;
    };
    return float_bits.isSet(@intFromEnum(op));
}

/// Every proposal ONE instruction needs, in layering order (the proposal first, then what it
/// is layered on or combined with), so the first missing one reported is the most specific.
/// ⚠️ **Up to four, not one**, since 2026-09-21: wasm-tools gates a legacy `try` on `exceptions`
/// AND `legacy-exceptions`, a float conversion on its proposal AND `floats`, and an overlong
/// `call_indirect` on its own bit — none of which a single `?Feature` could say.
const Needs = struct {
    buf: [4]Feature = undefined,
    n: usize = 0,
    fn add(self: *Needs, f: Feature) void {
        self.buf[self.n] = f;
        self.n += 1;
    }
    fn slice(self: *const Needs) []const Feature {
        return self.buf[0..self.n];
    }
};

fn instrNeeds(instr: opcode.Instr) Needs {
    var req: Needs = .{};
    if (instrFeature(instr)) |f| req.add(f);
    switch (instr.op) {
        .try_, .catch_, .catch_all, .rethrow, .delegate => req.add(.legacy_exceptions),
        .call_indirect, .return_call_indirect => if (instr.imm == .call_indirect and instr.imm.call_indirect.table_overlong)
            req.add(.call_indirect_overlong),
        else => {},
    }
    const float = if (instr.op == .simd and instr.imm == .simd) simdSubIsFloat(instr.imm.simd.sub) else opIsFloat(instr.op);
    if (float) req.add(.floats);
    return req;
}

/// Every proposal a value type needs. Catches a module that never executes a gated instruction
/// but still *declares* a gated type — a `v128` parameter, an `f32` local, an `externref` global.
///
/// 🔬 **Measured one type at a time against wasm-tools (2026-09-21)**: `gc-types` is needed by
/// every abstract reference type EXCEPT `func` and `exn` — `externref`, `nullfuncref` and
/// `(ref extern)` included — and NOT by `funcref`, `exnref` or `(ref func)`.
fn valTypeNeeds(vt: types.ValType) Needs {
    var req: Needs = .{};
    // A concrete `(ref $t)`: typed references. A struct/array `$t` needs gc + gc-types through its
    // own TYPE DEFINITION (the composite-type pass), so the reference itself asks only this —
    // which `require` also grants to `gc` (measured: gc admits `(ref $t)` with
    // function-references off).
    // 🔬 Typed references ALSO need reference-types: measured, `-all,function-references` alone
    // refuses `(param (ref $t))`, and so does `-all,gc`; `reference-types` + either admits it.
    if (vt.isConcrete()) {
        req.add(.reference_types);
        req.add(.function_references);
        return req;
    }
    switch (vt) {
        .i32, .i64 => {},
        .f32, .f64 => req.add(.floats),
        .v128 => req.add(.simd),
        .funcref => req.add(.reference_types),
        .externref => {
            req.add(.reference_types);
            req.add(.gc_types);
        },
        .funcref_nn => {
            req.add(.reference_types);
            req.add(.function_references);
        },
        .externref_nn => {
            req.add(.reference_types);
            req.add(.function_references);
            req.add(.gc_types);
        },
        .exnref, .nullexnref => req.add(.exceptions),
        .exnref_nn => {
            req.add(.exceptions);
            req.add(.reference_types);
            req.add(.function_references);
        },
        // The `any` hierarchy, its bottoms, the other bottoms, and their non-null forms: GC types.
        else => {
            req.add(.gc);
            req.add(.gc_types);
        },
    }
    return req;
}

fn require(fs: Set, f: ?Feature, found: *?Feature) Error!void {
    const need = f orelse return;
    if (fs.has(need)) return;
    // 🔬 The one either/or rule, measured: gc SATISFIES the typed-reference check. wasm-tools
    // admits `(param (ref $t))` under `all,-function-references` while gc is on.
    if (need == .function_references and fs.has(.gc)) return;
    found.* = need;
    return error.DisabledProposal;
}

fn requireEach(fs: Set, req: Needs, found: *?Feature) Error!void {
    for (req.slice()) |f| try require(fs, f, found);
}

/// Every proposal one value type needs — its FAMILY first, then the custom-descriptors
/// `exact` former layered on top.
///
/// 🔑 **Two requirements, in layering order, and the order is the whole point.** A
/// `(ref (exact $t))` needs GC *and* custom-descriptors; reporting whichever happens to be
/// checked first would tell an embedder who disabled GC that they are missing
/// custom-descriptors. `valTypeNeeds` alone could not say this — exactness is a BIT on the
/// value type, not a member of its family, so it has no place in a switch over the families.
fn requireValType(fs: Set, vt: types.ValType, found: *?Feature) Error!void {
    try requireEach(fs, valTypeNeeds(vt), found);
    if (vt.isExact()) try require(fs, .custom_descriptors, found);
}

/// `requireValType` for a struct field / array element. Packed fields (`i8`/`i16`) are GC's
/// own storage types and carry no value type to inspect; the enclosing composite already
/// required `.gc`.
fn requireStorage(fs: Set, st: Module.StorageType, found: *?Feature) Error!void {
    switch (st) {
        .val => |v| try requireValType(fs, v, found),
        .i8, .i16 => {},
    }
}

/// The custom-descriptors exactness carried inside an INSTRUCTION immediate.
///
/// ⚠️ **The instructions themselves are not the whole of it.** `ref.cast`, `br_on_cast` and
/// `ref.null` all exist without custom-descriptors and are gated as `.gc` / `.reference_types`;
/// what the proposal adds is an `exact` prefix on the heap type they carry. A gate that only
/// asked "is this opcode allowed" would let `ref.cast (ref (exact $t))` through with the bit
/// off — refusing the *opcodes* a proposal adds is not the same as refusing the proposal.
fn immIsExact(imm: opcode.Imm) bool {
    return switch (imm) {
        .ref_type, .ref_cast => |rt| rt.exact,
        .br_cast => |bc| bc.src.exact or bc.dst.exact,
        .block_type => |bt| switch (bt) {
            .ref => |rt| rt.exact,
            .value => |v| v.isExact(),
            .empty, .type_index => false,
        },
        // Only the MULTI-BYTE arm can carry `exact`: a single-byte valtype names an abstract
        // head or a number, and there is no concrete type for "exactly this" to bind to.
        .select_types => |ts| blk: {
            for (ts) |t| if (t == .ref and t.ref.exact) break :blk true;
            break :blk false;
        },
        else => false,
    };
}

/// The proposal a module needs but was not granted, or null if it is within its budget.
///
/// Returns the offending feature rather than just failing, so the caller can name it — "this
/// module uses gc" is actionable; "invalid module" is not.
/// Decode one constant expression and require every proposal its instructions belong to.
///
/// Sets `found` rather than returning it, so the caller keeps `firstViolation`'s "first one wins"
/// ordering. A const-expr that will not decode is left to the validator, exactly as a malformed
/// function body is — this pass reports RESTRICTIONS, never malformations.
fn requireConstExprFeatures(gpa: std.mem.Allocator, fs: Set, expr: []const u8, found: *?Feature) !void {
    if (expr.len == 0) return; // passive segment: no offset
    const instrs = opcode.decodeBody(gpa, expr) catch return;
    defer opcode.freeBody(gpa, instrs);
    for (instrs) |instr| {
        // 🔑 **`extended_const` is CONTEXTUAL, which is why the ordinary opcode→proposal map
        // cannot see it.** `i32.add` is core WebAssembly 1.0 in a function body; the proposal is
        // that it may appear in a CONSTANT EXPRESSION at all. So `instrFeature` correctly returns
        // null for it everywhere, and a walk that only asks `instrFeature` — which is what the
        // body loop does — could never produce this bit no matter where it walked.
        //
        // The six are the validator's own list (`validate.zig`, the `0x6a 0x6b 0x6c` / `0x7c 0x7d
        // 0x7e` arms of the const-expr switch), matched on the DECODED op rather than the raw
        // byte: an `i32.const` immediate is LEB bytes and can contain 0x6a.
        switch (instr.op) {
            .i32_add, .i32_sub, .i32_mul, .i64_add, .i64_sub, .i64_mul => {
                require(fs, .extended_const, found) catch return;
            },
            else => {},
        }
        // …and everything a const-expr shares with a body (GC `ref.i31`, `ref.func`, `f32.const`,
        // …) is classified the ordinary way.
        requireEach(fs, instrNeeds(instr), found) catch return;
        if (immIsExact(instr.imm)) require(fs, .custom_descriptors, found) catch return;
    }
}

// ---- The `--features` list parser (moved from `main.zig` 2026-10-23) -------------------------
// It lived in the CLI, so nothing but the CLI could judge a module the way a user's `--features`
// does. S1 of the behaviour carry-forward (`cmem/releasing.md`) needs exactly that judgement
// in-process, so the parser is the library's now and the CLI aliases it: ONE parser, two callers.
// Moved verbatim apart from the renames the new home needs; proven by the CLI's own tests and by
// `cmem/probes/feature-matrix.ts` producing byte-identical output before and after.

/// One item of a `--features` list: a proposal and whether it is being added or removed. `null`
/// for an `all` / `mvp` / `none` SEED, which replaces the whole set rather than editing it.
/// One `--features` item: a SEED (a whole starting set, first position only) or a list of BITS
/// to switch on/off. A name maps to a LIST because wasm-tools' group names switch several bits —
/// `bulk-memory` is bulk-memory + bulk-memory-opt — and a name for a proposal wazmrt does not
/// implement maps to NO bits (see `name_only_features`).
const FeatureItem = struct {
    seed: ?Set = null,
    bits: []const Feature = &.{},
    on: bool = true,
};

const Feat = Feature;

/// The presets, MEASURED from wasm-tools 1.259 (`cmem/probes/feature-matrix.ts`, "membership":
/// a name is in a preset iff the preset admits that name's module and `preset,-name` does not).
/// ⚠️ `mvp` and `wasm1` DIFFER — wasm-tools' `--help` says they select the same thing; measured,
/// only `wasm1` admits a mutable-global export.
pub fn presetSeed(name: []const u8) ?Set {
    const mvp = [_]Feat{.floats};
    const wasm1 = mvp ++ [_]Feat{.mutable_global};
    const wasm2 = wasm1 ++ [_]Feat{
        .sign_extension, .saturating_float_to_int, .multi_value,       .reference_types,
        .multi_table,    .call_indirect_overlong,  .gc_types,          .bulk_memory,
        .bulk_memory_opt, .simd,
    };
    const wasm3 = wasm2 ++ [_]Feat{
        .relaxed_simd, .threads,        .tail_call,           .multi_memory, .exceptions,
        .memory64,     .extended_const, .function_references, .gc,
    };
    const lime1 = [_]Feat{
        .mutable_global,  .floats,         .sign_extension,         .saturating_float_to_int, .multi_value,
        .bulk_memory_opt, .extended_const, .call_indirect_overlong,
    };
    const on: []const Feat= if (std.mem.eql(u8, name, "mvp") or std.mem.eql(u8, name, "none")) &mvp else if (std.mem.eql(u8, name, "wasm1")) &wasm1 else if (std.mem.eql(u8, name, "wasm2")) &wasm2 else if (std.mem.eql(u8, name, "wasm3")) &wasm3 else if (std.mem.eql(u8, name, "lime1")) &lime1 else if (std.mem.eql(u8, name, "-all")) &.{} else if (std.mem.eql(u8, name, "all")) return .{} else return null;
    var s = noFeatures();
    for (on) |f| s.set(f, true);
    return s;
}

/// wasm-tools feature names for proposals wazmrt does NOT implement — accepted, switching nothing
/// (owner, 2026-09-21: every wat/wasm name, component-model included, for the broadest
/// compatibility). ⚠️ **Honest because `--features` can only NARROW**: allowing an unimplemented
/// proposal adds nothing, and a module that uses one is refused whatever the list says; refusing
/// it is already the state. Read from `wasm-tools validate --features <unknown>`, 1.259.0.
pub const name_only_features = [_][]const u8{
    "shared_everything_threads", "stack_switching", "memory_control",   "compact_imports",
    "component_model",           "cm_values",       "cm_nested_names",  "cm_async",
    "cm_async_stackful",         "cm_more_async_builtins", "cm_threading", "cm_error_context",
    "cm_fixed_length_lists",     "cm_gc",           "cm_map",           "cm64",
    "cm_implements",             "cm_canon_names",
};

/// The BITS one name switches, or null if the name is unknown.
pub fn featureBits(name: []const u8) ?[]const Feat{
    var buf: [64]u8 = undefined;
    if (name.len > buf.len) return null;
    for (name, 0..) |c, i| buf[i] = if (c == '-') '_' else c;
    const n = buf[0..name.len];
    // 🔬 Group names, both directions (measured: `all,-bulk-memory` refuses `memory.copy`, and
    // `all,-reference-types` refuses an overlong `call_indirect`). `reference-types` also carries
    // wazmrt's own `multi_table` split: wasm-tools has no separate name, and its reference-types
    // admits several tables.
    if (std.mem.eql(u8, n, "bulk_memory") or std.mem.eql(u8, n, "bulk_memory_operations"))
        return &.{ .bulk_memory, .bulk_memory_opt };
    if (std.mem.eql(u8, n, "reference_types"))
        return &.{ .reference_types, .call_indirect_overlong, .multi_table };
    for (name_only_features) |no| if (std.mem.eql(u8, n, no)) return &.{};
    const f = featureFromSpelling(name) orelse return null;
    return switch (f) {
        inline else => |t| &[_]Feat{t},
    };
}

/// Resolve one proposal name, in **either vocabulary**.
///
/// 🤝 `interop.md` §2.2 (v20): wasmrt accepts both spellings and wazmrt accepted only its own, so
/// `--features bulk-memory-operations` was an `unknown proposal` error here while the identical
/// command line worked on the sibling. **A shared CLI whose flag VALUES are not shared is not
/// swappable**, so this is a contract row, not a nicety.
///
/// Three passes, most specific first:
///   1. this enum's own name (`bulk_memory`) — unchanged, and still what wazmrt prints;
///   2. the same name with **hyphens**;
///   3. three longer proposal-repository spellings that carry no shorter form here.
///
/// 🔎 **Pass 2 covers wasm-tools' ENTIRE vocabulary, and that was measured, not assumed.**
/// `wasm-tools validate --features <unknown>` prints its valid list, and every name in it that
/// wazmrt models is this enum's name with `_` written `-`: `bulk-memory`, `sign-extension`,
/// `saturating-float-to-int`, `exceptions`, `reference-types`, `tail-call`, `custom-page-sizes`,
/// `custom-descriptors`, `wide-arithmetic`, `function-references`, `multi-memory`, `multi-value`,
/// `extended-const`, `relaxed-simd`, `memory64`, `gc`, `simd`, `threads`.
/// ⚠️ **A first draft of this function hard-coded four "spec names" — `bulk-memory-operations`,
/// `sign-extension-ops`, `nontrapping-float-to-int-conversions`, `exception-handling` — as though
/// wasm-tools used them. It does not.** Three of the four turned out to be real anyway, as aliases
/// *wasmrt* carries, which is why they are here; but the justification was invented and one branch
/// would have been dead. 🎓 *Being right for a reason you did not check is not being right.*
///
/// Pass 3 is therefore scoped to what was **verified by running the sibling**: each name below was
/// fed to `wasmrt --features` and accepted. `mutable-global` and `tail-calls` were rejected by it
/// and are deliberately absent.
///
/// ⚠️ **An unrecognised name stays an ERROR** (see the caller). Widening the vocabulary must not
/// widen it to "anything we failed to parse": `--features mvp,sim` silently meaning `mvp` is the
/// security-control-that-drops-what-it-was-told failure this file already refuses.
pub fn featureFromSpelling(name: []const u8) ?Feature {
    if (std.meta.stringToEnum(Feature, name)) |f| return f;
    var buf: [64]u8 = undefined;
    if (name.len > buf.len) return null;
    for (name, 0..) |c, i| buf[i] = if (c == '-') '_' else c;
    const n = buf[0..name.len];
    if (std.meta.stringToEnum(Feature, n)) |f| return f;
    // Longer proposal-repository spellings, each verified accepted by wasmrt (2026-09-19).
    if (std.mem.eql(u8, n, "bulk_memory_operations")) return .bulk_memory;
    if (std.mem.eql(u8, n, "sign_extension_ops")) return .sign_extension;
    if (std.mem.eql(u8, n, "nontrapping_float_to_int_conversions")) return .saturating_float_to_int;
    if (std.mem.eql(u8, n, "exception_handling")) return .exceptions;
    return null;
}

/// Classify one already-trimmed item, or report why it is not one.
///
/// ⚠️ **An unrecognised name is an ERROR, never a skip.** Ignoring it would leave the user
/// believing they had restricted something: `--features mvp,sim` would silently be `mvp`, and
/// `--features -simd2` would silently be `all`. A security control that quietly drops what it was
/// told is worse than no control.
fn parseFeatureItem(item: []const u8, first: bool, out: *std.Io.Writer) !FeatureItem {
    if (item.len == 0) {
        try out.print("error: --features: empty item\n", .{});
        return error.BadFeatures;
    }
    // Seeds are positional — only the first item can replace the set, because "everything, then
    // nothing, then gc" is not a list anyone means. `none` stays an alias of `mvp` (both name the
    // WebAssembly 1.0 core). `-all` is checked HERE, before the sign, because it is a seed.
    if (first) if (presetSeed(item)) |s| return .{ .seed = s };

    const on = item[0] != '-';
    const name = if (item[0] == '-' or item[0] == '+') item[1..] else item;
    if (name.len == 0) {
        try out.print("error: --features: '{s}' names no proposal\n", .{item});
        return error.BadFeatures;
    }
    const bits = featureBits(name) orelse {
        try out.print("error: --features: unknown proposal '{s}'\n", .{name});
        try out.print("  presets (first item only): all, -all, mvp, wasm1, wasm2, wasm3, lime1\n  known:", .{});
        for (0..count) |i| {
            const known: Feature = @enumFromInt(@as(u8, @intCast(i)));
            try out.print(" {s}", .{known.name()});
        }
        try out.print("\n  also accepted, switching nothing (not implemented):", .{});
        for (name_only_features) |no| try out.print(" {s}", .{no});
        try out.print("\n", .{});
        return error.BadFeatures;
    };
    return .{ .bits = bits, .on = on };
}

/// Every proposal off, `floats` included — the `-all` seed. `mvp` is this plus floats.
pub fn noFeatures() Set {
    var s: Set = .{};
    for (0..count) |i| s.set(@enumFromInt(@as(u8, @intCast(i))), false);
    return s;
}

/// Parse one `--features` list onto `base`, or report why it cannot be parsed.
///
/// Grammar: comma-separated items, each a proposal name, optionally signed `+name` / `-name`.
/// Two seeds may lead the list: `all` (everything on) and `mvp` / `none` (everything off).
///
/// 🔑 **THE SEED IS EXPLICIT OR IT IS INFERRED FROM ONE UNAMBIGUOUS SHAPE, AND MIXING IS AN
/// ERROR.** `--features simd,gc` means "these and nothing else"; `--features -simd` means
/// "everything but this". Both readings are obvious in isolation and neither is obvious for
/// `--features gc,-simd`, so that spelling is refused rather than resolved by a precedence rule
/// nobody asked for — *a defaulted policy is a policy nobody reviewed*. Say `mvp,gc` or
/// `all,-simd` and the question does not arise.
///
/// ⚠️ **The names come from `@tagName`, not from a list written here.** The C ABI's copy of this
/// enum drifted from the engine's once and shipped a switch that silently did nothing; the CLI
/// would have been the FOURTH hand-written spelling of the same list. Deriving it means the build
/// cannot produce a CLI that offers a different set of proposals than it enforces.
///
/// 🔒 **TWO PASSES OVER THE STRING, AND NO BUFFER — THIS IS A FIXED BUG, NOT A STYLE CHOICE.**
/// The first version read the items into a `[count * 2]` array so the seed could be applied before
/// them, and never bounded `n`: every item has to be a VALID proposal name to be stored, but
/// nothing stops a caller repeating one, so `--features simd,simd,…` past 36 entries wrote off the
/// end of a stack array. Under `zig build test` that is a panic; in the SHIPPED ReleaseSmall CLI
/// it is a stack smash reachable from the command line. Re-splitting the string costs nothing and
/// removes the bound entirely. **A buffer sized from a type is not sized from the input.**
pub fn parseFeatures(spec: []const u8, base: Set, out: *std.Io.Writer) !Set {
    // --- pass 1: validate every item, and decide the seed ---------------------------------
    var set = base;
    var seeded = false;
    var saw_add = false;
    var saw_sub = false;
    var n: usize = 0;
    var scan = std.mem.splitScalar(u8, spec, ',');
    while (scan.next()) |raw| {
        const item = try parseFeatureItem(std.mem.trim(u8, raw, " \t"), n == 0, out);
        n += 1;
        if (item.seed) |s| {
            set = s;
            seeded = true;
            continue;
        }
        if (item.on) saw_add = true else saw_sub = true;
    }
    if (n == 0) {
        try out.print("error: --features: empty list\n", .{});
        return error.BadFeatures;
    }
    if (!seeded and saw_add and saw_sub) {
        try out.print(
            "error: --features: '{s}' both adds and removes with no seed — say 'mvp,<added>' or 'all,-<removed>'\n",
            .{spec},
        );
        return error.BadFeatures;
    }
    // An unseeded list takes the only seed its shape can mean: bare names are the language asked
    // for on top of the WebAssembly 1.0 core (`mvp` — which has floats); `-name` items describe
    // subtractions from the default.
    if (!seeded and saw_add) set = presetSeed("mvp").?;

    // --- pass 2: apply, now that the seed underneath them is settled -----------------------
    var apply = std.mem.splitScalar(u8, spec, ',');
    var i: usize = 0;
    while (apply.next()) |raw| : (i += 1) {
        const item = try parseFeatureItem(std.mem.trim(u8, raw, " \t"), i == 0, out);
        if (item.seed == null) for (item.bits) |f| set.set(f, item.on);
    }
    return set;
}

pub fn firstViolation(gpa: std.mem.Allocator, module: *const Module, fs: Set) !?Feature {
    if (fs.all()) return null; // nothing restricted: skip the whole pass
    var found: ?Feature = null;

    // --- composite types -------------------------------------------------------------------
    // ⚠️ `comp_types` holds function signatures AND the GC struct/array forms, so its mere
    // non-emptiness says nothing — every module has function types. Only the struct/array arms
    // are GC.
    for (module.comp_types) |ct| switch (ct) {
        .func => |ft| {
            for (ft.params) |p| requireValType(fs, p, &found) catch return found;
            for (ft.results) |r| requireValType(fs, r, &found) catch return found;
            // Multi-value: more than one result is the proposal's whole content.
            if (ft.results.len > 1) require(fs, .multi_value, &found) catch return found;
        },
        // ⚠️ The FIELDS are walked too, not just the composite kind. `.gc` alone left a
        // `(struct (field (ref (exact $t))))` accepted with custom-descriptors off whenever GC
        // was on — the arm answered the question "is this a GC form?" when the question is
        // "what does this type need?".
        // Struct and array TYPES need gc AND gc-types (measured: `(type (struct))` needs both).
        .@"struct" => |fields| {
            require(fs, .gc, &found) catch return found;
            require(fs, .gc_types, &found) catch return found;
            for (fields) |f| requireStorage(fs, f.storage, &found) catch return found;
        },
        .array => |f| {
            require(fs, .gc, &found) catch return found;
            require(fs, .gc_types, &found) catch return found;
            requireStorage(fs, f.storage, &found) catch return found;
        },
    };

    // --- mutable globals across the module boundary --------------------------------------
    // 🔬 mutable-global (2026-09-21): an IMPORTED or EXPORTED mutable global. A mutable global
    // that stays inside the module is 1.0 core; crossing the boundary is the proposal.
    for (module.imports) |im| if (im.type == .global and im.type.global.mutable) {
        require(fs, .mutable_global, &found) catch return found;
    };
    for (module.exports) |ex| if (ex.type == .global and ex.type.global.mutable) {
        require(fs, .mutable_global, &found) catch return found;
    };

    // --- custom-descriptors type-level formers ---------------------------------------------
    // `(descriptor $d)` and `(describes $s)` are clauses on a TYPE, so nothing in the
    // instruction walk below can see them. A module that only declares a descriptor pair —
    // never executing one D3/D4 instruction — used to load with `custom_descriptors` off.
    for (module.descriptors) |d| if (d != null) {
        require(fs, .custom_descriptors, &found) catch return found;
    };
    for (module.describes) |d| if (d != null) {
        require(fs, .custom_descriptors, &found) catch return found;
    };

    // --- memories ------------------------------------------------------------------------
    if (module.memories.len > 1) require(fs, .multi_memory, &found) catch return found;
    for (module.memories) |m| {
        if (m.limits.is64) require(fs, .memory64, &found) catch return found;
        if (m.limits.shared) require(fs, .threads, &found) catch return found;
        // custom-page-sizes. 16 is the fixed 64 KiB page every wasm before the proposal had, and
        // `Limits.page_size_log2` defaults to it — so `!= 16` is exactly "this memory declared
        // its own page size". Tested on the whole INDEX SPACE, imports included, for the reason
        // `module.tables` is: an IMPORTED byte-paged memory needs the proposal just as much, and
        // counting only defined memories would gate the easy half.
        if (m.limits.page_size_log2 != 16) require(fs, .custom_page_sizes, &found) catch return found;
    }

    // --- tables and globals --------------------------------------------------------------
    // ⚠️ `module.tables` is the whole INDEX SPACE — imported tables first, then defined — so this
    // one test covers all three spellings the spec asserts on (import+import, import+defined,
    // defined+defined). Counting only defined tables would pass two of the three.
    if (module.tables.len > 1) {
        require(fs, .multi_table, &found) catch return found;
        // Several tables arrived INSIDE reference-types, so they need it too — the dependency
        // `Set.incoherent` used to enforce on the config now enforced on the module.
        require(fs, .reference_types, &found) catch return found;
    }
    // 🚨 **A `funcref` TABLE is WebAssembly 1.0, and `--features mvp` refused it until 2026-09-21**
    // — measured on the released 1.0.2: `(module (table 1 funcref))` failed with "uses the
    // 'reference_types' proposal", where wasm-tools' `mvp` admits it. So every C program with a
    // function pointer was refused. The element type went through the VALUE-type rule, and as a
    // value type (a param, a local, a global) `funcref` IS reference-types; as a table's element
    // it is the only element type 1.0 had. Every other element type is judged as a value type
    // (`(table 1 externref)` needs gc-types, measured).
    for (module.tables) |t| if (t.element != .funcref) {
        requireValType(fs, t.element, &found) catch return found;
    };
    // 🚨 **A 64-bit TABLE is memory64 too** (table64 is part of the memory64 proposal), and until
    // 2026-10-23 `(table i64 1 funcref)` was ACCEPTED under every configuration, `-all` and `mvp`
    // included. Only memories were checked for `is64`. Reported by wasmrt from wazmrt's 1.0.2
    // build (its §2.2m annex), still true on 1.0.4, and invisible to S1 until `table64.wat` joined
    // its corpus. The whole index space again, so an imported 64-bit table is gated as well.
    for (module.tables) |t| if (t.limits.is64) {
        require(fs, .memory64, &found) catch return found;
    };
    for (module.globals) |g| requireValType(fs, g.content, &found) catch return found;

    // --- tags ----------------------------------------------------------------------------
    if (module.tags.len > 0) require(fs, .exceptions, &found) catch return found;
    for (module.imports) |im| {
        if (im.type.kind() == .tag) require(fs, .exceptions, &found) catch return found;
        // custom-descriptors: an EXACT func import (descriptor kind `0x20`) demands type
        // EQUALITY where an ordinary import accepts a subtype. It is a link-time rule with no
        // instruction and no value type of its own, so neither walk reaches it.
        if (im.exact) require(fs, .custom_descriptors, &found) catch return found;
    }

    // --- CONSTANT EXPRESSIONS ---------------------------------------------------------------
    // 🚨 **These were never walked, and `extended_const` was the only one of the nineteen
    // proposals this function could never return** (Track B, 2026-09-20). Arithmetic in an
    // initializer — `(global i32 (i32.add (i32.const 1) (i32.const 2)))` — IS the extended-const
    // proposal, and a const-expr is the only place it can appear. So the bit existed in the enum,
    // was mirrored into `capi.zig`, was published as `WAZMRT_FEATURE_EXTENDED_CONST` in
    // `wazmrt.h`, was offered in the CLI's `--features` vocabulary, and **turning it off did
    // nothing**: measured, `--features mvp` validated that module OK while the same command
    // correctly refused a `sign_extension` one.
    //
    // ⚠️ **That is the exact failure this file's own header names** — *"a gate that misses an
    // opcode is worse than no gate: it reads as a control while letting the thing through"* —
    // and it was published to embedders as a control they could rely on.
    //
    // 🔑 Same decode-and-require loop as the bodies below, over the three places a const-expr
    // lives: defined globals' initializers, and active element / data segments' offsets. Element
    // segments in the expression form carry one per entry.
    {
        for (module.global_inits) |expr| try requireConstExprFeatures(gpa, fs, expr, &found);
        for (module.elements) |e| {
            try requireConstExprFeatures(gpa, fs, e.offset_expr, &found);
            for (e.exprs) |expr| try requireConstExprFeatures(gpa, fs, expr, &found);
        }
        for (module.data) |d| try requireConstExprFeatures(gpa, fs, d.offset_expr, &found);
        if (found) |_| return found;
    }

    // --- function bodies -------------------------------------------------------------------
    // Decoded here rather than reusing the validator's pass: this runs ONLY when something is
    // restricted, so the default path pays nothing for it.
    for (module.code) |code| {
        // 🚨 **LOCALS were never walked (found 2026-09-21).** A function declaring `(local v128)`
        // and executing no SIMD instruction RAN under `--features mvp` — measured — where
        // wasm-tools refuses it. The value-type pass covered signatures, globals and tables and
        // stopped there: the same shape as `extended_const`, a place a gated type can live that
        // no walk visited. Every type-level feature (simd, floats, gc, gc-types, reference types)
        // had this hole.
        for (code.locals) |l| requireValType(fs, l.type, &found) catch return found;
        const instrs = opcode.decodeBody(gpa, code.body) catch continue; // malformed: validate reports it
        defer opcode.freeBody(gpa, instrs);
        for (instrs) |instr| {
            requireEach(fs, instrNeeds(instr), &found) catch return found;
            // The opcode's own proposal is only half of it — see `immIsExact`.
            if (immIsExact(instr.imm)) require(fs, .custom_descriptors, &found) catch return found;
        }
    }

    return null;
}

// ⚠️ COVERAGE PIN — see the file header. `opFeature` ends in `else => null`, so a newly added
// opcode would be treated as WebAssembly 1.0 core and pass every gate silently. This assertion
// makes that impossible without a deliberate act: adding an `Op` breaks the build here.
//
// If it fires: decide which proposal the new opcode belongs to, add it to `opFeature` (or
// confirm it really is MVP core), and only then update the number.
comptime {
    const n = @typeInfo(opcode.Op).@"enum".fields.len;
    if (n != 258) @compileError(std.fmt.comptimePrint(
        "opcode.Op has {d} members, features.zig was written against 258. A new opcode must be " ++
            "classified in opFeature() before this number is updated — an unclassified opcode " ++
            "silently passes every proposal gate.",
        .{n},
    ));
}

// The classification behind that 254, recorded so the next person can re-check it cheaply rather
// than re-deriving it: 82 opcodes are mapped to a proposal in `opFeature`, and the remaining 172
// are WebAssembly 1.0 core — control flow, numerics, comparisons, loads/stores, locals/globals,
// `select`, `drop`, `nop`, `memory.size`/`grow`.
//
// ⚠️ The prose here read "that 238 … 66 opcodes" while the pin above said 240; both halves of a
// note like this go stale independently, and only the pin is compiler-checked. R3 (2026-08-13)
// added the six array bulk ops — 68 → 74 mapped, 240 → 246 total — and the core count is
// unchanged at 172, which is the arithmetic that says the six really did land in `.gc`.
//
// ⚠️ Four of those 172 are spelled `@"unreachable"`, `@"if"`, `@"else"` and `@"return"` because
// they collide with Zig keywords. A grep for `^    [a-z_]` misses all four — which is exactly how
// a hand-audit of this enum goes wrong, and why the count above comes from `@typeInfo` rather
// than from a text search.

// =========================================================================================
// Tests. These live here rather than in `capi.zig` (where the four original gating tests are)
// because every case below turns on a piece of TYPE SYNTAX, and hand-encoding a descriptor rec
// group as a byte array would make the test unreadable at exactly the point it has to be read.
// =========================================================================================

/// Everything on except the named proposals. Dependents are the caller's job — `Set.incoherent`
/// reports an unlayered set rather than repairing it, and a test that repaired it here would be
/// asserting against a config the engine would refuse.
fn setWithout(off: []const Feature) Set {
    var s: Set = .{};
    for (off) |f| s.set(f, false);
    return s;
}

/// Assemble `src`, decode it, and answer which proposal it needs that `fs` does not grant.
fn needs(src: []const u8, fs: Set) !?Feature {
    const wat = @import("wat.zig");
    var arena = std.heap.ArenaAllocator.init(std.testing.allocator);
    defer arena.deinit();
    const bin = try wat.assemble(arena.allocator(), src);
    var m = try Module.decode(std.testing.allocator, bin);
    defer m.deinit();
    return firstViolation(std.testing.allocator, &m, fs);
}

test "gating: custom_descriptors covers the TYPE-LEVEL formers, not only its instructions" {
    // ⚠️ REGRESSION TEST FOR A KNOWINGLY PARTIAL GATE. `firstViolation` walked instructions, and
    // `(exact $t)` / `(descriptor $d)` / `(describes $s)` live in the TYPE SECTION — so every
    // module below, none of which executes a single D3/D4 instruction, loaded with the bit off.
    //
    // 🔑 GC stays ON throughout. That is the whole point: with GC off these would be refused
    // anyway, and the test would pass while proving nothing about `custom_descriptors`.
    const off = setWithout(&.{.custom_descriptors});
    const all: Set = .{};

    const cases = [_][]const u8{
        // `(exact $t)` in a function signature — a parameter, then a result.
        "(module (type $s (struct)) (type (func (param (ref (exact $s))))))",
        "(module (type $s (struct)) (type (func (result (ref (exact $s))))))",
        // ... in a STRUCT FIELD and an ARRAY ELEMENT. Reached only because the composite arms
        // now walk their fields; requiring `.gc` for the kind alone stopped at the container.
        "(module (type $s (struct)) (type (struct (field (ref (exact $s))))))",
        "(module (type $s (struct)) (type (array (ref (exact $s)))))",
        // ... in an imported GLOBAL's type and an imported TABLE's element type.
        "(module (type $s (struct)) (import \"a\" \"b\" (global (ref null (exact $s)))))",
        "(module (type $s (struct)) (import \"a\" \"b\" (table 1 (ref null (exact $s)))))",
        // A `(descriptor $d)`/`(describes $s)` pair: no `exact` anywhere, no instruction at all.
        "(module (rec (type $a (sub (descriptor $a.d) (struct))) (type $a.d (sub (describes $a) (struct)))))",
        // An EXACT FUNC IMPORT (descriptor kind 0x20) — a link-time rule with neither an
        // instruction nor a value type of its own, so neither walk could reach it.
        "(module (type $f (func)) (import \"m\" \"n\" (func (exact (type $f)))))",
        // And exactness carried in an INSTRUCTION IMMEDIATE. `ref.test` exists without
        // custom-descriptors and is gated as `.gc`; the `exact` prefix on its target is the
        // proposal. A gate that only asked "is this opcode allowed" let this through.
        "(module (type $s (struct)) (func (param anyref) (result i32) (ref.test (ref (exact $s)) (local.get 0))))",
    };
    for (cases) |src| {
        std.testing.expectEqual(@as(?Feature, .custom_descriptors), try needs(src, off)) catch |e| {
            std.debug.print("not gated: {s}\n", .{src});
            return e;
        };
        // The same bytes are fine with the bit on — so the refusal is the gate, not the module.
        try std.testing.expectEqual(@as(?Feature, null), try needs(src, all));
    }
}

test "gating: custom_descriptors has NO false positives on plain GC" {
    // The failure mode that would make the new type pass unusable: refusing GC modules that
    // never touch a descriptor. Every one of these must load with `custom_descriptors` off.
    const off = setWithout(&.{.custom_descriptors});
    const cases = [_][]const u8{
        "(module (type $s (struct (field i32))) (func (result (ref $s)) (struct.new_default $s)))",
        "(module (type $a (array (mut i32))) (func (result (ref $a)) (array.new_default $a (i32.const 1))))",
        "(module (type $s (struct)) (func (param anyref) (result i32) (ref.test (ref $s) (local.get 0))))",
        "(module (type $s (struct)) (global (ref null $s) (ref.null $s)))",
    };
    for (cases) |src| {
        std.testing.expectEqual(@as(?Feature, null), try needs(src, off)) catch |e| {
            std.debug.print("false positive: {s}\n", .{src});
            return e;
        };
    }
}

test "gating: an exact ref reports the LAYER it is missing — gc before custom_descriptors" {
    // `requireValType` asks for the family first and the `exact` former second, and the order is
    // observable. An embedder who turned off GC has not "forgotten custom-descriptors"; telling
    // them so would name a switch that is not the one they touched.
    const src = "(module (type $s (struct)) (type (func (param (ref (exact $s))))))";
    // A coherent "no GC" set: `Set.incoherent` requires custom_descriptors to fall with it.
    try std.testing.expectEqual(@as(?Feature, .gc), try needs(src, setWithout(&.{ .gc, .custom_descriptors })));
    try std.testing.expectEqual(@as(?Feature, .custom_descriptors), try needs(src, setWithout(&.{.custom_descriptors})));
}

test "gating: extended_const — the proposal whose gate could NEVER fire" {
    // 🚨 **The only one of the nineteen `Feature` members that `firstViolation` could not return**,
    // because the walk never visited a CONSTANT EXPRESSION — the one place extended-const
    // arithmetic can appear. The bit was in the enum, mirrored into `capi.zig`, **published to
    // embedders as `WAZMRT_FEATURE_EXTENDED_CONST` in `wazmrt.h`**, and listed in the CLI's
    // `--features` vocabulary. Turning it off did nothing.
    //
    // Measured before the fix, and the control is what makes it a finding rather than a guess:
    //   wazmrt --features mvp extended-const.wat  ->  "validation: OK"          ← the subject
    //   wazmrt --features mvp sign-extension.wat  ->  "FAILED: uses 'sign_extension'" ← the control
    //
    // ⚠️ **This file's own header names the failure**: *"a gate that misses an opcode is worse
    // than no gate: it reads as a control while letting the thing through."*
    //
    // 🔑 **And the reason it hid for so long: `extended_const` is CONTEXTUAL.** `i32.add` is core
    // WebAssembly 1.0 in a function body; the proposal is that it may appear in a const-expr at
    // all. So the opcode→proposal map is right to return null for it, and no amount of walking
    // more places would have produced the bit — the const-expr walk has to ask a different
    // question. *A coverage gap and a classification gap look identical from the outside.*
    const off = setWithout(&.{.extended_const});
    const all: Set = .{};

    const uses = [_][]const u8{
        // A defined global's initializer — the canonical spelling.
        "(module (global i32 (i32.add (i32.const 1) (i32.const 2))))",
        "(module (global i64 (i64.mul (i64.const 2) (i64.const 3))))",
        // An active DATA segment's offset. A gate that covered globals only would pass this.
        "(module (memory 1) (data (offset (i32.sub (i32.const 8) (i32.const 4))) \"hi\"))",
        // …and an active ELEMENT segment's offset, the third const-expr position.
        "(module (table 4 funcref) (func $f) (elem (offset (i32.add (i32.const 1) (i32.const 1))) $f))",
    };
    for (uses) |src| {
        std.testing.expectEqual(@as(?Feature, .extended_const), try needs(src, off)) catch |e| {
            std.debug.print("not gated: {s}\n", .{src});
            return e;
        };
        // …and granted, the same module is fine.
        try std.testing.expectEqual(@as(?Feature, null), try needs(src, all));
    }

    // 🔒 The half that must NOT over-fire: a plain constant initializer is MVP, and so is the same
    // arithmetic inside a function BODY. Gating either would refuse WebAssembly 1.0.
    try std.testing.expectEqual(@as(?Feature, null), try needs("(module (global i32 (i32.const 3)))", off));
    try std.testing.expectEqual(
        @as(?Feature, null),
        try needs("(module (func (result i32) (i32.add (i32.const 1) (i32.const 2))))", off),
    );
}

test "gating: custom_page_sizes — the proposal that shipped with no switch at all" {
    // ⚠️ REGRESSION TEST FOR AN UNREFUSABLE PROPOSAL. Track P landed custom-page-sizes with no
    // `Feature` member, so `wazmrt_config_all_features(cfg, false)` — every switch in the enum
    // off — still accepted a byte-paged memory. There was nothing to turn off.
    const off = setWithout(&.{.custom_page_sizes});
    const all: Set = .{};

    const paged = [_][]const u8{
        "(module (memory 1 (pagesize 1)))",
        // The IMPORTED half. `module.memories` is the whole index space, imports first, and a
        // gate that counted only defined memories would cover exactly half the spellings.
        "(module (memory (import \"m\" \"n\") 0 (pagesize 1)))",
    };
    for (paged) |src| {
        std.testing.expectEqual(@as(?Feature, .custom_page_sizes), try needs(src, off)) catch |e| {
            std.debug.print("not gated: {s}\n", .{src});
            return e;
        };
        try std.testing.expectEqual(@as(?Feature, null), try needs(src, all));
    }

    // No false positives: an ordinary 64 KiB memory is MVP and must survive with EVERY switch
    // off, defined or imported. `Limits.page_size_log2` defaults to 16, so a gate written as
    // "the field is set" rather than "the field is not 16" would have refused both of these.
    var nothing: Set = .{};
    for (0..count) |i| nothing.set(@enumFromInt(@as(u8, @intCast(i))), false);
    for ([_][]const u8{
        "(module (memory 1))",
        "(module (memory (import \"m\" \"n\") 0))",
    }) |src| {
        std.testing.expectEqual(@as(?Feature, null), try needs(src, nothing)) catch |e| {
            std.debug.print("false positive: {s}\n", .{src});
            return e;
        };
    }
}

test "gating: a 64-bit TABLE needs memory64, defined or imported" {
    // Regression test for the 2026-10-23 fix: a 64-bit table was accepted under EVERY
    // configuration, because only memories were checked for `is64`.
    const off = setWithout(&.{.memory64});
    const all: Set = .{};
    for ([_][]const u8{
        "(module (table i64 1 funcref))",
        "(module (table (import \"m\" \"t\") i64 1 funcref))",
    }) |src| {
        std.testing.expectEqual(@as(?Feature, .memory64), try needs(src, off)) catch |e| {
            std.debug.print("not gated: {s}\n", .{src});
            return e;
        };
        try std.testing.expectEqual(@as(?Feature, null), try needs(src, all));
    }
    // No false positive: a 32-bit table is untouched by memory64.
    try std.testing.expectEqual(@as(?Feature, null), try needs("(module (table 1 funcref))", off));
}

test "gating: wide_arithmetic, and its multi_value layering" {
    const off = setWithout(&.{.wide_arithmetic});
    const all: Set = .{};

    for ([_][]const u8{
        "(module (func (param i64 i64 i64 i64) (result i64 i64) (i64.add128 (local.get 0) (local.get 1) (local.get 2) (local.get 3))))",
        "(module (func (param i64 i64 i64 i64) (result i64 i64) (i64.sub128 (local.get 0) (local.get 1) (local.get 2) (local.get 3))))",
        "(module (func (param i64 i64) (result i64 i64) (i64.mul_wide_s (local.get 0) (local.get 1))))",
        "(module (func (param i64 i64) (result i64 i64) (i64.mul_wide_u (local.get 0) (local.get 1))))",
    }) |src| {
        std.testing.expectEqual(@as(?Feature, .wide_arithmetic), try needs(src, off)) catch |e| {
            std.debug.print("not gated: {s}\n", .{src});
            return e;
        };
        try std.testing.expectEqual(@as(?Feature, null), try needs(src, all));
    }

    // 🔒 **Since 2026-09-21 the layering is enforced on the MODULE, not the config** (wasm-tools
    // never refuses a config; see `Set.incoherent`). wide-arithmetic ON with multi-value OFF is
    // an accepted set — and nothing a missing layer should refuse gets through: a function that
    // RETURNS the two i64s still needs multi-value for its signature.
    var wide_only: Set = .{};
    wide_only.set(.multi_value, false);
    try std.testing.expect(wide_only.incoherent() == null);
    try std.testing.expectEqual(@as(?Feature, .multi_value), try needs(
        "(module (func (param i64 i64) (result i64 i64) (i64.mul_wide_u (local.get 0) (local.get 1))))",
        wide_only,
    ));
    // …but the INSTRUCTION does not need it by itself — measured, wasm-tools admits
    // `i64.add128` with its results dropped under `all,-multi-value`. The old config rule claimed
    // "a module using one is a multi-value module whether or not it says so"; that was wrong.
    try std.testing.expectEqual(@as(?Feature, null), try needs(
        "(module (func i64.const 0 i64.const 0 i64.const 0 i64.const 0 i64.add128 drop drop))",
        wide_only,
    ));

    // No false positives: plain i64 arithmetic still loads with the flag off.
    try std.testing.expectEqual(@as(?Feature, null), try needs(
        "(module (func (param i64 i64) (result i64) (i64.add (local.get 0) (local.get 1))))",
        off,
    ));
}

/// `needs` for a module only BYTES can express (an overlong LEB has no text spelling).
fn needsBin(bin: []const u8, fs: Set) !?Feature {
    var m = try Module.decode(std.testing.allocator, bin);
    defer m.deinit();
    return firstViolation(std.testing.allocator, &m, fs);
}

test "gating: the six wasm-tools bits (2026-09-21), each refused by name, and the two holes" {
    // 🔬 Owner: support every wasm-tools feature name and MATCH its semantics. Each expectation
    // below is a row of `cmem/probes/feature-matrix.ts` run against wasm-tools 1.259 — and the
    // same matrix run against wazmrt now comes out IDENTICAL, which is the end-to-end check;
    // these are the per-bit pins that fail fast and name the bit.
    const all: Set = .{};
    const T = struct {
        fn refused(f: Feature, src: []const u8) !void {
            try std.testing.expectEqual(@as(?Feature, f), try needs(src, setWithout(&.{f})));
            try std.testing.expectEqual(@as(?Feature, null), try needs(src, .{}));
        }
        fn admitted(off: Feature, src: []const u8) !void {
            try std.testing.expectEqual(@as(?Feature, null), try needs(src, setWithout(&.{off})));
        }
    };

    // mutable-global: crossing the module boundary, either way — not a mutable global as such.
    try T.refused(.mutable_global, "(module (global (export \"g\") (mut i32) (i32.const 0)))");
    try T.refused(.mutable_global, "(module (import \"m\" \"g\" (global (mut i32))))");
    try T.admitted(.mutable_global, "(module (global (mut i32) (i32.const 0)))");
    try T.admitted(.mutable_global, "(module (global (export \"g\") i32 (i32.const 0)))");

    // floats: types AND instructions, SIMD lanes included — but not the relaxed ones (measured).
    try T.refused(.floats, "(module (func (result f32) f32.const 0))");
    // ⚠️ A float INSTRUCTION with no float TYPE anywhere — the only case where the instruction
    // rule decides. Every module above also declares an f32/f64, so the type rule refused them
    // first and `opIsFloat` could return false for everything without one test noticing
    // (`probes/features-invert.ts`, first run: UNGUARDED).
    try T.refused(.floats, "(module (func f32.const 0 drop))");
    try T.refused(.floats, "(module (func i32.const 0 f64.convert_i32_s drop))");
    try T.refused(.floats, "(module (func (result v128) v128.const i64x2 0 0 v128.const i64x2 0 0 f32x4.add))");
    try T.refused(.floats, "(module (func (result v128) f32.const 0 f32x4.splat))");
    try T.admitted(.floats, "(module (func (result v128) v128.const i64x2 0 0 v128.const i64x2 0 0 i32x4.add))");
    try T.admitted(.floats, "(module (func (result v128) v128.const i64x2 0 0 v128.const i64x2 0 0 v128.const i64x2 0 0 f32x4.relaxed_madd))");

    // bulk-memory-opt: memory.copy/fill only; memory.init stays bulk-memory's.
    try T.refused(.bulk_memory_opt, "(module (memory 1) (func i32.const 0 i32.const 0 i32.const 0 memory.copy))");
    try T.refused(.bulk_memory_opt, "(module (memory 1) (func i32.const 0 i32.const 0 i32.const 0 memory.fill))");
    try T.admitted(.bulk_memory_opt, "(module (memory 1) (data \"x\") (func i32.const 0 i32.const 0 i32.const 0 memory.init 0))");

    // call-indirect-overlong: the SAME instruction, table index `80 00` instead of `00`.
    const overlong = [_]u8{ 0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x04, 0x01, 0x60, 0x00, 0x00, 0x03, 0x02, 0x01, 0x00, 0x04, 0x04, 0x01, 0x70, 0x00, 0x01, 0x0a, 0x0a, 0x01, 0x08, 0x00, 0x41, 0x00, 0x11, 0x00, 0x80, 0x00, 0x0b };
    const minimal = [_]u8{ 0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x04, 0x01, 0x60, 0x00, 0x00, 0x03, 0x02, 0x01, 0x00, 0x04, 0x04, 0x01, 0x70, 0x00, 0x01, 0x0a, 0x09, 0x01, 0x07, 0x00, 0x41, 0x00, 0x11, 0x00, 0x00, 0x0b };
    try std.testing.expectEqual(@as(?Feature, .call_indirect_overlong), try needsBin(&overlong, setWithout(&.{.call_indirect_overlong})));
    try std.testing.expectEqual(@as(?Feature, null), try needsBin(&minimal, setWithout(&.{.call_indirect_overlong})));
    try std.testing.expectEqual(@as(?Feature, null), try needsBin(&overlong, all));

    // gc-types: every abstract reference type but func and exn — externref included.
    try T.refused(.gc_types, "(module (func (param externref)))");
    try T.refused(.gc_types, "(module (type (struct)))");
    try T.refused(.gc_types, "(module (table 1 externref))");
    try T.admitted(.gc_types, "(module (func (param funcref)))");

    // legacy-exceptions: its own bit AND exceptions; the new `try_table` needs neither this bit.
    try T.refused(.legacy_exceptions, "(module (tag) (func try catch 0 end))");
    try std.testing.expectEqual(@as(?Feature, .exceptions), try needs("(module (func try catch_all end))", setWithout(&.{.exceptions})));
    try T.admitted(.legacy_exceptions, "(module (tag) (func (block (try_table (catch 0 0)))))");

    // Typed references need reference-types too (measured: function-references alone refuses).
    try T.refused(.reference_types, "(module (func (param (ref func))))");
    // ⚠️ A CONCRETE `(ref $t)` takes a different branch from the abstract `(ref func)` above; the
    // first inversion run removed reference-types from it and nothing failed.
    try T.refused(.reference_types, "(module (type $t (func)) (func (param (ref $t))))");

    // 🚨 HOLE 1, shipped in 1.0.2: a `funcref` TABLE is WebAssembly 1.0, and `mvp` refused it.
    var mvp = setWithout(&.{});
    for (0..count) |i| mvp.set(@enumFromInt(@as(u8, @intCast(i))), false);
    mvp.set(.floats, true);
    try std.testing.expectEqual(@as(?Feature, null), try needs("(module (table 1 funcref) (func))", mvp));

    // 🚨 HOLE 2: function LOCALS were never walked — `(local v128)` passed with simd off.
    try T.refused(.simd, "(module (func (local v128)))");
    try T.refused(.floats, "(module (func (local f64)))");
    try T.refused(.gc_types, "(module (func (local externref)))");
}
