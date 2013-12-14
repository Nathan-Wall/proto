# Proto

## Promises

Internally, Proto uses an implementation of promises very similar to the [promises planned for ECMAScript 6](https://github.com/domenic/promises-unwrapping).  It is intended to be a direct implementation of ES6 promises with the exception of accepting thenables as promises.  Whether this is being added to ES6 promises for backwards compatibility reasons or not may be up to debate, but Proto doesn't have a need to be backwards compatible with existing promise libraries, and so the language gets to make a clean break.  Proto will only auto-unwrap true promises.  Other objects with a `then` method are not considered promises.

However, although internally Proto implements promises in a fashion similar to ES6, those APIs are not currently exposed.  Proto is experimenting with trying to make interactions with promises fully syntactic, so the only way to get a promise is through an `async` function, and the only way to get a resolution value is through `await`.  Asynchronous Proto APIs (like `setTimeout`) have a promise layer added on so that they can work with `await`.

Here are some examples comparing how things might be done in JavaScript vs how they can be accomplished in Proto:

	// JavaScript
	var foo = new Promise(res => {
		setTimeout(function() {
			res(5);
		}, 100);
	});
	// Proto
	var foo = async: setTimeout(fn: 5, 100);

	// JavaScript
	var bar = Promise.resolve(5);

	// Proto
	var bar = async: 5;

	// JavaScript
	var baz = Promise.reject(5);

	// Proto
	var baz = async :{ throw 5; }

	// JavaScript
	var bing = Promise.all(array);
	
	// Proto
	var bing = await ...array;