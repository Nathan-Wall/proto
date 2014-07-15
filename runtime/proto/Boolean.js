var BooleanProto = CreatePrototype({

	'@@toComparable': function toComparable() {
		return ToBoolean(this);
	}

});

function CreateBoolean(proto, value) {
	var v = ToBoolean(value);
	if (proto === undefined)
		proto = BooleanProto;
	var obj = CreateObject(proto);
	Set(obj, $$booleanValue, v);
	return obj;
}

function ToBoolean(value) {
	var v;
	if (IsWrapper(value)) {
		if (Has(value, $$toBoolean))
			return !!Call(Get(value, $$toBoolean), value, [ ]);
		if (Has(value, 'BooleanValue'))
			return !!Get(value, $$booleanValue);
		return true;
	}
	else
		return !!value;
}