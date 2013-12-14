# Proto

## Object Wrappers

Each of the primitives has a corresponding object wrapper which the primitive coerces to when a property is accessed on it.

	Number.plusOne = fn :{
		return this + 1;
	};
	console.log(1.plusOne()); // 2

	String.forEachChar = fn(callback) :{
		for i of 0 .. this.length:
			callback(this[i]);
	};
	// Logs the characters 'h', 'e', 'l', 'l', 'o'
	'hello'.forEachChar(::console.log);

Note that `Number` and `String` are the prototype objects for numbers and strings respectively.  There is no `Number.prototype` or `String.prototype` because `Number` and `String` are not constructors.  Proto does not have constructors.  Instead it encourages thinking of relationships between objects, with prototypes forming the basis of other objects.

The prototypes used in creating the wrappers for each primitive are:

+ `Boolean`
+ `Number`
+ `String`
+ `Symbol`

These prototypes provide the methods that can be used on each primitive.

`nil` coerces to an empty object with no prototype.