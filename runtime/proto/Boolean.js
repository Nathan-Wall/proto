var BooleanProto = CreatePrototype({

	'@ToComparable': function toComparable() {
		return ToBoolean(this);
	}

});

function CreateBoolean(proto, value) {
	var v = ToBoolean(value);
	if (proto === undefined)
		proto = BooleanProto;
	var obj = CreateObject(proto);
	obj.BooleanValue = v;
	return obj;
}

function ToBoolean(value) {
	var v;
	if (IsWrapper(value)) {
		if ('ToBoolean' in value)
			return !!Call(value.ToBoolean, value, [ ]);
		if ('BooleanValue' in value)
			return !!value.BooleanValue;
		return true;
	}
	else
		return !!value;
}