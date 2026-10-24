;; A 100-entry table, for the `--max-table-elems` ceiling.
(module (memory (export "memory") 1) (table 100 funcref) (func (export "_start")))
