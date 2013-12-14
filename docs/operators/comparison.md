# Proto

## Comparison Operators

### Binary Operators

<table>
<tr><th>strict equals</th>
<td>`a == b`</td>
<td>`true` if type *and* value are the same; `false` otherwise</td></tr>
<tr><th>strict equals negation</th>
<td>`a != b`</td>
<td>The opposite of strict equals</td></tr>
<tr><th>loose equals</th>
<td>`a ~= b`</td>
<td>For primitives (excluding symbols), does the same as JavaScript's `==`. For objects, coerces to a primivite using the object's `@toComparable` method, if available. If value cannot be compared, throws an exception.</td></tr>
<tr><th>loose equals negation</th>
<td>`a !~= b`</td>
<td>The opposite of loose equals</td></tr>
<tr><th>same value</th>
<td>`a is b`</td>
<td>Determines of the operands are the *same value*. This is exactly the same as strict equals with two exceptions: `0` and `NaN`.  While `+0 == -0` is `true`, `+0 is -0` is `false`.  And while `NaN == NaN` is `false`, `NaN is NaN` is `true`.</td></tr>
<tr><th>same value negation</th>
<td>`a !is b`</td>
<td>The opposite of same value</td></tr>
<tr><th>less than</th>
<td>`a &lt; b`</td>
<td></td></tr>
<tr><th>greater than</th>
<td>`a > b`</td>
<td></td></tr>
<tr><th>less than or equal to</th>
<td>`a &lt;= b`</td>
<td></td></tr>
<tr><th>greater than or equal to</th>
<td>`a &gt;= b`</td>
<td></td></tr>
</table>

Note that `==` in Proto is the same as JavaScript's `===`.  Proto provides `~=` as a similar operator to JavaScripts `==` (though there are some differences when objects are the operands).

Also note that `is` in Proto is the same as ECMAScript 6's `Object.is` function.

For the `<`, `<=`, `>`, and `>=` operators, object operands are coerced with `@toComparable`.

### Unary Operators

Like JavaScript, `!` can be placed before an expression to negate it.

	if !(a < b && c < d) :{
		// ...
	}

The above is loosely equivalent to (except with a `NaN` operand):

	if a >= b || c >= d :{
		// ...
	}