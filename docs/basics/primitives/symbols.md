# Proto

## Symbols

Proto provides symbols which can be used to add private data to an object.  Symbol literals start with an `@` symbol.  They must be declared with `sym` before they can be used.

	sym @foo;

Proto's symbols are somewhat like ECMAScript 6's symbols, but there are some differences:

1. They are primitives.
2. They have a literal form, starting with an `@` symbol.
3. They are private and cannot be exposed through reflection APIs.
4. They can always be added to objects, even frozen objects.

	sym @foo;
	var obj = { };
	obj.@foo = 5;

	console.log(obj.foo);  // nil
	console.log(obj.@foo); // 5

### As a way of creating "private" properties

Symbols can be guarded with scope.  If a certain part of code has no access to the symbol, it has no way to access the data stored with the symbol, even if it has access to the object.  This makes symbols capable of being used to store private data.

	var Point;
	:{
		sym @x, @y;
		Point = {

			@x: 0,
			@y: 0,

			init(x | number, y | number) :{
				this.@x = x;
				this.@y = y;
			},

			get position :{
				return '(' & this.@x & ', ' & this.@y & ')';
			}

		};
	}

	var A = new Point(5, -3);
	console.log(A.position); // '(3, 5)'

In the above example, `position` is a public property of a `Point` object, while `@x` and `@y` are private properties.  They are kept private by keeping the symbols inside a particular scope (the code block).  If the symbols are not passed out of this code block, the private properties will remain guarded.

Symbols can be shared with other parts of code to create relationships that mimic protected properties, as well as various other scenarios.

### As a way of avoiding naming collisions

Symbols also help avoid naming collisions because the same symbol name can be reused in different parts of code without them interfering with each other.

	var obj = { },
		getFirstFoo, getSecondFoo;

	:{
		sym @foo;
		obj.@foo = 'a';
		getFirstFoo = fn: obj.@foo;
	}

	:{
		sym @foo;
		obj.@foo = 'b';
		getSecondFoo = fn: obj.@foo;
	}

	console.log(getFirstFoo());  // 'a'
	console.log(getSecondFoo()); // 'b'

### Sharing Symbols

Symbols, like any other value, can be stored in a varible.

	sym @foo;
	var bar = @foo;

	var obj = { };
	obj.@foo = 'baz';
	console.log(obj[bar]); // 'baz'

This allows you to pass symbols around to different parts of code.

### Symbol Object

There is a `Symbol` object wrapper, like the wrappers for the other primitives.

	var foo = new Symbol();

	var obj = { };
	obj[foo] = 'baz';
	console.log(obj[foo]); // 'baz'

It's recommended that symbol primitives be used rather than the object wrapper form.