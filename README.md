# Proto

Proto is a programming language based on JavaScript that compiles to JavaScript.  It emphasizes *prototypal programming*, *integrity*, and *extensive, disambiguated syntax*.  It is currently in active development and highly experimental.

## Motivation

Fun.  I wanted to play around with some experimental ideas, particularly many of the proposals that can't go into JavaScript because of backwards compatibilty problems.

## Prototypal Programming

I've taken ideas explored in [simile](https://github.com/Nathan-Wall/simile) and built them into the language.

JavaScript has a weird mix between using constructor-based object creation and prototypal inheritance.  Its prototypal inheritance system invites you to think of building correlations between objects that are similar.  However, its extensive use of constructors as a medium for object creation often drives people in the direction of thinking in terms of classes.  Constructors become "classes" that define common behavior for similar kinds of objects.

Instead, Proto minimizes the role of constructors in the language, giving them a back seat, and encourages thinking about objects-as-prototypes.  It exposes syntactic and library support to make using ES5's `Object.create` easier and more intuitive.

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

`new` is `like` + `init`.  It creates a new object based ona prototype and then calls its `init` method.

(Two other things you may note from this example are that Proto supports [ES6 method definitions](http://ariya.ofilabs.com/2013/03/es6-and-method-definitions.html) and a disambiguted [concatenation operator](#concatenation) `&`.)

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

(See also [High Integrity JavaScript](http://www.youtube.com/watch?v=FrFUI591WhI).)

JavaScript is a very flexible and dynamic language.  Proto aims to be flexible and dynamic as well.  However, in JavaScript this comes with a price.  Although it's possible to achieve a certain amount of integrity in JavaScript, it requires a certain amount of effort and awkward constructs.  One of Proto's goals is to make integrity easily achievable with syntactic support.

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

### Own Operator (`#`)

`#` is the *own* operator.  It simplifies working with the own properties of an object (rather than inherited properties).

#### Unary `#`

As a unary operator, it takes an object as its right operand and essentially returns that object without its prototype chain.

##### Use In Dictionaries

In JavaScript, it's common to use objects as dictionaries.  However, there are some problems with using regular objects as dictionaries because clashes could occur between entries and properties on `Object.prototype`.

ES5 made it possible to create objects without a prototype by using `Object.create(null)`.  There are plans for ES6 to make this easier with [dicts](http://wiki.ecmascript.org/doku.php?id=harmony:modules_standard).  Proto provides the `#` operator to encourage making creating prototypeless objects common.

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

One design principles behind Proto is that the human brain is a very powerful computer.  One of its primary purposes is parsing and understanding grammar, syntax, and vocabulary, which it often uses for human language.

Therefore, proto expands and modifies JavaScripts syntax extensively.  I expect that this may make Proto intimidating and harder to learn.  But I also expect that once the brain learns and adjusts to a set of rules, code readability can be increased by moving less important details behind small syntactic symbols, allowing the important parts of code to stand out more clearly.

Syntax has also been modified to remove ambiguity and make the language more extensible.  There have been many proposals brought before ECMAScript that simply don't make the cut because of backwards compatibility reasons and ambiguity in ES syntax.  Proto alleviates ambiguity where it can help readability, prevent bugs, or make the language more extensible.

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

### Blocks (`:{`)

While blocks in JavaScript start with the same character as object literals (`{`), proto distinguishes the two by putting a colon before the opening curly bracket for a block (`:{`).

<table>
<tr><th>JavaScript</th><th>Proto</th></tr>
<tr><td>
```js
if (a == b) {
    // ...
} else {
    // ...
}
```
</td>
<td>
```
if (a == b) :{
    // ...
} else :{
    // ...
}
```
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

#### Labels

Labels don't need their own colon.  The one that precedes a block is all that's needed.

    var a;
    foo :{
        a = 1;
        break foo;
        a = 2;
    }
    assert(a === 1);

#### Parentheses Required in `new` Expression

The form `new Foo;` is not permitted in Proto. Parentheses are required: `new Foo();`.