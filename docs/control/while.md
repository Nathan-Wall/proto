# Proto

## `while`

Proto's `while` loop is just like JavaScript's but without the parentheses and the condition is followed by either `:` indicating a single statement or `:{` indicating a code block.

	var x = 1;
	while x < 100 :{
		x *= 5;
		console.log(x);
	}

	// Logs:
	// 5
	// 25
	// 125

### `do`

Proto also supports a `do..while` loop.

	var x = 1;
	do :{
		x *= 5;
		console.log(x);
	} while x < 100;

	// Logs:
	// 5
	// 25
	// 125
