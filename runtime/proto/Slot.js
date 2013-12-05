var SlotProto = CreatePrototype({

	init: function init(value) {
		SlotInit(this, value, false);
	}

});

function CreateSlot(proto, value, rest) {
	var obj;
	if (proto === undefined)
		proto = SlotProto;
	if (!IsObject(proto))
		throw new TypeError('Object expected');
	obj = CreateObject(proto);
	SlotInit(obj, value, rest);
	return obj;
}

function SlotInit(obj, value, rest) {
	if (value === undefined)
		value = null;
	else if (value !== null && !(IsObject(value) && 'Iterator' in value)) {
		value = ToNumber(value);
		// This check is because `(-0) | 0` is `+0`
		if (value != 0)
			value = value | 0;
	}
	obj.Slot = value;
	obj.RestSlot = rest;
}