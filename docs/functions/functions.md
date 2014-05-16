# Proto

## Functions

A function can be declared with `fn`.  To return a value use `return`.

	fn add(a, b) :{
		return a + b;
	}

	console.log(add(3, 7)); // 10

Functions, like variables, are *block scoped*.

	:{
		fn add(a, b) {
			return a + b;
		}
	}
	console.log(add(3, 7)); // ReferenceError

Function declarations are hoisted.

	console.log(add(3, 7)); // 10

	fn add(a, b) :{
		return a + b;
	}

Functions are first class, and can be written as expressions.

	var numbers = [ 1, 2, 3, 4, 5 ];
	var evens = numbers.map(fn(n) :{
		return n * 2;
	});

	console.log(evens); // [ 2, 4, 6, 8, 10 ]

If a function simply returns a value by evaluating an expression and a code block isn't needed, a colon can be used mapping to a return value (without the need to write `return`).

	var numbers = [ 1, 2, 3, 4, 5 ];
	var evens = numbers.map(fn(n): n * 2);

	console.log(evens); // [ 2, 4, 6, 8, 10 ]

Parentheses are not required when defining a function which doesn't have any parameters.

	fn foo :{
		// This function doesn't have any parameters
	}

### Default Parameter Values

Default values for function parameters can be specified.  Parameters take their default values in the presence of `nil`.

	fn foo(a = 2, b = 5) :{
		console.log(a, b);
	}

	foo();       // 2 5
	foo(3);      // 3 5
	foo(3, 7);   // 3 7
	foo(nil, 7); // 2 7

### Rest Parameters

Rest parameters can be used to take any remaining arguments that are passed into a function past the number of parameters specified for the function.  The `...` prefix is used to speficy a rest parameter.  Rest parameters are arrays.

	fn foo(first, ...args) :{
		console.log('first', first);
		for i of args.length:
			console.log(i, args[i]);
	}

	foo('a', 'b', 'c', 'd');
	// 'first' 'a'
	// 0 'b'
	// 1 'c'
	// 2 'd'

(Note: Proto has no `arguments` object. Rest parameters and other forms can be used instead.)

### Parameter Coercives

[Coercives](coercives.md) can be specified for a parameter in the same way as they are specified for variables.

	fn foo(a | int, b | string) :{
		console.log(typeof a, typeof b); // 'number' 'string'
		console.log(a, b); // 5 '3'
	}

	foo('5', 3);