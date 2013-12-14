# Proto

## Variables

### `var`

Variables can be declared with `var`.

	var foo = 'a variable';

	var bar = 5;

Variables which aren't assigned values take the value [`nil`](nil.md).

	var foo;

	console.log(foo);

Unlike JavaScript, variables are block scoped, not function scoped.

	// JavaScript (ES5)
	for (var i = 0; i < items.length; i++) {
		(function() {
			var item = items[i];
			setTimeout(function() {
				console.log(item);
			}, i * 1000);
		})();
	}

	// Proto
	for i of 1 .. items.length :{
		var item = items[i];
		setTimeout(fn {
			console.log(item);
		}, i * 1000);
	}

That makes `var` more like ECMAScript 6's `let`.  Proto doesn't have `let` because Proto's `var` *is* `let`.

Note that the above example is primarily intended to display how `var` works.  The same thing can be better expressed this way:

	// Proto
	for item of items:
		setTimeout(
			::console.log:(item),
			i * 1000
		);

(The above example makes use of the [bind operator `::`](../operators/bind.md) and the [partial application operator `:(`](../operators/partial-application.md).)

### `const`

A constant can be declared with `const`.

	const FOO = 'bar';

Constants cannot be changed and must be assigned an initialization value.  Like variables, they are block scoped.