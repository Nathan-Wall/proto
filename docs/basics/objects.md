# Proto

## Objects

Objects can be created using an object literal syntax which is very similar to JavaScript's object literal syntax (and includes the enhancements added in ECMAScript 6).

	var obj = {
		foo: 1,
		bar: 2,
		baz: 'bing'
	};

### Getters and Setters

Getters and setters can be declared using this syntax with the keywords `get` and `set` followed by a space.

	var Person = {

		// A method
		init: fn(name) :{
			this.name = name;
		},

		// Public properties
		firstName: nil,
		lastName: nil,

		// A getter
		get name :{
			return this.firstName & ' ' & this.lastName;
		},

		// A setter
		set name(value | string) :{
			var r = value.split(' ');
			if r.length != 2:
				throw new Error('First and last name expected');
			this.firstName = r[0];
			this.lastName = r[1];
		}

	};

	var kip = new Person('Kip Thorne');
	console.log(kip.firstName); // 'Kip'
	console.log(kip.lastName);  // 'Thorne'
	console.log(kip.name);      // 'Kip Thorne'
	kip.lastName = 'Wheeler';
	console.log(kip.name);      // 'Kip Wheeler'

### Symbols

Symbols can be used as property names in object literal syntax.

	sym @noise;
	var Animal = {
		@noise: nil,
		speak: fn :{
			return this.@noise;
		}
	};

	var Duck = like Animal := {
		@noise: 'Quack!'
	};

	var roger = new Duck();
	console.log(roger.speak()); // 'Quack!'

### Static Properties

Properties can be declared to be `static`.  Static properties are not inherited.

	var A = {
		foo: 1,
		static bar: 2
	};
	console.log(A.foo); // 1
	console.log(A.bar); // 2

	var B = like A;
	console.log(B.foo); // 1
	console.log(B.bar); // [nil]
