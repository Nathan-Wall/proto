var StringProto = CreatePrototype({

	init: function(value) {
		ExpectObject(this);
		if (value === undefined)
			value = '';
		else
			value = ToString(value);
		for (var i = 0; i < value.length; i++)
			Define(this, 'value', i, value[i], false, false, false);
		Define(this, 'value', 'length', false, false, false);
		Set(this, $$stringValue, value);
	},

	lower: function() {
		return toLowerCase(ToString(this));
	},

	upper: function() {
		return toUpperCase(ToString(this));
	},

	substring: function(from, to) {
		var S = ToString(this);
		if (Is(from, -0))
			from = S.length;
		if (Is(to, -0))
			to = S.length;
		return stringSlice(S, from, to);
	},

	repeat: function(count) {
		var S = ToString(this);
		return join(new Array(+count + 1), S);
	},

	split: function(delim) {
		var S = ToString(this);
		return CreateArray(undefined, split(this, delim));
	},

	trim: function() {
		return trim(ToString(this));
	}

});

// TODO: Is this used?  Should it be used? I think there should instead be
// a StringInit function.
function CreateString(proto, value) {
	var v, obj;
	v = ToString(value);
	if (proto === undefined)
		proto = StringProto;
	obj = CreateObject(proto);
	Set(obj, $$stringValue, v);
	return obj;
}

function ToString(value) {
	var v;
	if (IsWrapper(value)) {
		if (Has(value, $$toString))
			return String(CallMethod(value, $$toString));
		if (Has(value, $$stringValue))
			return String(Get(value, $$stringValue));
		if ('ProxyJs' in value)
			return String(value.Value);
		if (IsObject(value))
			return '[Object]';
		return '[???]';
	}
	else if (value === null || value === undefined)
		return '';
	else
		return String(value);
}
