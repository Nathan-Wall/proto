# Proto

## `nil`

`nil` is the value that represents no value.  It is similar to JavaScript's `null` and `undefined`.  However, Proto does not have `null` or `undefined`; it only has `nil`.

By default, variables start with the value `nil`.  If you try to access a property of an object that doesn't exist, it will result in `nil`.

	var x;
	
	var obj = { },
		y = obj.foo;

	console.log(x); // [nil]
	console.log(y); // [nil]

What makes `nil` different from JavaScript's `null` and `undefined` is that it automatically coerces to an empty object, so property access doesn't result in an exception.  So if you call a function that may return either an object or `nil`, you don't have to check to see which one it returned, and you don't have to check to see which properties are on the object.  You can just access them, and if they're not there you get `nil`.

	// JavaScript
	var data = getData(),
		firstName;
	if (data && data.name)
		firstName = data.name.first;
	// firstName is either undefined or a name

	// Proto
	var firstName = getData().name.first;
	// firstName is either nil or a name

However, trying to set a property on `nil` or invoke it will throw an exception.

	var empty;

	empty.foo = 'bar'; // TypeError
	empty(); // TypeError