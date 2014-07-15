var reflect = CreatePrototype({

	getDescriptor: function getDescriptor(obj, key) {
		return GetDescriptor(obj, key);
	},

	getOwnDescriptor: function getOwnPropertyDescriptor(obj, key) {
		return GetOwnDescriptor(obj, key);
	},

	has: function has(obj, key) {
		return Has(obj, key);
	},

	hasOwn: function hasOwn(obj, key) {
		return HasOwn(obj, key);
	},

	isCallable: function isCallable(value) {
		return IsCallable(value);
	},

	keys: function keys(value) {
		return GetKeys(value);
	},

	ownKeys: function ownKeys(value) {
		return GetOwnKeys(value);
	},

	isObject: function isObject(value) {
		return IsObject(value);
	},

	define: function define(obj, key, desc) {
		// Note: It makes sense for Proto to examine inherited properties in
		// the descriptors, although it doesn't for JS, because it's trivial to
		// create dictionaries in Proto.
		return DefineDescriptor(obj, key, desc);
	}

});

// properties will always be a native JS object
function CreateObject(proto, properties, staticProps, extendedProps) {
	var wrapper, protoValue, protoSymbols;
	if (proto === undefined)
		proto = ObjectProto;
	else if (proto !== null && !IsObject(proto))
		throw new TypeError('Expected object or nil');
	if (proto === null) {
		protoValue = null;
		protoSymbols = null;
	}
	else {
		protoValue = proto.Value;
		protoSymbols = proto.Symbols;
	}
	if (properties !== undefined)
		expectObject(properties);
	wrapper = create(proto);
	wrapper.Value = like(protoValue, properties);
	wrapper.Symbols = like(protoSymbols, properties);
	if (staticProps !== undefined) {
		expectObject(staticProps);
		wrapper.Static = own(staticProps);
	}
	if (extendedProps !== undefined)
		for (var i = 0, p; i < extendedProps.length; i++) {
			p = extendedProps[i];
			if (!p.conditional || p.value != null)
				Define(wrapper, p.kind, p.key, p.value, p.static, true, true);
		}
	return wrapper;
}

// TODO: It appears this may not actually offer performance improvements, so
// maybe it should be removed.
// The purpose of `CreateSimpleObject` is to offer a more performant function
// than `CreateObject` for use cases where a prototypeless object is desired
// with only data properties.  Note that accessor properties do not work with
// `CreateSimpleObject` as it assumes `properties` is only a collection of
// data properties (for performance).
function CreateSimpleObject(properties) {
	var wrapper = create(null),
		valueObject = wrapper.Value = create(null),
		props = keys(properties);
	for (var i = 0, prop; i < props.length; i++) {
		prop = props[i];
		valueObject[prop] = properties[prop];
	}
	return wrapper;
}

function CreatePrimitiveWrapper(proto) {
	var wrapper, protoValue, protoSymbols;
	if (!IsObject(proto))
		throw new TypeError('Expected object');
	protoValue = proto.Value;
	protoSymbols = proto.Symbols;
	wrapper = create(proto);
	wrapper.Value = create(protoValue);
	wrapper.Symbols = create(protoSymbols);
	wrapper.Primitive = true;
	return wrapper;
}

// This function provides a convenience for defining built-in prototypes.
function CreatePrototype(properties) {
	var props = keys(properties),
		staticProps,
		extendedProps = [ ],
		symbols = create(null),
		key, proto, i, ch;
	for (i = 0; i < props.length; i++) {
		key = props[i];
		if (charAt(key, 0) == '@') {
			// TODO: Should this instead be an assertion that can be removed
			// in production version for performance?  This is just here to
			// catch mistakes in the runtime.
			if (charAt(key, 1) != '@')
				throw new Error(
					'Expected @@ for built-in symbol "' + key + '"'
				);
			// TODO: Like the above, the next few lines could also be
			// removable asserts.
			ch = charAt(key, 2);
			if (toLowerCase(ch) !== ch)
				throw new Error(
					'Expected built-in symbol to begin with a lowercase letter'
				);
			symbols[key] = CreateFunction(undefined, properties[key]);
			delete properties[key];
		}
		else if (test(/^static_/, key)) {
			if (staticProps === undefined)
				staticProps = create(null);
			staticProps[stringSlice(key, 7)] = CreateFunction(
				undefined, properties[key]
			);
			delete properties[key];
		}
		else
			properties[key] = CreateFunction(undefined, properties[key]);
	}
	proto = CreateObject(undefined, properties, staticProps, extendedProps);
	props = keys(symbols);
	for (i = 0; i < props.length; i++) {
		key = props[i];
		proto.Symbols[key] = symbols[key];
	}
	return proto;
}

// This function aims to be equivalent to `Object(value) === value`. We use
// other mechanisms for performance reasons, but in any case where the
// implementation deviates from `Object(value) === value`, change to the
// algorithm below should be considered to keep parity.  (Deviations may
// occur due to additions to and changes in the underlying ECMAScript language.)
function isObject(value) {
	var t;
	return value != null && ((t = typeof value) == 'object' || t == 'function');
}

function IsWrapper(value) {
	if (!isObject(value))
		return false;
	// TODO: Should this instead just be an assertion (which could potentially
	// be removed during a prod compilation -- for performance)?
	if (!hasOwn(value, 'Value'))
		throw new TypeError('Wrapper expected');
	return true;	
}

function IsObject(value) {
	return IsWrapper(value) && !value.Primitive;
}

function expectObject(value) {
	if (!isObject(value))
		throw new TypeError('Object expected');
	return value;
}

function ExpectObject(value) {
	if (!IsObject(value))
		throw new TypeError('Object expected');
	return value;
}

function IsPrimitiveWrapper(value) {
	return IsWrapper(value) && !!value.Primitive;
}

function Is(a, b) {
	if (a === 0 && b === 0)
		return 1 / a === 1 / b;
	if (a !== a)
		return b !== b;
	return a === b;
}

function CheckSpread(value) {
	if (IsLike(value, ArrayProto))
		return value;
	throw new TypeError(
		'Array expected. '
		+ 'Currently only arrays are allowed with the spread operator.'
	);
}

function IsLike(obj, proto) {
	if (!IsObject(obj))
		return false;
	// nil is always in the prototype chain of any object
	if (proto === null || proto === undefined)
		return true;
	if (!IsObject(proto))
		return false;
	return isPrototypeOf(proto.Value, obj.Value);
}

// TODO: Should this just be implemented by calling `Mixin` on a new object?
function Own(obj) {
	ExpectObject(obj);
	var O = CreateObject(null),
		keys = getOwnPropertyNames(obj),
		i, key, pkeys, j, pkey;
	for (i = 0, key; i < keys.length; i++) {
		key = keys[i];
		if (/^Value$|^Static$|^Symbols$|^StaticSymbols$/.test(key)) {
			pkeys = getOwnPropertyNames(obj[key]);
			if (/^Static/.test(key))
				O[key] = create(null);
			for (j = 0; j < pkeys.length; j++) {
				pkey = pkeys[j];
				define(O[key], pkey,
					getOwnPropertyDescriptor(obj[key], pkey)
				);
			}
		}
		else
			// TODO: What propreties would this include? Should these actually
			// be copied?
			define(O, key, getOwnPropertyDescriptor(obj, key));
	}
	return O;
}

function Has(obj, key) {
	var K, HasF;
	if (!IsObject(obj))
		return false;
	if (IsWrapper(key)) {
		if (HasSymbol(key, $$has)) {
			HasF = ExpectFunction(GetSymbol(key, $$has));
			return Call(HasF, key, [ obj ]);
		}
		else
			throw new Error(
				'Object cannot be used as a property key in has operation'
			);
	}
	K = toSafeKey(key);
	return (K in obj.Value
		|| hasOwn(obj, 'Static') && hasOwn(obj.Static, K));
}

function HasOwn(obj, key) {
	var K, HasF;
	if (!IsObject(obj))
		return false;
	if (IsWrapper(key)) {
		if (HasSymbol(key, $$hasOwn)) {
			HasF = ExpectFunction(GetSymbol(key, $$hasOwn));
			return Call(HasF, key, [ obj ]);
		}
		else
			throw new Error(
				'Object cannot be used as a property key in has operation'
			);
	}
	K = toSafeKey(key);
	return (hasOwn(obj.Value, K)
		|| hasOwn(obj, 'Static') && hasOwn(obj.Static, K));
}

function Get(obj, key, receiver) {
	var desc, get, GetF, proto, K, T, O;
	if (obj === null || obj === undefined)
		return undefined;
	if (receiver === null)
		receiver = undefined;
	if (IsWrapper(key)) {
		if (HasSymbol(key, $$get)) {
			GetF = ExpectFunction(GetSymbol(key, $$get));
			return Call(GetF, key, [ obj, receiver ]);
		}
		else
			throw new Error(
				'Object cannot be used as a property key in get operation'
			);
	}
	K = toSafeKey(key);
	// TODO: Make operations like `'string'.length` more performant, without
	// having to create a new string object each time.
	T = typeof obj;
	if (T == 'string')
		obj = New(StringProto, [ obj ]);
	if (IsWrapper(obj)) {
		if (hasOwn(obj, 'Static') && hasOwn(obj.Static, K))
			O = obj.Static;
		else
			O = obj.Value;
		if (receiver === undefined) {
			if ('ProxyJs' in obj)
				return proxyJs(O[K]);
			else
				return IfAccessorGet(O[K], obj);
		}
		else {
			desc = getPropertyDescriptor(O, K);
			if (desc == null)
				return undefined;
			else if (hasOwn(desc, 'get')) {
				get = expectFunction(desc.get);
				if (obj.ProxyJs) {
					// TODO: Can this just be
					//     return proxyJs(call(get, receiver));
					// ?
					GetF = CreateFunction(null, get);
					return proxyJs(Call(GetF, receiver, [ ]));
				}
				else
					throw new Error('Unexpected getter');
			}
			else if (hasOwn(desc, 'value')) {
				if (obj.ProxyJs)
					return proxyJs(desc.value);
				else
					return IfAccessorGet(desc.value, obj);
			}
			else
				return undefined;
		}
	}
	switch (T) {
		case 'boolean': proto = BooleanProto; break;
		case 'number': proto = NumberProto; break;
		default: throw new TypeError('Unexpected type "' + T + '"');
	}
	if (receiver === undefined)
		receiver = obj;
	// `GetDescriptor` expects the raw key
	desc = GetDescriptor(proto, key);
	if (desc === undefined || Get(desc, 'static'))
		return undefined;
	else if (Has(desc, 'value'))
		return IfAccessorGet(Get(desc, 'value'), obj);
	else
		throw new Error('Unexpected accessor');
}

function GetOwn(obj, key, receiver) {
	var GetF;
	if (obj === null || obj === undefined)
		return undefined;
	if (IsWrapper(key)) {
		if (HasSymbol(key, $$getOwn)) {
			GetF = ExpectFunction(GetSymbol(key, $$getOwn));
			return Call(GetF, key, [ obj, receiver ]);
		}
		else
			throw new Error(
				'Object cannot be used as a property key in get own operation'
			);
	}
	if (HasOwn(obj, key))
		// `K` was made safe, so we need to pass `key` in to `Get` (since
		// `Get` expects the raw key.)
		return Get(obj, key, receiver);
	return undefined;
}

function Set(obj, key, value, receiver) {
	var desc, set, SetF, K, R, handle = I, O;
	if (obj === null || obj === undefined)
		throw new TypeError('Cannot set property of nil');
	ExpectObject(obj);
	if (obj.ProxyJs)
		handle = UnwrapProto;
	// TODO: Symbol setters
	if (IsWrapper(key)) {
		if (HasSymbol(key, $$set)) {
			SetF = ExpectFunction(GetSymbol(key, $$set));
			value = handle(value);
			Call(SetF, key, [ obj, value, receiver ]);
			return value;
		}
		else
			throw new Error(
				'Object cannot be used as a property key in set operation'
			);
	}
	K = toSafeKey(key);
	if (hasOwn(obj, 'Static') && hasOwn(obj.Static, K))
		O = obj.Static;
	else
		O = obj.Value;
	if (receiver === null || receiver === undefined) {
		if (obj.ProxyJs) {
			O[K] = UnwrapProto(value);
		} else {
			set = O[K];
			if (IsAccessor(set))
				CallAccessorSet(set, obj, value);
			else
				O[K] = value;
		}
		return value;
	}
	desc = getPropertyDescriptor(O, K);
	if (desc == null) {
		O[K] = handle(value);
		return value;
	}
	else if (hasOwn(desc, 'set')) {
		set = desc.set;
		if (obj.ProxyJs) {
			// TODO: Can this just be
			//     call(set, receiver, value);
			// ?
			// TODO: Does there need to be a `UnwrapProto` call round value?
			SetF = CreateFunction(null, set);
			Call(SetF, receiver, [ value ]);
			return  value;
		}
		else
			throw new Error('Unexpected setter');
	}
	else if (hasOwn(desc, 'value')) {
		set = O[K];
		if (IsAccessor(set))
			CallAccessorSet(set, receiver, value);
		else
			O[K] = handle(value);
		return value;
	}
	else
		throw new TypeError(
			'Object has a getter without a setter for property "'
			+ key + '"'
		);
}

function SetOwn(obj, key, value, receiver) {
	var K, SetF;
	if (obj === null || obj === undefined)
		throw new TypeError('Cannot set property of nil');
	ExpectObject(obj);
	if (IsWrapper(key)) {
		if (HasSymbol(key, $$setOwn)) {
			SetF = ExpectFunction(GetSymbol(key, $$setOwn));
			value = handle(value);
			Call(SetF, key, [ obj, value, receiver ]);
			return value;
		}
		else
			throw new Error(
				'Object cannot be used as a property key in set own operation'
			);
	}
	K = toSafeKey(key);
	if (!(K in obj.Value) || hasOwn(obj.Value, K)
	|| hasOwn(obj, 'Static') && hasOwn(obj.Static, K)) {
		// `Set` expects the raw key
		Set(obj, key, value, receiver);
		return value;
	}
	// TODO: Make Reflect.define capable of defining static properties
	define(obj.Value, K, {
		value: value,
		// Leaving enumerable on here to keep foo#bar = 5 consistent with
		// foo.bar = 5.
		enumerable: true,
		writable: true,
		configurable: true
	});
	return value;
}

function Delete(obj, key) {
	var K, O;
	if (obj === null || obj === undefined)
		throw new TypeError('Cannot delete property of nil');
	ExpectObject(obj);
	if (IsWrapper(key)) {
		if (HasSymbol(key, $$delete)) {
			DeleteF = ExpectFunction(GetSymbol(key, $$delete));
			return !!Call(DeleteF, key, [ obj ]);
		}
		else
			throw new TypeError(
				'Object cannot be used as a property key in delete'
				+ 'operation'
			);
	}
	K = toSafeKey(key);
	if (hasOwn(obj, 'Static') && hasOwn(obj.Static, K))
		O = obj.Static;
	else
		O = obj.Value;
	return delete O[K];
}

function GetKeys(obj) {
	var keys, allKeys, set, key, i, o;
	if (obj === undefined || obj === null || !IsObject(obj))
		return CreateArray(ArrayProto);
	allKeys = createSack();
	set = create(null);
	if (hasOwn(obj, 'Static')) {
		keys = getOwnPropertyNames(obj.Static);
		for (i = 0; i < keys.length; i++) {
			key = keys[i];
			set[key] = true;
			push(allKeys, key);
		}
	}
	o = obj;
	do {
		keys = getOwnPropertyNames(o.Value);
		for (i = 0; i < keys.length; i++) {
			key = keys[i];
			if (!(key in set)) {
				set[key] = true;
				push(allKeys, key);
			}
		}
	} while (o = getPrototypeOf(o));
	return CreateArray(ArrayProto, allKeys);
}

function GetOwnKeys(obj) {
	var allKeys, set, keys, key, i;
	if (obj === undefined || obj === null || !IsObject(obj))
		return CreateArray(ArrayProto);
	allKeys = createSack();
	set = create(null);
	if (hasOwn(obj, 'Static')) {
		keys = getOwnPropertyNames(obj.Static);
		for (i = 0; i < keys.length; i++) {
			key = keys[i];
			set[key] = true;
			push(allKeys, key);
		}
	}
	else
		// Shortcut for case where object has no static properties
		return CreateArray(ArrayProto, getOwnPropertyNames(obj.Value));
	keys = getOwnPropertyNames(obj.Value);
	for (i = 0; i < keys.length; i++) {
		key = keys[i];
		if (!(key in set)) {
			set[key] = true;
			push(allKeys, key);
		}
	}
	return CreateArray(ArrayProto, allKeys);
}

function Freeze(obj) {
	ExpectObject(obj);
	freeze(obj.Value);
	if (hasOwn(obj, 'Static'))
		freeze(obj.Static);
	return obj;
}

function GetDescriptor(obj, key) {
	var GetDescriptorF;
	ExpectObject(obj);
	if (IsWrapper(key) && HasSymbol(key, $$getDescriptor)) {
		GetDescriptorF = ExpectFunction(GetSymbol(key, $$getDescriptor));
		return Call(GetDescriptorF, obj);
	}
	key = toSafeKey(key);
	if (hasOwn(obj, 'Static') && hasOwn(obj.Static, key))
		return __createDescriptor__(obj.Static, key, true);
	else if (key in obj.Value)
		return __createDescriptor__(obj.Value, key, false);
	return undefined;
}

function __createDescriptor__(O, key, isStatic) {
	var desc = getPropertyDescriptor(O, key),
		K = keys(desc),
		d = create(null);
	for (var i = 0, k; i < K.length; i++) {
		k = K[i];
		if (k == 'get' || k == 'set') {
			if (!hasOwn(desc[k], '__ProtoFunction__'))
				throw new TypeError('Wrapper function expected');
			d[k] = desc[k].__ProtoFunction__;
		}
		else if (k != 'enumerable')
			d[k] = desc[k];
	}
	d.static = isStatic;
	return CreateObject(null, d);
}

function GetOwnDescriptor(obj, key) {
	ExpectObject(obj);
	var K = toSafeKey(key);
	if (hasOwn(obj.Value, K)
	|| hasOwn(obj, 'Static') && hasOwn(obj.Static, K))
		// `GetDescriptor` expects the raw key
		return GetDescriptor(obj, key);
	return undefined;
}

function like(proto, props) {

	if (proto === undefined)
		proto = null;

	if (props === undefined)
		return create(proto);

	return create(proto, propsToDescriptors(own(props), proto));

}

function propsToDescriptors(props, base) {

	var desc = create(null),
		keys = getUncommonPropertyNames(props, base),
		key, d;

	for (var i = 0; i < keys.length; i++) {
		key = keys[i];
		d = own(getOwnPropertyDescriptor(props, key));
		//d.enumerable = false;
		// Switching enumerable to `true` seems to make interfacing with JS
		// scripts easier... TODO: Remove any logic which is intended to work in
		// a Proto env where enumerable is set to `false`... this has changed.
		d.enumerable = true;
		desc[key] = d;
	}

	return desc;

}

function getUncommonPropertyNames(from, compareWith) {

	var namesMap = create(null),
		names = concatUncommonNames(from, compareWith),
		keys = createSack(),
		name;

	for (var i = 0; i < names.length; i++) {
		name = names[i];
		if (!namesMap[name]) {
			namesMap[name] = true;
			push(keys, name);
		}
	}

	return keys;

}

function concatUncommonNames(from, compareWith) {
	if (!isObject(from)
		|| from === compareWith
		|| isPrototypeOf(from, compareWith)) return [ ];
	return concat(safeGetOwnPropertyNames(from),
		concatUncommonNames(getPrototypeOf(from), compareWith));
}

// Like `getOwnPropertyNames` but will leave out magical properties such
// as `__proto__` when `Object.prototype` is passed in.
function safeGetOwnPropertyNames(from) {
	var names = getOwnPropertyNames(from),
		tmp, i, name;
	if (from === ObjectPrototype) {
		tmp = createSack();
		for (i = 0; i < names.length; i++) {
			name = names[i];
			if (!/^__/.test(name))
				push(tmp, name);
		}
		names = slice(tmp);
	}
	return names;
}

function Like(obj) {
	if (obj === undefined)
		obj = null;
	if (obj !== null)
		ExpectObject(obj);
	return CreateObject(obj);
}

function New(obj, args) {
	ExpectObject(obj);
	var newObj = CreateObject(obj),
		init = Get(newObj, 'init');
	if (IsCallable(init))
		Call(init, newObj, args);
	return newObj;
}

function mixin(mixinWhat, mixinWith, withHandler) {

	expectObject(mixinWhat);

	if (!isExtensible(mixinWhat))
		throw new Error('Cannot mixin on non-exensible object');

	expectObject(mixinWith);

	var keys = getUncommonPropertyNames(mixinWith, mixinWhat),
		key, whatDesc, withDesc;

	for (var i = 0; i < keys.length; i++) {
		key = keys[i];
		whatDesc = getPropertyDescriptor(mixinWhat, key);
		withDesc = getPropertyDescriptor(mixinWith, key);
		if (withHandler !== undefined && hasOwn(withDesc, 'value'))
			withDesc.value = withHandler(withDesc.value);
		if (!whatDesc || whatDesc.configurable)
			// If mixinWhat does not already have the property, or if mixinWhat
			// has the property and it's configurable, add it as is.
			define(mixinWhat, key, withDesc);
		else if (hasOwn(whatDesc, 'writable')
		&& whatDesc.writable
		&& hasOwn(withDesc, 'value'))
			// If the property is writable and the withDesc has a value, write
			// the value.
			mixinWhat[key] = withDesc.value;
	}

	return mixinWhat;

}

// TODO: It'd probably be best to just rewrite this using Proto operations
// rather than using `mixin` and remove the weird `withHandler` stuff from
// `mixin`.
function Mixin(to, from) {
	ExpectObject(to);
	// Mixin with nil as the second arg is ignored.
	if (from === null || from === undefined)
		return to;
	ExpectObject(from);
	// TODO: Deal with JS proxied objects.
	var toProxy = 'ProxyJs' in to,
		fromProxy = 'ProxyJs' in from,
		handler;
	if (toProxy != fromProxy)
		handler = toProxy ? UnwrapProto : proxyJs;
	mixin(to.Value, from.Value, handler);
	if (hasOwn(from, 'Static')) {
		if (!hasOwn(to, 'Static'))
			to.Static = create(null);
		mixin(to.Static, from.Static);
	}
	if (hasOwn(from, 'Symbols')) {
		if (!hasOwn(to, 'Symbols'))
			to.Symbols = create(null);
		mixin(to.Symbols, from.Symbols);
	}
	if (hasOwn(from, 'StaticSymbols')) {
		if (!hasOwn(to, 'StaticSymbols'))
			to.StaticSymbols = create(null);
		mixin(to.Staticymbols, from.StaticSymbols);
	}
	return to;
}

function GetPrototype(obj) {
	ExpectObject(obj);
	return getPrototypeOf(obj);
}

function DefineDescriptor(obj, key, desc) {
	// TODO
}

function Define(obj, kind, key, value, isStatic, writable, configurable) {
	// TODO: Permit this operation on wrappers?
	ExpectObject(obj);
	var O, desc = create(null), d, prop,
		isSymbol = IsSymbol(key);
	if (isStatic) {
		prop = 'Static';
		if (isSymbol)
			prop += 'Symbols';
		if (hasOwn(obj, prop))
			O = obj[prop];
		else
			O = obj[prop] = create(null);
	}
	else if (isSymbol)
		O = obj.Symbols;
	else
		O = obj.Value;
	kind = ToString(kind);
	if (isSymbol)
		key = GetSymbolId(key);
	else if (typeof key != 'string')
		throw new TypeError('Expected string or symbol');
	key = toSafeKey(key);
	if (kind == 'value') {
		desc.value = value;
		desc.writable = ToBoolean(writable);
	}
	// TODO: Make accessors correctly pass through membranes (does this work?)
	else if (kind == 'get' || kind == 'set') {
		ExpectFunction(value);
		d = getOwnPropertyDescriptor(O, key);
		if (d !== undefined && IsAccessor(d.value))
			desc.value = d.value;
		else
			desc.value = CreateAccessor();
		if (kind == 'get')
			DefineAccessorGet(desc.value, value);
		else
			DefineAccessorSet(desc.value, value);
	}
	else
		throw new Error('Invalid kind: "' + kind + '"');
	desc.configurable = ToBoolean(configurable);
	desc.enumerable = false;
	defineProperty(O, key, desc);
	return obj;
}

function DefineValue(obj, key, value) {
	return Define(obj, 'value', key, value, false, true, true);
}

function define(obj, name, desc) {
	if ('value' in desc && !hasOwn(desc, 'value')
		|| 'get' in desc && !hasOwn(desc, 'get')
		|| 'set' in desc && !hasOwn(desc, 'set')
		|| 'enumerable' in desc && !hasOwn(desc, 'enumerable')
		|| 'writable' in desc && !hasOwn(desc, 'writable')
		|| 'configurable' in desc && !hasOwn(desc, 'configurable'))
		desc = createSafeDescriptor(desc);
	return defineProperty(obj, name, desc);
}

function createSafeDescriptor(obj) {
	if (obj == null) {
		locked = true;
		throw new TypeError('Argument cannot be null or undefined.');
	}
	obj = Object(obj);
	var O = create(null),
		k = keys(obj);
	for (var i = 0, key = k[i]; key = k[i], i < k.length; i++)
		O[key] = obj[key];
	return O;
}

function getPropertyDescriptor(obj, key) {
	var desc, K;
	expectObject(obj);
	K = String(key);
	do {
		desc = getOwnPropertyDescriptor(obj, K);
	} while (desc === undefined && (obj = getPrototypeOf(obj)));
	return desc;
}

function toSafeKey(key) {
	// Dunders have long been used for various kinds of magical properties in
	// JS implementations.
	if (/^__/.test(key))
		return ':' + key;
	return key;
}