var NumberProto = CreatePrototype({

	init: function(value) {
		ExpectObject(this);
		if (value === undefined)
			value = '';
		else
			value = ToNumber(value);
		this.NumberValue = value;
	},

	toString: function(radix) {
		return numberToString(ToNumber(this), radix);
	}

});

function CreateNumber(proto, value) {
	var v = ToNumber(value);
	if (proto === undefined)
		proto = NumberProto;
	var obj = CreateObject(proto);
	obj.NumberValue = v;
	return obj;
}

function ToNumber(value) {
	var v;
	if (IsWrapper(value)) {
		if ('ToNumber' in value)
			return +Call(value.ToNumber, value, [ ]);
		if ('NumberValue' in value)
			return +value.NumberValue;
		return NaN;
	}
	else if (value === null || value === undefined)
		return 0;
	else
		return +value;
}

function ToUint32(argument) {
	var number = ToNumber(argument);
	if (number < 0)
		return 0;
	if (number > MAX_UINT)
		return MAX_UINT;
	return number >>> 0;
}

function ToInteger(argument) {
	var number = ToNumber(argument);
	if (number !== number)
		return 0;
	if (number == 0 || number == Infinity || number == -Infinity)
		return number;
	return sign(number) * floor(abs(number));
}

function ToLength(argument) {
	var len = ToInteger(argument);
	if (len <= 0)
		return 0;
	return min(len, MAX_PRECISION - 1);
}

function ToIndex(argument, length, toInt) {
	if (toInt === undefined)
		toInt = true;
	var coercive = toInt ? ToInteger : ToNumber,
		i = coercive(argument);
	if (sign(i) == -1)
		return coercive(length) - 1 + i;
	else
		return i;
}

function sign(argument) {
	var number = +argument;
	if (number > 0)
		return 1;
	else if (number < 0)
		return -1;
	else if (number !== number)
		return 0;
	else if (1 / number > 0)
		return 1;
	else if (1 / number < 0)
		return -1;
	else
		throw new Error('Unexpected value');
}

function Pow(left, right) {
	left = ToNumber(left);
	right = ToNumber(right);
	return pow(left, right);
}