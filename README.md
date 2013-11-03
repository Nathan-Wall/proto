# Proto

Proto is a programming language based on JavaScript that compiles to JavaScript.  It emphasizes *prototypal programming*, *integrity*, and *extensive, disambiguated syntax*.  It is currently in active development and highly experimental.

Proto uses ECMAScript 6 as its foundation and compiles to ECMAScript 5.

## Motivation

Fun.  I wanted to play around with some experimental ideas, particularly many of the proposals that can't go into JavaScript because of backwards compatibilty problems.

## Use

	npm install protolang

In a JS project:

	var proto = require('protolang');

	var jsSource = proto.transpile(protoSource);
	// ...

There is also a `tools/` directory with a command-line compiler (`protoc`) and a simple server (`server`).

### Command-Line Compiler

	$ node protoc /path/to/file.proto

This will output the transpiled JavaScript to stdout.  You can pipe it elsewhere or redirect it to a file using your OS pipes and redirects.

### Simple Proto->JS Server

	$ node server /path/to/root/dir --port 3000
	Server running on port 3000

This simple server can be useful when developing Proto scripts so that you don't have to constantly compile them.  It will *only* serve `.proto` files and it will transpile them to JavaScript on the fly.

## Getting Started

Please see the following links for more information on Proto.

+ [Explanation of Design Decisions](DESIGN.md)
+ [Descriptive Overview of Differences With JavaScript](OVERVIEW.md)
+ [Side-By-Side Comparison With JavaScript](VS-JS.md)