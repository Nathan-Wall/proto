var SymbolProto = CreatePrototype({

	// The suffixes on the function names are because some of them call external
	// functions of the same name (e.g. hasOwn_ calls hasOwn).
	'@Get': function get_(obj, receiver) {
		// TODO: receiver
		if (!IsWrapper(this))
			throw new TypeError('Object expected');
		if (!IsWrapper(obj))
			throw new TypeError('Object expected');
		if (!('SymbolId' in this))
			throw new TypeError('Symbol expected');
		var id = this.SymbolId;
		if (hasOwn(obj, 'StaticSymbols') && hasOwn(obj.StaticSymbols, id))
			return obj.StaticSymbols[id];
		return obj[id];
	},

	'@GetOwn': function getOwn_(obj, receiver) {
		// TODO: receiver
		if (!IsWrapper(this))
			throw new TypeError('Object expected');
		if (!IsWrapper(obj))
			throw new TypeError('Object expected');
		if (!('SymbolId' in this))
			throw new TypeError('Symbol expected');
		var id = this.SymbolId;
		if (hasOwn(obj, 'StaticSymbols') && hasOwn(obj.StaticSymbols, id))
			return obj.StaticSymbols[id];
		if (hasOwn(obj, id))
			return obj[id];
		return undefined;
	},

	// TODO: reflect.define should support symbols
	'@Set': function set_(obj, value, receiver) {
		// TODO: receiver
		if (!IsWrapper(this))
			throw new TypeError('Object expected');
		if (!IsObject(obj))
			throw new TypeError('Object expected');
		if (!('SymbolId' in this))
			throw new TypeError('Symbol expected');
		var id = this.SymbolId;
		if (hasOwn(obj, 'StaticSymbols') && hasOwn(obj.StaticSymbols, id)) {
			obj.StaticSymbols[id] = value;
			return;
		}
		obj[id] = value;
	},

	'@SetOwn': function setOwn_(obj, value, receiver) {
		// TODO: receiver
		if (!IsWrapper(this))
			throw new TypeError('Object expected');
		if (!IsObject(obj))
			throw new TypeError('Object expected');
		if (!('SymbolId' in this))
			throw new TypeError('Symbol expected');
		var id = this.SymbolId;
		if (hasOwn(obj, 'StaticSymbols') && hasOwn(obj.StaticSymbols, id)) {
			obj.StaticSymbols[id] = value;
			return;
		}
		if (!(id in obj) || hasOwn(obj, id))
			return obj[id] = value;
		define(obj, id, {
			value: value,
			enumerable: true,
			writable: true,
			configurable: true
		});
	},

	'@Has': function has_(obj) {
		if (!IsWrapper(this))
			throw new TypeError('Object expected');
		if (!IsObject(obj))
			return false;
		var id = this.SymbolId;
		if (hasOwn(obj, 'StaticSymbols') && hasOwn(obj.StaticSymbols, id))
			return hasOwn(obj.StaticSymbols, id);
		return id in obj;
	},

	'@HasOwn': function hasOwn_(obj) {
		if (!IsWrapper(this))
			throw new TypeError('Object expected');
		if (!IsObject(obj))
			return false;
		var id = this.SymbolId;
		if (hasOwn(obj, 'StaticSymbols') && hasOwn(obj.StaticSymbols, id))
			return hasOwn(obj.StaticSymbols, id);
		return hasOwn(obj, id);
	},

	// TODO: Get this working
	'@Delete': function delete_(obj) {
		if (!IsWrapper(this))
			throw new TypeError('Object expected');
		if (!IsObject(obj))
			throw new TypeError('Object expected');
		if (!('SymbolId' in this))
			throw new TypeError('Symbol expected');
		var id = this.SymbolId;
		if (hasOwn(obj, 'StaticSymbols') && hasOwn(obj.StaticSymbols, id))
			return delete obj.StaticSymbols[id];
		return delete obj[id];
	},

	init: function init(value) {
		SymbolInit(this, value);
	}

});

function CreateSymbol(proto, value) {
	var id;
	if (IsWrapper(value) && 'SymbolId' in value)
		id = value.SymbolId;
	if (proto === undefined)
		proto = SymbolProto;
	var obj = CreateObject(proto);
	SymbolInit(obj, undefined, id);
	return obj;
}

function SymbolInit(obj, value, id) {
	if (!IsWrapper(obj))
		throw new TypeError('Object expected');
	if (id !== undefined)
		obj.SymbolId = String(id);
	else if (value === undefined)
		obj.SymbolId = '_' + identifiers.next();
	else if (IsWrapper(value) && 'SymbolId' in value)
		obj.SymbolId = value.SymbolId;
	else
		throw new TypeError('Value is not a symbol');
}

function CreateSymbolPrimitive(stringValue, id) {
	if (typeof stringValue != 'string')
		throw new Error('String expected');
	var prim = CreatePrimitiveWrapper(SymbolProto);
	SymbolInit(prim, undefined, id);
	prim.Type = 'symbol';
	prim.StringValue = stringValue;
	return prim;
}