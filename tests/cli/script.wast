(module (func (export "two") (result i32) (i32.const 2)))
(assert_return (invoke "two") (i32.const 2))
