# Proto

## Nil-Coalescing Operator

The nil-coalescing operator can be used to pick the first non-nil value in a list of values.

```Proto
var x = nil,
	y = nil,
	z = 'foo';

var bar = x ?? y ?? z;
console.log(bar); // 'foo'
```

It is similar to the `||` operator, except `||` will result in the left operand only if it's truthy while `??` will result in the left operand as long as it's not `nil`.

```Proto
var x = nil,
	y = 0,
	z = 'foo';

var bar = x ?? y ?? z,
	bing = x || y || z;

console.log(bar);  // 0
console.log(bing); // 'foo'
```