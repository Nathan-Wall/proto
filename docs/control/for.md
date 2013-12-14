# Proto

## `for`

Proto only supports one kind of `for`, which maps an iterable to an item at a time.

	var colors = [ 'red', 'green', 'blue' ];

	for color of colors:
		console.log(color);

	// Logs:
	// 'red'
	// 'green'
	// 'blue'

As you can see, `for` is not followed by parentheses, and a variable is declared to contain each item being iterated over.  In the example above, `color` is declared to be that variable (this is similar to ECMAScript 6's `for (let color of colors)`).

`:{` can be used instead of `:` to designate a code block.

	var colors = [ 'red', 'green', 'blue' ];

	for color of colors :{
		color = color & '-foo';
		console.log(color);
	}

	// Logs:
	// 'red-foo'
	// 'green-foo'
	// 'blue-foo'

The variable declared to hold each item is bound to a particular loop in the iteration.

	var colors = [ 'red', 'green', 'blue' ];

	for color of colors:
		setTimeout(fn: console.log(color), 100);

	// Logs:
	// 'red'
	// 'green'
	// 'blue'

Iterating over numbers can be accomplished easily with the [range operator (`..`)](../operators/range.md).

	for i of 0 .. 10:
		console.log(i);

	// Logs the numbers from 0 to 9

Use the [`by` range modifier](operators/range.md#by) to increase the index by a different value.

	for i of 0 .. 10 by 2:
		console.log(i);

	// Logs the even numbers from 0 to 8

Proto for loops are understandable and easy to read for the common case.  Proto's for loop is capable of taking any kind of iterable, so for more complicated needs, a generator comprehension or other kind of iterable could be used.

	for i of ( x ^ 2 for x in 0 .. 5 ):
		console.log(i);

	// Logs:
	// 0
	// 1
	// 4
	// 9
	// 16