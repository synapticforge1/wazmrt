;; H8 / I8: a `(@custom "name" …)` annotation in a module that ALSO has identifiers, so the
;; assembler would generate a `name` section of its own. What is emitted: one section, two, or an error?
(module $m
  (func $f)
  (@custom "name" "hand-written"))
