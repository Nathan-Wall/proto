// Some of the functions used in binary operations are defined elsewhere, such
// as `Is`, `Like`, and `Has`.
// TODO: What's the best way to organize this stuff? Is the current way fine,
// or is there a better way?

function ToComparable(value) {
	if (!IsWrapper(value))
		return value;
	if (Has(value, $$toComparable))
		return Call(Get(value, $$toComparable), value);
	throw new TypeError('Value is not comparable');
}

function Equals(left, right) {
	return ToComparable(left) == ToComparable(right);
}

function LessThan(left, right) {
	return ToComparable(left) < ToComparable(right); 
}

function GreaterThan(left, right) {
	return ToComparable(left) > ToComparable(right);
}

function LessThanOrEqual(left, right) {
	return ToComparable(left) <= ToComparable(right);
}

function GreaterThanOrEqual(left, right) {
	return ToComparable(left) >= ToComparable(right);
}

function Concatenate(left, right) {
	return ToString(left) + ToString(right);
}

function Add(left, right) {
	return ToNumber(left) + ToNumber(right);
}

function Subtract(left, right) {
	return ToNumber(left) - ToNumber(right);
}

function Multiply(left, right) {
	return ToNumber(left) * ToNumber(right);
}

function Divide(left, right) {
	return ToNumber(left) / ToNumber(right);
}

function Modulus(left, right) {
	return ToNumber(left) % ToNumber(right);
}

function BitAnd(left, right) {
	return ToUint32(left) & ToUint32(right);
}

function BitOr(left, right) {
	return ToUint32(left) | ToUint32(right);
}

function BitXor(left, right) {
	return ToUint32(left) ^ ToUint32(right);
}

function BitRsh(left, right) {
	return ToUint32(left) >> ToUint32(right);
}

function BitUrsh(left, right) {
	return ToUint32(left) >>> ToUint32(right);
}

function BitLsh(left, right) {
	return ToUint32(left) << ToUint32(right);
}
