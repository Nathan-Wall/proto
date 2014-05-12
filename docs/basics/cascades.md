# Proto

## Cascades

Cascades provide a syntax for chaining together multiple calls to the same object.  Cascades allow similar conveniences to method chaining with the following advantages:

1. Cascade syntax is explicit, so additional knowledge about a method's return value is not necessary.
2. More complex logic is possible between cascades, including any control flow mechanisms such as `if`, `for`, and `while`.
2. The API designer doesn't have to plan ahead to return the object from a method.
3. The method is freed to return other values.

In JavaScript with jQuery, you might write something like the following:

```Javascript
$('#foo')
	.addClass('bar')
	.css('left', x)
	.show()
	.appendTo('body');
```

Using Proto's cascade syntax, it could be written as follows (assuming `select` does something similar to jQuery's `$`):

```Proto
|select('#foo')| :{
	.addClass('bar');
	.css('left', x);
	.show();
	.appendTo('body');
}
```

An object is explicitly stated between two vertical bars `|`; this is called the *cascade context*.  A block then immediately follows the cascade context declaration and, anytime a `.` occurs without an object preceding it, the cascade context will be used.

### More Than Chaining

Cascade blocks allow for cascaded method calls to be separated by statements and expressions which are unrelated to the cascade context.  You can write anything inside a cascade block that you would write outside of a cascade block; the only difference is the cascade block also permits a shorthand access to an object's properties.

```Proto
var foo = {
		bar: fn : "Message from bar",
		bing: fn : "Message from bing"
	},
	x = 1;

|foo| :{
	console.log(.bar());
	if x == 1:
		console.log(.bing() & "; x == 1");
	else:
		console.log(.bing() & "; x != 1");
}

// Logs:
// Message from bar
// Message from bing; x == 1
```

### Other Type of Property Access

You can do more with cascades than just call methods.  You can also set or update properties, get the value of a property, or delete a property on the cascade context.

```Proto
var foo = #{
		a: 1,
		b: 2,
		c: 3
	};

|foo| :{
	console.log(.a);
	.b = 500;
	delete .c;
	.x = 1000;
}

console.log(foo.b, foo.c, foo.x);

// Logs:
// 1
// 500 [nil] 1000
```

### Cascade Expressions

A cascade block can be used within an expression.  In such a case, the cascade expression will evaluate to the value of the last executed line in the block.

```Proto
var foo = #{
		bar: fn : "Message from bar"
	};

var result = |foo| :{
		.zap = 'BZZ';
		.bar();
	};

console.log(foo.zap);
console.log(result);

// Logs:
// BZZ
// Message from bar
```