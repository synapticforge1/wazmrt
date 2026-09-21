;; H8 / I8: the same annotation in a module with NO identifiers, so nothing else would produce a
;; `name` section. Isolates "is the annotation honoured" from "does it collide".
(module
  (func)
  (@custom "name" "hand-written"))
