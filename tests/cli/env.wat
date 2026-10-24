;; Exits with 10 + the number of environment variables the guest sees. The +10 keeps a guest's
;; answer apart from a host refusal (rc 1): with a bare count, "1 variable" and "refused" agree.
(module
  (import "wasi_snapshot_preview1" "environ_sizes_get" (func $es (param i32 i32) (result i32)))
  (import "wasi_snapshot_preview1" "proc_exit" (func $x (param i32)))
  (memory (export "memory") 1)
  (func (export "_start")
    (drop (call $es (i32.const 0) (i32.const 4)))
    (call $x (i32.add (i32.const 10) (i32.load (i32.const 0))))))
