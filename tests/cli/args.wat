;; Exits with 10 + the guest's argc (argv[0] is the module path), so what reaches the guest is
;; observable: a host flag that leaks into the guest's argv changes the exit code.
(module
  (import "wasi_snapshot_preview1" "args_sizes_get" (func $as (param i32 i32) (result i32)))
  (import "wasi_snapshot_preview1" "proc_exit" (func $x (param i32)))
  (memory (export "memory") 1)
  (func (export "_start")
    (drop (call $as (i32.const 0) (i32.const 4)))
    (call $x (i32.add (i32.const 10) (i32.load (i32.const 0))))))
