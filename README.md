# Proto

Proto is a programming language that compiles to JavaScript.  It emphasizes *prototypal programming*, *high integrity*, and *fluent, disambiguated syntax*.  It is currently in active development and highly experimental.

Proto compiles to ECMAScript 5.  It uses ECMAScript 6 as a foundation, but deviates significantly -- even replacing the meta-object protocol.  Though Proto is *like* JavaScript, Proto is *not JavaScript*.  Unlike CoffeeScript, Proto is not simply syntactic changes layered into the JavaScript language -- it fundamentally differs in many aspects of the language.

## Documentation

To learn about the Proto language, please [see the documentation](https://github.com/Nathan-Wall/proto/blob/master/docs/index.md).

## Use

	npm install protolang

In a JS project:

	var proto = require('protolang');

	var jsSource = proto.compile(protoSource);
	// ...

There is also a `tools/` directory with a command-line compiler (`protoc`) and a simple server (`server`).

### Command-Line Compiler

	$ node protoc /path/to/file.proto

This will output the compiled JavaScript to stdout.  You can pipe it elsewhere or redirect it to a file using your OS pipes and redirects.

### Simple Proto->JS Server

	$ node server /path/to/root/dir --port 3000
	Server running on port 3000

This simple server can be useful when developing Proto scripts so that you don't have to constantly compile them.  It will *only* serve `.proto` files and it will compile them to JavaScript on the fly.

### Contributions

If you would like to contribute, [see the code guide](https://github.com/Nathan-Wall/proto/blob/master/code-guide.md).