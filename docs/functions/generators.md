# Proto

## Generators

Generator syntax can be used as a convenience for defining [iterators](../control/iterators).

	gen primes :{
		yield 2;
		for n of 3 .. inf by 2:
			if isPrime(n):
				yield n;
	}

	fn isPrime(n | natural) :{
		if n mod 2 == 0:
			return false;
		for i of 3 ... n ^ (1 / 2) by 2:
			if n mod i == 0:
				return false;
		return true;
	}

	// Logs the first 10 primes
	var p = primes();
	for i of 0 .. 10:
		console.log(p.next().value);

Generators are defined with the `gen` keyword.  Like functions, they may be defined as part of an expression.  

### `next` and `yield`

When a generator is called, the code block defined by the generator is not invoked immediately, but an iterator is returned.  When the `next` method of the iterator is invoked, the code block of the generator executes up to a `yield`, then it halts and produces a value which is returned to the caller of the `next` method.  The next time `next` is called, the execution resumes after the `yield` where it was previously halted.

The call to `next` will return an object with two properties: `value` and `done`.  `value` will contain whatever value was `yield`ed.  In this case `done` will be `false`.  If the generator ends, either by execution reaching the end of the generator, or by an explicit `return` statement, then `done` will be `true`.

Values may be passed back to the generator at each `yield` by passing an argument into the `next` method.

	gen foo :{
		var message = yield 'val1';
		console.log('foo:', message);
		message = yield 'val2';
		console.log('foo:', message);
		return 'val3';
	}

	var f = foo(),
		r = [ ];
	r.push(f.next().value);
	r.push(f.next('Hello').value);
	r.push(f.next('World').value);
	console.log(r);

	// Logs:
	// foo: Hello
	// foo: World
	// [ 'val1', 'val2', 'val3' ]

### With `for`

In many situations, `for` can be used to make working with generators easier, so that `next` doesn't have to be called explicitly.

	gen mrange(from | number, to | number, multiplier | number) :{
		var n = from;
		while n != to :{
			yield n;
			n *= multiplier;
		}
		yield n;
	}

	for n of mrange(3, 48, 2):
		console.log(n);
	// Logs:
	// 3
	// 6
	// 12
	// 24
	// 48

### `throw`

The iterators produced by a generator also come with a `throw` method, which can be used to force the generator to throw an exception at the currently suspended `yield`.