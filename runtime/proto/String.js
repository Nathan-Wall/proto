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