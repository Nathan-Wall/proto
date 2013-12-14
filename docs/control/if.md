# Proto

## `if`

Proto's `if` doesn't require parentheses and the condition is followed by either `:` indicating a single consequent statement or `:{` indicating a code block as the consequent.

	var foo = 'bar';

	if foo == 'bar':
		console.log('ok!');

	if foo == 'bar' :{
		console.log('ok1');
		console.log('ok2');
	}

## `else`

`else` is similar.

	var foo = 'bing';

	if foo == 'bar':
		console.log('nope');
	else if foo == 'baz':
		console.log('not here either');
	else:
		console.log('ok');