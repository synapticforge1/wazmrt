;; Never returns: only `--max-iterations` stops it. Cases always pass a small bound.
(module (memory (export "memory") 1) (func (export "_start") (loop $l (br $l))))
