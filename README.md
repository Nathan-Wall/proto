# Proto

Proto is a programming language that compiles to JavaScript.  It emphasizes *prototypal programming*, *high integrity*, and *fluent, disambiguated syntax*.  It is currently in active development and highly experimental.

Proto compiles to ECMAScript 5.  It uses ECMAScript 6 as a foundation, but deviates significantly -- even replacing the meta-object protocol.  Though Proto is *like* JavaScript, Proto is *not JavaScript*.  Unlike CoffeeScript, Proto is not simply syntactic changes layered into the JavaScript language -- it fundamentally differs in many aspects of the language.

## Documentation

To learn about the Proto language, please [see the documentation](https://github.com/Nathan-Wall/proto/blob/master/docs/index.md).

## Use

(Note: The npm version is currently sorely out of date. For the latest, you'll need to clone from github.)

	npm install protolang -g

In a JS project:

	var proto = require('protolang');

	var jsSource = proto.compile(protoSource);
	// ...

There is also a `tools/` directory with a command-line compiler (`protoc`) and a simple server (`server`).

### Command-Line Compiler

	$ node protoc /path/to/file.pr

This will output the compiled JavaScript to stdout.  You can pipe it elsewhere or redirect it to a file using your OS pipes and redirects.

### Simple Proto->JS Server

	$ node server /path/to/root/dir --port 3000
	Server running on port 3000

This simple server can be useful when developing Proto scripts so that you don't have to constantly compile them.  It will *only* serve `.proto` files and it will compile them to JavaScript on the fly.

### Contributions

If you would like to contribute, [see the code guide](https://github.com/Nathan-Wall/proto/blob/master/code-guide.md).

---

<p xmlns:dct="http://purl.org/dc/terms/" xmlns:vcard="http://www.w3.org/2001/vcard-rdf/3.0#">
    <a rel="license"
       href="http://creativecommons.org/publicdomain/zero/1.0/">
        <img src="http://i.creativecommons.org/p/zero/1.0/88x31.png" style="border-style: none;" alt="CC0" />
    </a>
    <br />
    To the extent possible under law,
    <a rel="dct:publisher" href="http://github.com/Nathan-Wall"><span property="dct:title">Nathan Wall</span></a>
    has waived all copyright and related or neighboring rights to
    <span property="dct:title">Proto</span>.

    This work is published from:
    <span property="vcard:Country" datatype="dct:ISO3166" content="US">
      United States
    </span>.
</p>