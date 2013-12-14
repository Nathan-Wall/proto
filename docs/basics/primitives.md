# Proto

## Primitives

Proto has 5 types of primitives: [booleans](#booleans), [numbers](#numbers), [strings](#strings), [symbols](#symbols), and [`nil`](nil.md).

Primitives are not objects and do not have properties, but (like JavaScript) they do automatically coerce to objects when necessary.

The [`typeof` operator](../operators/typeof.md) can be used to determine whether a value is an object or a primitive and, if it's a primitive, what type of primitive it is.

### Booleans

There are two boolean values: `true` and `false`.

### Numbers

Proto numbers are similar to JavaScript numbers, with a few exceptions.  They are usually written in decimal form:

	var a = 1,
		b = 23.4,
		c = .05;

They support being written in hexadecimal, binary, and octal forms (using the ES6-style syntax):

	var a = 0x2fa,   // hexidecimal
		b = 0o41,    // octal
		c = 0b11001; // binary

Proto does not support the octal form from earlier versions of ECMAScript, such as `041`.  This has been removed from ECMAScript's strict mode and is being replaced by the `0o41` form in ES6.  Proto has left out the `041` form entirely because `0o41` is more clear.

### Strings

Proto strings can be contained in single quotes `'` or double quotes `"`, and just like JavaScript, there is no difference between the two.

	var a = 'foo',
		b = "bar";

### Symbols

Proto provides symbols which can be used to add private data to an object.

[Read more about symbols &rarr;](primitives/symbols.md)

### `nil`

`nil` is the value that represents "nothing" in Proto.

[Read more about `nil` &rarr;](primitives/nil.md)