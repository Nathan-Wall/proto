var SlotProto = CreatePrototype({

	init: function init(value) {
		SlotInit(this, value, false);
	},

	'@@toNumber': function ToNumber() {
		ExpectObject(this);
		if (!Has(this, $$slot))
			throw new Error('Slot expected');
		var slot = Get(this, $$slot);
		if (Has(this, $$restSlot)
		|| slot === null
		|| typeof slot != 'number')
			return NaN;
		return +slot;
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
	else if (value !== null && !(IsObject(value) && Has(value, $$iterator))) {
		value = ToNumber(value);
		// This check is because `(-0) | 0` is `+0`
		if (value != 0)
			value = value | 0;
	}
	Set(obj, $$slot, value);
	Set(obj, $$restSlot, rest);
}