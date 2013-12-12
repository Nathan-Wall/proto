var StringProto = CreatePrototype({

	init: function(value) {
		if (!IsObject(this))
			throw new TypeError('Object expected');
		if (value === undefined)
			value = '';
		else
			value = ToString(value);
		for (var i = 0; i < value.length; i++) {
			define(this.Value, i, {
				value: value[i],
				enumerable: true,
				writable: false,
				configurable: false
			});
		}
		define(this.Value, 'length', {
			value: value.length,
			enumerable: false,
			writable: false,
			configurable: false
		});
	}

});

function CreateString(proto, value) {
	var v = ToString(value);
	if (proto === undefined)
		proto = StringProto;
	var obj = CreateObject(proto);
	obj.StringValue = v;
	return obj;
}

function ToString(value) {
	var v;
	if (IsWrapper(value)) {
		if ('ToString' in value)
			return String(Call(value.ToString, value, [ ]));
		if ('StringValue' in value)
			return String(value.StringValue);
		if (IsObject(value))
			return '[Object]';
		return '[???]';
	}
	else if (value === null || value === undefined)
		return '';
	else
		return String(value);
}