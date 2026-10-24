;; Needs `simd`, for `--features` and its position rule.
(module (memory (export "memory") 1) (func (export "_start") (drop (v128.const i64x2 0 0))))
