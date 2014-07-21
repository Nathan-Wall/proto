var SymbolProto = CreatePrototype({

	'@@get': function get(obj, receiver) {
		return GetSymbol(obj, this, receiver);
	},

	'@@getOwn': function getOwn(obj, receiver) {
		return GetOwnSymbol(obj, this, receiver);
	},

	'@@getDescriptor': function getDescriptor(obj) {
		return GetSymbolDescriptor(obj, this);
	},

	'@@getOwnDescriptor': function getOwnDescriptor(obj) {
		return GetOwnSymbolDescriptor(obj, this);
	},

	'@@set': function set(obj, value, receiver) {
		return SetSymbol(obj, this, value, receiver);
	},

	'@@setOwn': function setOwn(obj, value, receiver) {
		return SetOwnSymbol(obj, this, value, receiver);
	},

	'@@has': function has(obj) {
		return HasSymbol(obj, this);
	},

	'@@hasOwn': function hasOwn(obj) {
		return HasOwnSymbol(obj, this);
	},

	'@@delete': function delete_(obj) {
		return DeleteSymbol(obj, this);
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

// TODO: If `SymbolProto` is modified, that shouldn't have an affect on
// internal operations which use symbols.
function CreateSymbolPrimitive(stringValue, id) {
	if (typeof stringValue != 'string')
		throw new Error('String expected');
	var prim = CreatePrimitiveWrapper(SymbolProto);
	SymbolInit(prim, undefined, id);
	prim.Type = 'symbol';
	prim.StringValue = stringValue;
	return prim;
}

function CreateBuiltInSymbol(id) {
	id ='@@' + id;
	return CreateSymbolPrimitive(id, id);
}

function IsSymbol(symbol) {
	return IsWrapper(symbol) && 'SymbolId' in symbol;
}

function GetSymbolId(symbol) {
	if (!IsWrapper(symbol)) {
		// A string version of the symbol may be passed in (note this is only
		// for internal use).
		// TODO: This trick could possibly be done elsewhere for better
		// performance.
		// TODO: Make sure this doesn't result in a leak such that people are
		// able to use strings like `"@@foo"` to get access to these
		// private properties. This functionality should only be accessible
		// internally.
		if (typeof symbol == 'string' && symbol[0] == '@')
			return symbol;
		throw new TypeError('Symbol expected');
	}
	if (!('SymbolId' in symbol))
		throw new TypeError('Symbol expected');
	return symbol.SymbolId;
}

function HasSymbol(obj, symbol) {
	var id = GetSymbolId(symbol);
	if (!IsWrapper(obj))
		return false;
	if (hasOwn(obj, 'StaticSymbols') && hasOwn(obj.StaticSymbols, id))
		return true;
	return id in obj.Symbols;
}

function HasOwnSymbol(obj, symbol) {
	var id = GetSymbolId(symbol);
	if (!IsWrapper(obj))
		return false;
	if (hasOwn(obj, 'StaticSymbols') && hasOwn(obj.StaticSymbols, id))
		return hasOwn(obj.StaticSymbols, id);
	return hasOwn(obj.Symbols, id);
}

// Note: Symbol operations such as `GetSymbol` do not coerce the `obj` argument,
// while the reflect operations such as `Get` do.
function GetSymbol(obj, symbol, receiver) {
	// TODO: receiver
	var id = GetSymbolId(symbol);
	// We're using `IsWrapper` here because symbols are stored internally on
	// primitives.
	if (!IsWrapper(obj))
		throw new TypeError('Object expected');
	if (hasOwn(obj, 'StaticSymbols') && hasOwn(obj.StaticSymbols, id))
		return obj.StaticSymbols[id];
	return obj.Symbols[id];
}

function GetOwnSymbol(obj, symbol, receiver) {
	// TODO: receiver
	var id = GetSymbolId(symbol);
	if (!IsWrapper(obj))
		throw new TypeError('Object expected');
	if (hasOwn(obj, 'StaticSymbols') && hasOwn(obj.StaticSymbols, id))
		return obj.StaticSymbols[id];
	if (hasOwn(obj.Symbols, id))
		return obj.Symbols[id];
	return undefined;
}

function GetSymbolDescriptor(obj, symbol) {
	var id = GetSymbolId(symbol);
	ExpectObject(obj);
	if (hasOwn(obj, 'StaticSymbols') && hasOwn(obj.StaticSymbols, id))
		return AddTransferableDesc(obj, id,
			__createDescriptor__(obj.StaticSymbols, id, true)
		);
	if (id in obj.Symbols)
		return AddTransferableDesc(obj, id,
			__createDescriptor__(obj.Symbols, id, false)
		);
	return undefined;
}

function GetSymbolDescriptorById(obj, id) {
	ExpectObject(obj);
	if (hasOwn(obj, 'StaticSymbols') && hasOwn(obj.StaticSymbols, id))
		return AddTransferableDesc(obj, id,
			__createDescriptor__(obj.StaticSymbols, id, true)
		);
	if (id in obj.Symbols)
		return AddTransferableDesc(obj, id,
			__createDescriptor__(obj.Symbols, id, false)
		);
	return undefined;
}

function GetOwnSymbolDescriptor(obj, symbol) {
	var id = GetSymbolId(symbol);
	ExpectObject(obj);
	if (hasOwn(obj, 'StaticSymbols') && hasOwn(obj.StaticSymbols, id))
		return AddTransferableDesc(obj, id,
			__createDescriptor__(obj.StaticSymbols, id, true)
		);
	if (hasOwn(obj.Symbols, id))
		return AddTransferableDesc(obj, id,
			__createDescriptor__(obj.Symbols, id, false)
		);
	return undefined;
}

function AddTransferableDesc(obj, symbolId, desc) {
	ExpectObject(obj);
	DefineValue(desc, 'transferable', IsTransferableId(obj, symbolId));
	return desc;
}

function IsTransferableId(obj, symbolId) {
	// Find the right object containing the own symbol id
	ExpectObject(obj);
	// Shortcut
	if (!('NonTransferables' in obj))
		return true;
	// Check static symbols
	if (hasOwn(obj, 'StaticSymbols') && hasOwn(obj.StaticSymbols, symbolId))
		return hasOwn(obj, 'NonTransferables')
			&& !obj.NonTransferables[symbolId];
	// Check inherited symbols
	do {
		if (hasOwn(obj.Symbols, symbolId))
			return hasOwn(obj, 'NonTransferables')
				&& !obj.NonTransferables[symbolId];
	} while (obj = GetPrototypeOf(obj));
	return true;
}

// TODO: reflect.define should support symbols
function SetSymbol(obj, symbol, value, receiver) {
	// TODO: receiver
	var id = GetSymbolId(symbol);
	ExpectObject(obj);
	if (hasOwn(obj, 'StaticSymbols') && hasOwn(obj.StaticSymbols, id))
		return obj.StaticSymbols[id] = value;
	return obj.Symbols[id] = value;
}

function SetOwnSymbol(obj, symbol, value, receiver) {
	// TODO: receiver
	var id = GetSymbolId(symbol);
	ExpectObject(obj);
	if (hasOwn(obj, 'StaticSymbols') && hasOwn(obj.StaticSymbols, id))
		return obj.StaticSymbols[id] = value;
	if (!(id in obj.Symbols) || hasOwn(obj.Symbols, id))
		return obj.Symbols[id] = value;
	define(obj.Symbols, id, {
		value: value,
		enumerable: true,
		writable: true,
		configurable: true
	});
	return value;
}

function DeleteSymbol(obj, symbol) {
	var id = GetSymbolId(symbol);
	ExpectObject(obj);
	var a = delete obj.StaticSymbols[id],
		b = delete obj.Symbols[id];
	return a && b;
}

function SetSymbolTransferability(obj, symbol, transferable) {
	// TODO: Only allow this if the property is configurable
	var id, nonTransferables;
	ExpectObject(obj);
	if (hasOwn(obj, 'NonTransferables'))
		nonTransferables = obj.NonTransferables;
	else {
		if (transferable)
			return;
		nonTransferables = obj.NonTransferables = create(null);
	}
	id = GetSymbolId(symbol);
	nonTransferables[id] = !transferable;
}