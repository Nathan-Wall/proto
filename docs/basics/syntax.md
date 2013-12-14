# Proto

## Syntax

Proto syntax is very similar to JavaScript with a few modifications.

### Semicolons are required.

Automatic semi-colon insertion (ASI) has caused some problems in evolving the JavaScript language because it prevents certain forms from entering the language due to backwards compatibility concerns.  It can also cause some confusing bugs.  To alleviate ambiguities, Proto requires semi-colons.

### Parentheses are relaxed

Proto removes some of JavaScript's requirements for parentheses.  Compare the following forms:

	// JavaScript
	if (foo === 'bar') {
		baz();
	}

	// Proto
	if foo == 'bar' :{
		baz();
	}

	// JavaScript (ES6)
	for (var key of keys) {
		bar(key);
	}

	// Proto
	for key of keys :{
		bar(key);
	}

	// JavaScript
	while (x > 1) {
		x--;
	}

	// Proto
	while x > 1 :{
		x--;
	}

(As seen above, blocks start with `:{` in Proto.  This is explained below.)

You may only put a colon (without the curly bracket) if only one statement follows.

	// JavaScript
	if (foo === 'bar')
		baz();
	bing();

	// Proto
	if foo == 'bar':
		baz();
	bing();

Parentheses are also relaxed when creating a function.  If a function doesn't have parameters, parentheses are not required when it's being defined.

	fn foo(a, b) :{
		// This is a function that has two parameters.
	}

	fn bar :{
		// This is a function that doesn't have any parameters.
	}

	var obj = {
		baz: fn(c) :{
			// This method has one parameter.
		},
		bing: fn :{
			// This method doesn't have any parameters.
		}
	};

### Blocks start with `:{`.

In JavaScript, the `{` token is ambiguous: it starts both a block body and an object literal.  Proto requires a colon before the opening curly bracket for blocks to disambiguate these forms.

	if foo == 'bar' :{
		baz();
	}

Perhaps this change requires some explanation.  There are a few motivations behind this decision.  Sometimes in JavaScript, and increasingly in ECMAScript 6, blocks must be distinguished from objects by wrapping objects in parentheses.

For example, the following arrow function form from ES6 is a syntax error:

	// JavaScript (ES6)
	array.map((item, i) => { name: item, index: i });
	// SyntaxError!

The reason it's a syntax error is because the parser thinks you're trying to specify a block, but you provided an invalid block.  Worse yet, if your attempt at making an object actually looks like it could be a block, you don't even get an early error.

	// JavaScript (ES6)
	array.map(item => { name: item });
	// Oops! Silent bug!

This will return an array full of `undefined`s because you actually have a block with label `name` and no return value.  In order to have it parsed as an object, you must wrap it in parentheses.

	// JavaScript (ES6)
	array.map(item => ({ name: item }));
	// Works!

Another example where parentheses are required around a block is in destructuring assignment outside of a variable declaration.

	// JavaScript (ES6)
	var a = 1, b = 2;
	for (var i = 0; i < 10; i++)
		({ a, b }) = computeNext(a, b);

In order for the destructuring pattern above to work, the block must be wrapped in parentheses so that the parser doesn't think it's supposed to be a code block.

By using a different token to begin blocks, Proto avoids this kind of problem, and doesn't ever require wrapping blocks in useless parentheses.  We also hope to one day make something like blocks-as-expressions or block lambdas possible, and making blocks easy for the parser to distinguish from objects paves the way for several exciting possibilities.
