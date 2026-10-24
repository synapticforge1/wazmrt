;; 32 pages = 2 MiB of linear memory, for the `--max-memory` ceiling.
(module (memory (export "memory") 32) (func (export "_start")))
