# Proto vs JavaScript

This is a quick comparison that highlights many of the key differences between JavaScript and Proto.

<table>
<tr><th></th><th>JavaScript</th><th>Proto</th></tr>

<tr>
<td>prototype</td>
<td><div class="highlight highlight-js"><pre>
var A = { },
	B = Object.create(A);
</pre></div></td>
<td><div class="highlight"><pre>
var A = { },
	B = like A;
</pre></div></td>
</tr>

<tr>
<td>inheritance checking</td>
<td><div class="highlight highlight-js"><pre>
// A is a constructor
B instanceof A
</pre></div>
or
<div class="highlight highlight-js"><pre>
// A and B are both objects
A.isPrototypeOf(B)
</pre></div>
</td>
<td><div class="highlight"><pre>
// A and B are both objects
B like A
</pre></div></td>
</tr>

<tr>
<td>mixin</td>
<td><div class="highlight highlight-js"><pre>
// ES6
Object.mixin(obj, {
	foo() { /* ... */ },
	bar() { /* ... */ } 
});
</pre></div></td>
<td><div class="highlight"><pre>
obj := {
	foo() { /* ... */ },
	bar() { /* ... */ }
};
</pre></div></td>
</tr>

<tr>
<td>bind</td>
<td><div class="highlight highlight-js"><pre>
var bobSayName = sayName.bind(bob);
</pre></div></td>
<td><div class="highlight"><pre>
var bobSayName = bob::sayName;
</pre></div></td>
</tr>

<tr>
<td>call</td>
<td><div class="highlight highlight-js"><pre>
sayName.call(bob, a, b, c);
</pre></div></td>
<td><div class="highlight"><pre>
bob::sayName(a, b, c);
</pre></div></td>
</tr>

<tr>
<td>apply</td>
<td><div class="highlight highlight-js"><pre>
sayName.apply(bob, args);
</pre></div></td>
<td><div class="highlight"><pre>
bob::sayName(...args);
</pre></div></td>
</tr>

<tr>
<td>blocks</td>
<td><div class="highlight highlight-js"><pre>
if (a == b) {
    // ...
}
</pre></div></td>
<td><div class="highlight"><pre>
if (a == b) :{
    // ...
}
</pre></div></td>
</tr>

<tr>
<td>labels</td>
<td><div class="highlight highlight-js"><pre>
foo: {
	// ...
	break foo;
	// ...
}
</pre></div></td>
<td><div class="highlight"><pre>
foo :{
	// ...
	break foo;
	// ...
}
</pre></div></td>
</tr>

<tr>
<td>function definitions</td>
<td><div class="highlight highlight-js"><pre>
function foo(a, b) {
	// ...
}
</pre></div></td>
<td><div class="highlight"><pre>
fn foo(a, b) :{
	// ...
}
</pre></div></td>
</tr>

<tr>
<td>function expressions</td>
<td><div class="highlight highlight-js"><pre>
elem.onclick = function foo(a, b) {
	// ...
};
</pre></div></td>
<td><div class="highlight"><pre>
elem.onclick = foo(a, b) :{
	// ...
};
</pre></div></td>
</tr>

<tr>
<td>arrows</td>
<td><div class="highlight highlight-js"><pre>
// ES6
[ 'a', 'b', 'c' ].map(u => u.charCodeAt(0));
</pre></div></td>
<td><div class="highlight"><pre>
[ 'a', 'b', 'c' ].map(u -> u.charCodeAt(0));
</pre></div>
or
<div class="highlight"><pre>
[ 'a', 'b', 'c' ].map(u => u.charCodeAt(0));
</pre></div></td>
</tr>

<tr>
<td>dictionaries</td>
<td><div class="highlight highlight-js"><pre>
var dict = Object.create(null);
dict.foo = 1;
dict.bar = 2;
</pre></div></td>
<td><div class="highlight"><pre>
var dict = #{
	foo: 1,
	bar: 2
};
</pre></div></td>
</tr>

<tr>
<td>get own</td>
<td><div class="highlight highlight-js"><pre>
var bar;
if (foo.hasOwnProperty('bar'))
	bar = foo.bar;
</pre></div></td>
<td><div class="highlight"><pre>
var bar = foo#bar;
</pre></div></td>
</tr>

<tr>
<td>set own</td>
<td><div class="highlight highlight-js"><pre>
if (foo.hasOwnProperty('bar'))
	foo.bar = value;
else
	Object.defineProperty(foo, 'bar', {
		value: value,
		writable: true,
		enumerable: true,
		configurable: true
	});
</pre></div></td>
<td><div class="highlight"><pre>
foo#bar = value;
</pre></div></td>
</tr>

<tr>
<td>has own</td>
<td><div class="highlight highlight-js"><pre>
foo.hasOwnProperty('bar')
</pre></div></td>
<td><div class="highlight"><pre>
'bar' in #foo;
</pre></div></td>
</tr>

<tr>
<td>checking properties</td>
<td><div class="highlight highlight-js"><pre>
var baz;
var item = getItem();
if (item &amp;&amp; item.foo &amp;&amp; item.foo.bar)
	baz = item.foo.bar.baz;
</pre></div></td>
<td><div class="highlight"><pre>
var baz = getItem().foo.bar.baz;
</pre></div></td>
</tr>

<tr>
<td>bitwise operators</td>
<td><div class="highlight highlight-js"><pre>
print(a &amp; b);
print(c | d);
print(e ^ f);
print(~g);
</pre></div></td>
<td><div class="highlight"><pre>
print(a and b);
print(c or d);
print(e xor f);
print(not g);
</pre></div></td>
</tr>

<tr>
<td>string concatenation</td>
<td><div class="highlight highlight-js"><pre>
var a = 4, b = 5;
print(a + '' + b);
</pre></div>
or
<div class="highlight highlight-js"><pre>
print(String(a) + String(b));
</pre></div></td>
<td><div class="highlight"><pre>
var a = 4, b = 5;
print(a &amp; b);
</pre></div></td>
</tr>

<tr>
<td>inheriting built-ins</td>
<td><div class="highlight highlight-js"><pre>
// ES6
class List extends Array {
	// ...
}
</pre></div></td>
<td><div class="highlight"><pre>
var List = like Array := {
	// ...
};
</pre></div></td>
</tr>

<tr>
<td>inheriting instances of built-ins</td>
<td>Not possible in ES5. Quite difficult in ES6.</td>
<td><div class="highlight"><pre>
fn foo() :{
	// ...
}
var bar = like foo;
bar(); // bar is callable
</pre></div></td>
</tr>

</table>