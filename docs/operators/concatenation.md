# Proto

## String Concatenation

Proto has a special operator for string concatenation, `&`.  While JavaScript's `+` may mean addition or string concatenation depending on the operands, Proto's `+` always means addition, and `&` exclusively means string concatenation.

	var a = 1, b = 2, c = '3', d = '4';

	console.log(a + b); // 3
	console.log(b + c); // 5
	console.log(c + d); // 7

	console.log(a & b); // '12'
	console.log(b & c); // '23'
	console.log(c & d); // '34'

If the operands are not already a string, `&` will coerce both operands to a string before concatenating.  If the operands cannot be coerced to a string (objects that don't have a `@toString` method), an exception will be thrown.

There is also a unary form which will simply coerce its operand to a string.

	var a = 23,
		b = &a; // String coercion

	console.log(typeof b); // 'string'
	console.log(b);        // '23'