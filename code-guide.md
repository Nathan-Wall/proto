# Proto

## Code Guide

Contributions to Proto are welcome!  If you are going to contribute, make sure you familiarize yourself with this code guide.  Some of the Proto code is a little unorthodox.  In many cases there are good reasons for the way things are done.

### Output Language

This Proto compiler compiles to **ECMAScript 5.1**.  This is the target language which is the aim of compilation.  However, various extensions from different implementations should be taken into consideration as well.  Targetted implementations are IE9+, Firefox 4+, Safari 5.1+, Chrome current, and Node.js 0.8+.

### General style

+ Always use tabs for indentation (4 spaces)
+ Strict max line width of 80 characters
+ Always use semi-colons
+ Avoid curly brackets (`{`) when possible

#### Case

This project uses title case (`FooBar`) for some specific purposes.

+ **compiler code**: Functions used to process Proto nodes by type and translate them into JavaScript nodes.  Each function is named after the specific node type being processed (`ArrayExpression`, `FunctionExpression`, `IfStatement`, etc).
+ **runtime code**: Variables that hold Proto wrappers and functions that act on them.  For example, the `define` function acts on JavaScript native objects, while the `Define` function acts on Proto wrapper objects.
+ **built-ins**: Objects which are intended to act as prototypes.  For example: `Array`, `Promise`, etc.

Otherwise, this project tends to follow common JavaScript casing guidelines: camelCase for most things, ALL_CAPS for constants, TitleCase for constructors.

### Integrity

Of primary importance, runtime code must be written with integrity.  We want to make sure that we avoid various types of leaks of internal information and ensure the system maintains its integrity.  A good introduction to writing high integrity JavaScript can be found here: [jQuery Conf HIJS Talk](http://www.youtube.com/watch?v=FrFUI591WhI).

Here are some basic guidelines:

#### Never trust methods from built-ins after initialization

Methods on built-ins, like `Array.prototype.push`, can be changed.  We permit using built-ins, but *values should only be trusted at initialization time*.  Any built-ins you want to use after initialization should be stored locally for use later.  If a method is needed later, it can be converted into a function with `lazyBind`.

	var push = lazyBind(Array.prototype.push);

	// ...
	push(arrayLike, 'foo');

#### Never use a native array if any new keys will be added to the object.

This integrity practice is actually not exploitable on any existing implementations.  However, [according to the ECMAScript 5.1 spec](https://mail.mozilla.org/pipermail/es-discuss/2011-October/017514.html), the following code should set the value of `stolen` to the value of the `internal` array:

	// Code intended to keep `internal` from escaping the closure
	var list = (function() {
		var internal = [ ],
			push = lazyBind(Array.prototype.push);
		function add(item) {
			push(internal, item);
		}
		function get(index) {
			return internal[index];
		}
		return {
			add: add,
			get: get
		};
	})();

	// Attack
	var stolen;
	Object.defineProperty(Array.prototype, '0', {
		get: function() { },
		set: function(v) { stolen = this; }
	});
	list.add('a');
	// `stolen` is now the internal array

Because future implementations may start following the specification here, we guard against the exploit.  In order to keep the internal array safe, an array like object should be used rather than a true array.

	// This code actually keeps `internal` from escaping
	var list = (function() {
		var internal = Object.create(null),
			push = lazyBind(Array.prototype.push);
		internal.length = 0;
		function add(item) {
			push(internal, item);
		}
		function get(index) {
			return internal[index];
		}
		return {
			add: add,
			get: get
		};
	})();

#### Use objects with no prototype when a dictionary is desired

	// Wrong
	var dict = { };
	dict[foo] = 'bar';

	// Correct
	var dict = Object.create(null);
	dict[foo] = 'bar';

#### Manually coerce parameters

Parameters should be manually coerced so that coercion only happens once.

	function bad(bar) {
		var x, y;
		x = bar + 1;
		y = bar + 2;
		console.log(x, y);
	}

	function good(bar) {
		var x, y;
		bar = +bar; // coerce
		x = bar + 1;
		y = bar + 2;
		console.log(x, y);
	}

	var bar = {
		valueOf: function() {
			return Math.random() * 100;
		}
	};
	bad(bar);
	// logs two very different values
	good(bar);
	// always logs values that differ by 1