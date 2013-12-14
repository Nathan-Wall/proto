# Proto

## Inheritance

Object inherit directly from other objects through prototypal inheritance.  Proto encourages setting up prototypal relationships.

### `like`

#### Setting an object's prototype

An object's prototype can be set when it is created using the `like` operator.

	var A = {
		foo: 1
	};

	var B = like A;

	console.log(B.foo); // 1

In the example above, `B` inherits from `A`.

#### Checking inheritance

Whether an object inherits from another object can be determined with the binary form of the `like` operator.

	var A = { }, B = like A;

	console.log(B like A); // true
	console.log(B like Object); // true
	console.log([ ] like Array); // true
	console.log({ } like Object); // true

The `like` operator determines if the right operand is in the prototype chain of the left operand.  It does not work the other way around.

	var A = { }, B = like A;

	console.log(A like B); // false
	console.log(Object like B); // false
	console.log(Array like [ ]); // false
	console.log(Object like { }); // false

### `new`

Proto tries to encourage thinking of how objects relate to other objects.  Even though JavaScript uses prototypal inheritance, JavaScript's `new` operator works on constructor functions, and this has the unfortunate effect of leading many people to think of objects as instances of classes.

In Proto, the `new` operator does *not* take a constructor function as its operand.  Rather it takes an object to use as the prototype for the object being created.  That's exactly the same thing `like` does.  However, `new` also calls the new object's `init` method (if one exists).

	var Person = :{
		sym @firstName, @lastName;
		{
			init: fn(firstName, lastName) :{
				this.@firstName = firstName;
				this.@lastName = lastName;
			},
			get name :{
				return this.@firstName & ' ' & this.@lastName;
			}
		};
	}

	var Employee = :{
		sym @title;
		like Person := {
			init: fn(firstName, lastName, title) :{
				this::Person.init(firstName, lastName);
				this.@title = title;
			},
			get title :{
				return this.@title;
			}
		};
	}

	var richard = new Employee('Richard', 'Feynman', 'professor');

	console.log(richard.name);  // 'Richard Feynman'
	console.log(richard.title); // 'professor'

	console.log(richard like Employee); // true
	console.log(richard like Person); // true
