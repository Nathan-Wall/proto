# Descriptive Overview of the Proto Language

This is a descriptive overview of the Proto language as it compares to JavaScript.  There is also a [quick side-by-side comparison](https://github.com/Nathan-Wall/proto/blob/master/VS-JS.md).

## Prototypal Programming

(See also [Overview of Design Decisions](https://github.com/Nathan-Wall/proto/blob/master/DESIGN.md#prototypal-programming).)

### Inheritance Operator (`like`)

#### Unary `like`

The unary `like` operator is simply a shorthand for ES5's `Object.create`.  Its name encourages thinking of objects as being like other objects.

    var A = { foo: 'bar' },
        B = like A;
    // The prototype of B is A
    
    assert(B.foo === 'bar');

#### Binary `like`

The binary `like` operator determines if one object is like another (if there is an inheritance relationship).

    var A = { foo: 'bar' },
        B = like A;
    
    assert(B like A);
    assert(!(A like B));

Note that this operator is not commutative.  It determines if the left operand inherits from the right operand.

This is a replacement for JavaScripts `instanceof` operator (which acts on constructors).

### Instantiation Operator (`new`)

Proto's `new` operator looks like JavaScript's `new` operator, but it functions differently.  Rather than calling `new` on a constructor, Proto's `new` is invoked directly on an object.

    var A = { foo: 'bar' },
        B = new A();
    
    assert(B like A);
    assert(A like B);

So what's the difference between `new` and `like`?

`new` takes one extra step and "initializes" the object by calling an `init` method if one exists on the object, passing in any arguments.

    var Person = {
        init(name) {
            this.name = name;
        },
        sayHi() {
            return "Hello, my name is " & this.name;
        }
    };
    
    var jack = new Person('Jack');
    jack.sayHi(); // => "Hello, my name is Jack"

`new` is `like` + `init`.  It creates a new object based on a prototype and then calls its `init` method.

(Two other things you may note from this example are that Proto supports [ES6 method definitions](http://ariya.ofilabs.com/2013/03/es6-and-method-definitions.html) and a disambiguted [concatenation operator](#string-concatenation-) `&`.)

### Define Properties Operator (`:=`)

(See also [define properties operator strawman](http://wiki.ecmascript.org/doku.php?id=strawman:define_properties_operator).)

`:=` adds properties to an object.

    var Mammal = {
        init(name) {
            this.name = name;
        }
    };
    
    var Dog = like Mammal := {
        legs: 4
    };
    
    var spark = new Dog('Spark');
    assert(spark.name === 'Spark');
    assert(spark.legs === 4);

## Integrity

(See also [Overview of Design Decisions](https://github.com/Nathan-Wall/proto/blob/master/DESIGN.md#integrity).)

### Bind Operator (`::`)

(See also [bind operator strawman](http://wiki.ecmascript.org/doku.php?id=strawman:bind_operator).)

`::` is a bind operator.  It takes an object as the left operand and a function as the right operand and binds the function to the object.

Often you may want to call a function with a certain object as the receiver.  For example, in JavaScript you can use `Array.prototype.map` on any array-like, even if it doesn't inherit from `Array.prototype`.  For example, you may want to do something like this in JavaScript:

```js
var map = Array.prototype.map;
var inputs = document.getElementsByTagName('input');

var values = map.call(inputs, function(input) {
    return input.value;
});
```

In Proto, this can be achieved with the `::` operator:

    var map = Array.map;
    var inputs = document.getElementsByTagName('input');
    
    var values = inputs::map(input -> input.value);

This syntax looks very similar to as if we had called `inputs.map`, but since `inputs` doesn't have its own `map` method, we're using the one supplied by `Array`.

Some other things you may observe from the above example:

1. We replaced `Array.prototype.map` with just `Array.map`.  Since there are no constructors in Proto, `Array` is an object (not a function) and this object itself serves as the prototype for all arrays.
2. Proto supports arrow lambda expressions (`->` and `=>`), which are similar to ES6 arrow functions (`=>`).

The `::` operator can also be used to extract a bound method.  In JavaScript you may do something like:

```js
function greet(person) {
    return "Hi " + person.name +
        ", I'm " + this.name;
}

var alice = { name: 'Alice' };
var bob = { name: 'Bob' };

// Bind greet to alice
var aliceGreet = greet.bind(alice);

aliceGreet(bob); // "Hi Bob, I'm Alice"
```
    
In Proto, rather than `greet.bind(alice)`, that line would be written as:

    var aliceGreet = alice::greet;
    
    aliceGreet(bob); // "Hi Bob, I'm Alice"

Because Proto has bind (`::`) and [spread](#spread-operator-) (`...`) operators, there is no need for `call`, `apply`, or `bind` and they are omitted from the `Function` prototype.

### Own Operator (`#`)

`#` is the *own* operator.  It simplifies working with the own properties of an object (rather than inherited properties).

#### Unary `#`

As a unary operator, it takes an object as its right operand and essentially returns that object without its prototype chain.

##### Use In Dictionaries

In JavaScript, it's common to use objects as dictionaries.  However, there are some problems with using regular objects as dictionaries because clashes could occur between entries and properties on `Object.prototype`.

ES5 made it possible to create objects without a prototype by using `Object.create(null)`.  There are plans for ES6 to make this easier with [dicts](http://wiki.ecmascript.org/doku.php?id=harmony:modules_standard).  Proto provides the `#` operator to encourage creating prototypeless objects common, for use as dictionaries.

    var animals = #{
        'monkey': 'A mammal of the order of Primates',
        'mouse': 'A small Old World rodent',
        'chicken': 'A domenstic fowl'
    };

It can be used on existing objects.

    var Mammal = {
        hair: true
    };
    
    var Dog = like Mammal := {
        legs: 4
    };
    
    // A hair property is in the prototype chain of Dog
    assert('hair' in Dog);
    
    // hair is not an own property of Dog
    assert(!('hair' in #Dog));

It can be used before any object, including array-literals.

	var array = #[ 1, 2, 3 ];

	assert(!('push' in array));

This may be desirable in situations demanding high-integrity because `push` invokes any setters on the `Array` prototype, so having an array that you can push to without invoking setters may be desired.  The array can be pushed to with the help of the [bind operator](#bind-operator-).

#### Binary `#`

##### Get

Sometimes you want to only access an own property of an object.  `#` is the *own property* operator.

Using the `Mammal` and `Dog` objects from above, we could have:

    assert(Dog.legs === 4);
    assert(Dog#legs === 4);
    
    assert(Dog.hair === true);
    assert(Dog#hair === nil); // nil is similar to undefined

##### Set

The `#` operator can also work for setting own propreties.

    var Foo = {
        get bar() :{ return this._bar; },
        set bar(value) :{ this._bar = value; }
    };
    
    var Bing = like Foo;
    
    // With regular . operator, the setter inherited
    // from Foo is used.
    Bing.bar = 1;
    assert(Bing.bar === 1);
    assert(Bing._bar === 1);
    
    // With # operator, the own "bar" property is set,
    // skipping the inherited setter.
    Bing#bar = 2;
    assert(Bing.bar === 2);
    assert(Bing._bar === 1);

(Note the colon in front of the blocks that start the bar getter and setter (`:{`).  This will be covered later.)

## Syntax

(See also [Overview of Design Decisions](https://github.com/Nathan-Wall/proto/blob/master/DESIGN.md#syntax).)

### Required Semicolon (`;`)

For example, while JavaScript has a feature called ASI (automatic semicolon insertion) which silently inserts semicolons where developers didn't put them, Proto requires semicolons.  This helps resolve ambiguities like the following in JavaScript:

```js
var foo = function() { }

(function() {
    // ...
}());

foo(); // TypeError, foo is undefined
```

ASI has been the culprit of stopping many proposals dead in their tracks and needlessly complicating the grammar of the language.  Therefore, Proto requires them.

### Property Access (`nil`)

JavaScript permits proprety access on objects that don't have the property being accessed.  Such accesses return a special value `undefined` to indicate that the property is not defined.  However, if you want to access a property multiple levels down and you're not sure if any of the levels exist, then checks are required to prevent an exception.

```js
var zing;
if (foo && foo.bar && foo.bar.baz)
	zing = foo.bar.baz.zing;
```

Proto doesn't have `undefined`, and it doesn't have `null` either.  In their place it has a single value called `nil`.  `nil` is a lot like `undefined` except a few key points.  Primarily, property access on `nil` always returns `nil` and never results in an exception.

Therefore, the JavaScript code above can be rewritten in Proto with no need for checks:

	var zing = foo.bar.baz.zing;

If `foo.bar` or `foo.bar.baz` or `foo.bar.baz.zing` doesn't exist, then the operation will result in `nil`.

`nil` is also more useful in operations with primitives because it coerces to the most sensible "nothing" value.  For the following examples, let `x = nil`.

Strings:
	assert('foo' & x & 'bar' === 'foobar');

Numbers:
	assert(20 + x + 10 === 30);

Booleans:
	assert(!nil); // nil is falsey

(Brandon Benvie has prototyped a [nil](https://github.com/Benvie/nil) module for Node.  Proto's `nil` has a lot of similarities; however, unlike Brandon's `nil`, Proto's `nil` is not invokable.)

### `typeof` Fixes

Proto's `typeof` differs from JavaScripts in two ways.

1. `typeof nil` is `"nil"`
2. `typeof f` where `f` is a function is `"object"`

This makes Proto's `typeof` a reliable check to determine if a value is a primitive (`"boolean"`, `"number"`, `"string"`, `"nil"`) or an object.

To determine if a value is callable, use `Reflect.isCallable(f)`.

### Spread Operator (`...`)

Proto supports [ES6's spread operator](http://wiki.ecmascript.org/doku.php?id=harmony:spread).

    var bar = [ 1, 2, 3 ];
    foo(...bar);

Currently spread can only be used on arrays.  That should change in the future.

### Blocks (`:{`)

While blocks in JavaScript start with the same character as object literals (`{`), proto distinguishes the two by putting a colon before the opening curly bracket for a block (`:{`).

<table>
<tr><th>JavaScript</th><th>Proto</th></tr>
<tr><td>
<div class="highlight highlight-js"><pre>
if (a == b) {
    // ...
} else {
    // ...
}
</pre></div>
</td>
<td>
<div class="highlight"><pre>
if (a == b) :{
    // ...
} else :{
    // ...
}
</pre></div>
</td></tr>
</table>

This could give us the ability to do some interesting stuff in the future ([everything as an expression](https://mail.mozilla.org/pipermail/es-discuss/2011-November/018222.html)? -- just as an example).

### Functions

#### `fn` instead of `function`

Proto uses a shorter keyword for function declarations to get it out of your way.  It's not something you really need to read, your brain is capable of glancing at `fn` and moving on.

    fn foo(a, b) :{
        // ...
    }

#### Function Expressions

`fn` can only be used for function declarations.  Function expressions can just leave it out.

    var r = [ 'a', 'b', 'c' ].map((u) :{
        return u.charCodeAt(0);
    });
    
    assert(r[0] === 97);
    assert(r[1] === 98);
    assert(r[2] === 99);

#### Double Colon

Using a double colon (`::`) in a function declaration or a function expression will make it use *lexical* `this` rather than *dynamic* `this`.  All JavaScript functions in ES5 and below have dynamic `this`, which changes based on *how the function is called*.  ES6 will provide arrow functions (`=>`) for lexical `this`, which determines the value of `this` based on regular scoping rules.

Proto provides double colon in function declarations or function expressions for this same purpose.

    fn foo() :{
        fn dynThis() :{
            return this;
        }
        fn lexThis() ::{
        }
        return {
            dynThis: dynThis,
            lexThis: lexThis
        };
    }
    
    var A = { };
    var F = A::foo();
    
    assert(F.dynThis() === F);
    assert(F.lexThis() === A);

#### Arrow Lambda Expressions (`->` and `=>`)

Proto also provides arrow lamdba expressions.  These don't have blocks and implictly return a value without the need for `return`.

    var r = [ 'a', 'b', 'c' ].map(u -> u.charCodeAt(0));
    
    assert(r[0] === 97);
    assert(r[1] === 98);
    assert(r[2] === 99);

The difference between arrow `->` and fat arrow `=>` is `->` will use dynamic `this`, while `=>` will use lexical this.

These arrows are similar to both CoffeScript and ES6 arrows, but a key difference is in Proto block bodies are not permitted for arrow lambdas.  Proto's regular function expressions are succinct enough not to need it, and in the future we may be able to do some pretty cool stuff with blocks and arrow lambdas (like [first class block lambdas](http://wiki.ecmascript.org/doku.php?id=strawman:block_lambda_revival).

### String Contatenation (`&`)

JavaScript's `+` operator is overloaded to either do addition or string concatenation.  These operations have been disambiguated in Proto, much like in PHP.  In Proto, `+` does purely addition while `&` does string concatenation.  The type of the operands doesn't matter.  If `+` is used, both operands will be coerced to a number.  If `&` is used, both operands will be coerced to a string.

	assert('4' + '5' === 9);
	assert(4 & 5 === '45');

### Bitwise Operators (`and`, `or`, and `xor`)

Because `&` has been claimed for string concatenation, and in order to gain more symbols to use as the language develops, the `&`, `|`, and `^` JavaScript bitwise operators have been renamed to `and`, `or`, and `xor`.  Changing these from symbols to words frees up symbols to be used for more commonly used operations, and when you need the bitwise operators, `and`, `or`, and `xor` are still short, descriptive keywords.

### Labels

Labels don't need their own colon.  The one that precedes a block is all that's needed.

    var a;
    foo :{
        a = 1;
        break foo;
        a = 2;
    }
    assert(a === 1);

### Parentheses Required in `new` Expression

The form `new Foo;` is not permitted in Proto. Parentheses are required: `new Foo();`.

## Other

### Inheritable Built-Ins

In ES5, the built-ins aren't inheritable (while keeping their original fucntionality).  For example:

	var d = new Date(2014, 01, 01);
	var d2 = Object.create(d);

	d.getFullYear();  // => 2014
	d2.getFullYear(); // => TypeError: this is not a Date object.

As another example, objects which inherit functions aren't callable.

	var f = function() { return 'foo'; };
	var g = Object.create(f);

	g(); // => TypeError: object is not a function

In Proto, built-ins continue to keep their qualities when inherited:

	var f = () :{ return 'foo'; };
	var g = like f;

	g(); // => "foo"

#### Empty Object Prototype

Adding propreties and methods to `Object.prototype` has its uses, but they can also get in the way and encourage code which has poor integrity.  For instance, relying on `Object.prototype.hasOwnProperty` may be a bad idea in highly abstracted projects because not all objects inherit from `Object.prototype` in ES5.  ES5 itself started moving in a good direction by putting functions on `Object` rather than methods on `Object.prototype` (`create`, `defineProperty`, `getOwnPropertyNames`, etc).  ES6 is moving further in that direction with the `Reflect` module (which will have a `hasOwn` function for a high-integrity version of `Object.prototype.hasOwnProperty`).

Proto's `Object` prototype has no properties or methods by default -- it starts out as a clean slate.  For flexibility, it can be modified to extend generic objects, but that's left up to the developer's own preferences.