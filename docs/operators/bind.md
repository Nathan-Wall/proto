# Proto

## Bind Operator

The bind operator `::` can be used to bind an object to a function.

	fn sayHello :{
		console.log('Hi, my name is ' & this.name);
	}

	var mark = {
		name: 'Mark'
	};

	var sayHelloAsMark = mark::sayHello;

	sayHelloAsMark(); // 'Hi, my name is Mark'

It can be used directly during a function call as well:

	fn sayHello :{
		console.log('Hi, my name is ' & this.name);
	}

	var mark = {
		name: 'Mark'
	};

	mark::sayHello(); // 'Hi, my name is Mark'

Without a left operand, it can be used to extract a method which is bound to its object.

	var obj = {
		foo: fn: this.bar + 1,
		bar: 5
	};

	var f = ::obj.foo;

	console.log(f()); // 6