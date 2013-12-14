# Proto

## Arithmetic Operators

### Binary Operators

Proto supports the following arithmetic operators:

+ `a + b`: addition
+ `a - b`: subtraction
+ `a * b`: multiplication
+ `a / b`: division
+ `a ^ b`: power

All of these are the same as JavaScript, with two exceptions.

`+` is purely an addition in Proto.  If the operands are strings or any other value, they will be coerced to a number before adding.

	var a = '2', // strings
		b = '4';
	console.log(a + b); // 6

	var c = '3',
		d = {    // an object with @toNumber
			@toNumber: fn: 7
		};

	console.log(c + d); // 10

For string concatenation, the [`&` operator](concatenation.md) can be used.

While `^` is a bitwise operator in JavaScript, it is a power operator in Proto.

	console.log(2 ^ 3); // 8

See also: [Bitwise Operators](bitwise.md)

All of the arithmetic operators will coerce to number before performing any calculations.

### Unary Operators

The following unary forms are also availabled:

+ `+a`: coerces its operand to a number
+ `-a`: coerces its operand to a number and negates its value

	var x = '23',
		y = +x;

	console.log(typeof y); // 'number'
	console.log(y);        // 23