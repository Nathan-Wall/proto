# Proto

## Partial Application Operator

Proto provides a syntactic form to partially preload the arguments for a function.  In order to create a function derived from another function with some arguments preapplied, use `:(` followed by the arguments.

	fn foo(a, b) :{
		console.log('colors: ', a, b);
	}

	var bar = foo:('red', 'blue');

	bar(); // 'colors: red blue'

In the example above, `bar` is a function which calls `foo` and passes in the arguments `'red'` and `'blue'`.

### Slots

Many times, you'll want a partially applied function to be able to take additional arguments to pass along to the original function.

	fn foo(a, b, c) :{
		console.log('colors: ', a, b, c);
	}

	var bar = foo:('red', 'blue');

	bar('green'); // 'colors: red blue [nil]'

In the example above, the argument `'green'` was not passed along to `foo` because `bar` doesn't know where to pass it.  Proto could make an assumption about where to pass it, but instead it requires that you specify where it should be passed using **slots**.

	fn foo(a, b, c) :{
		console.log('colors: ', a, b, c);
	}

	var bar = foo:('red', 'blue', <>);

	bar('green'); // 'colors: red blue green'

The `<>` notation designates a slot where an argument can fall.  Slots can appear anywhere when doing a partial application.

	fn foo(a, b, c) :{
		console.log('colors: ', a, b, c);
	}

	var bar = foo:(<>, 'blue', <>);

	bar('orange', 'purple'); // 'colors: orange blue purple'

Slots can be numbered to specify a specific argument:

	fn foo(a, b, c) :{
		console.log('colors: ', a, b, c);
	}

	var bar = foo:(<1>, 'blue', <0>);

	bar('orange', 'purple'); // 'colors: purple blue orange'

Finally, **rest slots** `<...>` can be used to specify all remaining arguments.

	fn foo(a, b, c, d, e) :{
		console.log('colors: ', a, b, c, d, e);
	}

	var bar = foo:(<>, 'orange', <...>);

	bar('red', 'blue', 'green', 'violet');
	// 'colors: red orange blue green violet'