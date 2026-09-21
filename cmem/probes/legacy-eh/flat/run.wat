;; Flat legacy EH that RUNS: each export returns a number that says which path executed.
;;   caught        → 42  (throw $v 42 inside try, caught by `catch $v`, payload returned)
;;   caught_all    → 7   (throw $e, caught by `catch_all`)
;;   not_thrown    → 1   (the try body's own result, no handler runs)
;;   delegated     → 99  (inner try delegates to the outer one, whose catch_all handles it)
;;   rethrown      → 5   (caught, rethrown with `rethrow 0`, caught again by an outer try)
(module
  (tag $e)
  (tag $v (param i32))
  (func (export "caught") (result i32)
    try (result i32)
      i32.const 42
      throw $v
    catch $v
    end)
  (func (export "caught_all") (result i32)
    try (result i32)
      throw $e
    catch_all
      i32.const 7
    end)
  (func (export "not_thrown") (result i32)
    try (result i32)
      i32.const 1
    catch_all
      i32.const 0
    end)
  (func (export "delegated") (result i32)
    try (result i32)
      try (result i32)
        throw $e
      delegate 0
    catch_all
      i32.const 99
    end)
  (func (export "rethrown") (result i32)
    try (result i32)
      try (result i32)
        throw $e
      catch $e
        rethrow 0
      end
    catch_all
      i32.const 5
    end))
