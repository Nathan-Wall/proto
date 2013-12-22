# Proto

## Range Operators

There are 3 range operators: `..`, `...`, and `by`.

### Inclusive Range Operator `..`

The exclusive range operator `..` creates an iterator that iterates between the left operand and the right operand, including the left operand but excluding the right operand.

	for i of 0 .. 5:
		console.log(i);

	// Logs:
	// 0
	// 1
	// 2
	// 3
	// 4

Any expression may be used as an operand.  Thus, iterating the indices of an array could be written:

	var array = [ 'a', 'b', 'c', 'd' ];
	for i of 0 .. array.length:
		console.log(i);

	// Logs:
	// 0
	// 1
	// 2
	// 3

### Exclusive Range Operator `...`

The inclusive range operator `...` creates an iterator that iterates between the left operand and the right operand, including both.

	for i of 0 ... 5:
		console.log(i);

	// Logs:
	// 0
	// 1
	// 2
	// 3
	// 4
	// 5

### Range Step Operator `by`

The range step operator `by` changes the amount that the value produced by the iterator increases by.

	for i of 0 .. 10 by 2:
		console.log(i);

	// Logs:
	// 0
	// 2
	// 4
	// 6
	// 8

### Iterating from a higher value to a lower one

When iterating from a higher number to a lower number, the iterator will subtract 1 by default.

	for i of 5 .. 0:
		console.log(i);

	// Logs:
	// 5
	// 4
	// 3
	// 2
	// 1

When using `by`, a negative number should be specified if the iterator should count down.

	for i of 10 .. 0 by -2:
		console.log(i);

	// Logs:
	// 10
	// 8
	// 6
	// 4
	// 2

If a positive number is used, the iterator will count up infinitely.

	for i of 10 .. 0 by 2:
		console.log(i);
	
	// Logs:
	// 10
	// 12
	// 14
	// 16
	// ...

Note that an infinite iterator may be desired in some situations, such as in a loop that contains a `break` for a specific condition, a `while` loop, a generator, or an async function.  However, it is recommended that `inf` be used as the right operand for the range operator if this is the desired outcome, because it clearly states the intent.

	for i of 10 .. inf by 2
		console.log(i);

	// Logs:
	// 10
	// 12
	// 14
	// 16
	// ...