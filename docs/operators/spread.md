# Proto

## Spread Operator

The spread operator `...` can be used to spread an array of arguments across many parameters for a function.

	fn foo(a, b, c) :{
		console.log('colors: ', a, b, c);
	}

	var colors = [ 'green', 'blue' ];

	foo('red', ...colors); // 'colors: red green blue'

The spread operator can also be used in an array to spread another array within it.

	var array1 = [ 'a', 'b', 'c', 'd' ];

	var array2 = [ 'x', 'y', ...array1, 'z' ];

	console.log(array2); // [ 'x', 'y', 'a', 'b', 'c', 'z' ]