// Bun FFI demo for the ABI-2 surface (`include/wazmrt.h`) — the "native FFI -> the C-ABI
// shared library" path, which is how wasmtk would embed wazmrt without going through V8.
// (Ported from the Deno FFI demo 2026-10-23: Deno is going away, workspace letter H15.)
//
//   zig build dll
//   bun examples/bun_ffi_capi.mjs        # or: zig build ffi-demo
//
// It does the two things the old wasm-c-api demo could not, and they are the two that decide
// whether this ABI is useful to a loader:
//
//   1. Runs a `.wat` DIRECTLY — no wat2wasm, no temp file, no build step.
//   2. Backs a guest import with a JavaScript callback that READS GUEST MEMORY through the
//      caller handle. Essentially every real loader import needs exactly this, and it is the
//      thing wasm-c-api structurally could not do.

import { dlopen, ptr, CString, JSCallback, read, toArrayBuffer } from "bun:ffi";
import { fileURLToPath } from "node:url";

const dllPath = process.env.WAZMRT_CAPI_DLL ??
  fileURLToPath(new URL("../zig-out/dll/wazmrt.dll", import.meta.url));

// ---------------------------------------------------------------------------------------
// Value handles over FFI
// ---------------------------------------------------------------------------------------
// `wazmrt_instance_t` and friends are `struct { uint64_t id; }` passed BY VALUE. A struct whose
// sole member is a 64-bit integer is passed in a register exactly like that integer on both
// SysV-x64 and Win64, so it is declared here as a plain "u64". That is the property which makes
// value handles pleasant over FFI: nothing has to model a C struct, and there is no pointer to
// keep alive. Out-parameters are 8-byte buffers.
//
// ⚠️ Bun differs from Deno in two ways that matter here: a pointer is a plain NUMBER (NULL comes
// back as `null`, and an address read out of a buffer as 0 means NULL), and a `u64` handle is a
// BigInt both ways.

const lib = dlopen(dllPath, {
  wazmrt_abi_version:        { args: [], returns: "u32" },
  wazmrt_version_string:     { args: [], returns: "ptr" },
  wazmrt_engine_new:         { args: [], returns: "ptr" },
  wazmrt_engine_delete:      { args: ["ptr"], returns: "void" },
  wazmrt_store_new:          { args: ["ptr"], returns: "ptr" },
  wazmrt_store_delete:       { args: ["ptr"], returns: "void" },
  wazmrt_linker_new:         { args: ["ptr"], returns: "ptr" },
  wazmrt_linker_delete:      { args: ["ptr"], returns: "void" },
  wazmrt_functype_new:       { args: ["ptr", "usize", "ptr", "usize"], returns: "ptr" },
  wazmrt_functype_delete:    { args: ["ptr"], returns: "void" },
  wazmrt_linker_define_func: { args: ["ptr", "ptr", "ptr", "ptr", "ptr", "ptr", "ptr"], returns: "ptr" },
  wazmrt_module_new_wat:     { args: ["ptr", "ptr", "usize", "ptr"], returns: "ptr" },
  wazmrt_module_delete:      { args: ["ptr"], returns: "void" },
  wazmrt_linker_instantiate: { args: ["ptr", "ptr", "ptr", "ptr", "ptr"], returns: "ptr" },
  wazmrt_instance_get_func:  { args: ["ptr", "u64", "ptr", "ptr"], returns: "bool" },
  wazmrt_instance_get_memory:{ args: ["ptr", "u64", "ptr", "ptr"], returns: "bool" },
  wazmrt_memory_write:       { args: ["ptr", "u64", "u64", "ptr", "usize"], returns: "bool" },
  wazmrt_func_call:          { args: ["ptr", "u64", "ptr", "usize", "ptr", "usize", "ptr"], returns: "ptr" },
  wazmrt_caller_read:        { args: ["ptr", "u64", "ptr", "usize"], returns: "bool" },
  wazmrt_error_message:      { args: ["ptr"], returns: "ptr" },
  wazmrt_error_delete:       { args: ["ptr"], returns: "void" },
  wazmrt_trap_message:       { args: ["ptr"], returns: "ptr" },
});
const S = lib.symbols;

const enc = new TextEncoder();
const cstr = (s) => enc.encode(s + "\0");
const cstring = (p) => (p ? new CString(p).toString() : null);
// An address written into an out-parameter buffer; 0 is NULL.
const outPtr = (b) => Number(new DataView(b.buffer).getBigUint64(0, true)) || null;

// `wazmrt_val_t` is { int kind; union { ... uint8_t v128[16]; } of; } — 4 bytes of kind, 4 of
// padding, then a 16-byte union at offset 8, so 24 bytes with 8-byte alignment.
const VAL_SIZE = 24;
const VAL_OF = 8;
const WAZMRT_I32 = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function checkErr(errPtr, what) {
  if (!errPtr) return;
  fail(`${what}: ${cstring(S.wazmrt_error_message(errPtr))}`);
}

// ---------------------------------------------------------------------------------------

const version = cstring(S.wazmrt_version_string());
console.log(`wazmrt ${version} (ABI ${S.wazmrt_abi_version()}) via Bun FFI`);

const engine = S.wazmrt_engine_new();
if (!engine) fail("engine_new");
const store = S.wazmrt_store_new(engine);
const linker = S.wazmrt_linker_new(engine);

// --- the host import: read 4 bytes of GUEST memory and hand them back --------------------
const callback = new JSCallback(
  (_env, caller, args, nargs, results, nresults) => {
    if (Number(nargs) !== 1 || Number(nresults) !== 1) return null;
    const offset = read.i32(args, VAL_OF);
    const buf = new Uint8Array(4);
    if (!S.wazmrt_caller_read(caller, BigInt(offset), ptr(buf), 4)) {
      return null; // a real loader would return a trap here
    }
    const word = new DataView(buf.buffer).getUint32(0, true);
    // Write the result into the engine-provided buffer: kind first, then the payload at the
    // union's offset. The engine zeroed this before the call, so a callback that writes nothing
    // yields a defined value rather than stack garbage.
    const out = new Uint8Array(VAL_SIZE);
    const dv = new DataView(out.buffer);
    dv.setInt32(0, WAZMRT_I32, true);
    dv.setInt32(VAL_OF, word | 0, true);
    new Uint8Array(toArrayBuffer(results, 0, VAL_SIZE)).set(out);
    return null;
  },
  { args: ["ptr", "ptr", "ptr", "usize", "ptr", "usize"], returns: "ptr" },
);

const kindI32 = new Int32Array([WAZMRT_I32]);
const ft = S.wazmrt_functype_new(ptr(kindI32), 1, ptr(kindI32), 1);
checkErr(
  S.wazmrt_linker_define_func(
    linker, ptr(cstr("env")), ptr(cstr("peek")), ft, callback.ptr, null, null,
  ),
  "linker_define_func",
);

// --- the module, as TEXT ------------------------------------------------------------------
const wat = `(module
  (import "env" "peek" (func $peek (param i32) (result i32)))
  (memory (export "mem") 1)
  (func (export "run") (result i32) i32.const 4 call $peek))`;
const watBytes = enc.encode(wat);

const modOut = new Uint8Array(8);
checkErr(S.wazmrt_module_new_wat(engine, ptr(watBytes), watBytes.length, ptr(modOut)), "module_new_wat");
const module = outPtr(modOut);
console.log("  ok  ran the .wat directly — no wat2wasm, no temp file");

const instOut = new Uint8Array(8);
const trapOut = new Uint8Array(8);
checkErr(S.wazmrt_linker_instantiate(linker, store, module, ptr(instOut), ptr(trapOut)), "linker_instantiate");
const instance = new DataView(instOut.buffer).getBigUint64(0, true);

// --- plant a value where the guest will ask the host to look -------------------------------
const memOut = new Uint8Array(8);
if (!S.wazmrt_instance_get_memory(store, instance, ptr(cstr("mem")), ptr(memOut))) fail("get_memory");
const memory = new DataView(memOut.buffer).getBigUint64(0, true);

const planted = new Uint8Array(4);
new DataView(planted.buffer).setUint32(0, 0xdeadbeef, true);
if (!S.wazmrt_memory_write(store, memory, 4n, ptr(planted), 4)) fail("memory_write");

// --- call it -------------------------------------------------------------------------------
const funcOut = new Uint8Array(8);
if (!S.wazmrt_instance_get_func(store, instance, ptr(cstr("run")), ptr(funcOut))) fail("get_func");
const func = new DataView(funcOut.buffer).getBigUint64(0, true);

const results = new Uint8Array(VAL_SIZE);
checkErr(S.wazmrt_func_call(store, func, null, 0, ptr(results), 1, ptr(trapOut)), "func_call");
const trapPtr = outPtr(trapOut);
if (trapPtr) fail(`trapped: ${cstring(S.wazmrt_trap_message(trapPtr))}`);

const answer = new DataView(results.buffer).getUint32(VAL_OF, true);
console.log(`  ok  host callback read guest memory: 0x${answer.toString(16)}`);

S.wazmrt_module_delete(module);
S.wazmrt_linker_delete(linker);
S.wazmrt_store_delete(store);
S.wazmrt_engine_delete(engine);
callback.close();
lib.close();

if (answer !== 0xdeadbeef) fail(`expected 0xdeadbeef, got 0x${answer.toString(16)}`);
console.log("OK");
