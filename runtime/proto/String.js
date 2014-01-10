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
		this.StringValue = value;
	},

	lower: function() {
		return toLowerCase(ToString(this));
	},

	upper: function() {
		return toUpperCase(ToString(this));
	}

});

// TODO: Is this used?  Should it be used? I think there should instead be
// a StringInit function.
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