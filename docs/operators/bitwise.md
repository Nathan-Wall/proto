# Proto

## Bitwise Operators

Proto supports the following bitwise operators:

<table>
<tr><th>bitwise AND</th>
<td>`a and b`</td>
<td></td></tr>
<tr><th>bitwise OR</th>
<td>`a or b`</td>
<td></td></tr>
<tr><th>bitwise XOR</th>
<td>`a xor b`</td>
<td></td></tr>
<tr><th>bitwise NOT</th>
<td>`not a`</td>
<td></td></tr>
<tr><th>left shift</th>
<td>`a lsh b`</td>
<td>Shifts `a` to the left by `b` bits</td></tr>
<tr><th>right shift</th>
<td>`a rsh b`</td>
<td>Shifts `a` to the right by `b` bits, preserving sign</td></tr>
<tr><th>unsighed right shift</th>
<td>`a ursh b`</td>
<td>Shifts `a` to the right by `b` bits, as an unsigned int</td></tr>
</table>

These operators have keywords in Proto, rather than symbols like in JavaScript, so that the symbols can be free for other uses.

All bitwise operators coerce operands to 32 bit integers before performing the calculation.