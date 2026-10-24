;; No imports and no `_start`: called by export name (`run`, or the bare form).
(module
  (func (export "add") (param i32 i32) (result i32) (i32.add (local.get 0) (local.get 1))))
