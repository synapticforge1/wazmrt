;; Flat legacy EH: try / catch / catch_all / rethrow / delegate, and a try with a result.
;; wasm-tools 1.259 accepts ONLY this flat spelling (not the spec corpus's folded `(do …)`).
(module
  (tag $e)
  (tag $v (param i32))
  (func try catch $e end)
  (func try catch_all end)
  (func try catch $e catch_all end)
  (func try catch $e rethrow 0 end)
  (func block try try delegate 1 end end)
  (func (result i32) try (result i32) i32.const 1 catch $v end))
