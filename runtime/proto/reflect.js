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
		// TODO
	}

});

// properties will always be a native JS object
function CreateObject(proto, properties, staticProps, extendedProps) {
	var wrapper, protoValue;
	if (proto === undefined)
		proto = ObjectProto;
	else if (proto !== null && !IsObject(proto))
		throw new TypeError('Expected object or nil');
	if (proto === null)
		protoValue = null;
	else
		protoValue = proto.Value;
	if (properties !== undefined) {
		if (Object(properties) !== properties)
			throw new TypeError('Object expected');
	}
	wrapper = create(proto);
	wrapper.Value = like(protoValue, properties);
	if (staticProps !== undefined) {
		if (Object(staticProps) !== staticProps)
			throw new TypeError('Object expected');
		wrapper.Static = own(staticProps);
	}
	if (extendedProps !== undefined) {
		for (var i = 0, p; i < extendedProps.length; i++) {
			p = extendedProps[i];
			Define(wrapper, p.kind, p.key, p.value, p.static, true, true);
		}
	}
	return wrapper;
}

function CreatePrimitiveWrapper(proto) {
	var wrapper, protoValue;
	if (!IsObject(proto))
		throw new TypeError('Expected object');
	protoValue = proto.Value;
	wrapper = create(proto);
	wrapper.Value = create(protoValue);
	wrapper.Primitive = true;
	return wrapper;
}

function CreatePrototype(properties) {
	var props = keys(properties),
		staticProps,
		extendedProps = [ ],
		symbols = create(null),
		key, proto, i;
	for (i = 0; i < props.length; i++) {
		key = props[i];
		if (charAt(key, 0) == '@') {
			symbols[stringSlice(key, 1)] = CreateFunction(
				undefined, properties[key]
			);
			delete properties[key];
		}
		else if (test(/^static_/, key)) {
			if (staticProps === undefined)
				staticProps = create(null);
			staticProps[stringSlice(key, 7)] = properties[key];
			delete properties[key];
		}
		else
			properties[key] = CreateFunction(undefined, properties[key]);
	}
	proto = CreateObject(undefined, properties, staticProps, extendedProps);
	props = keys(symbols);
	for (i = 0; i < props.lenght; i++) {
		key = props[i];
		proto[key] = symbols[key];
	}
	return proto;
}

function IsWrapper(value) {
	if (Object(value) !== value)
		return false;
	if (!hasOwn(value, 'Value'))
		throw new TypeError('Wrapper expected');
	return true;	
}

function IsObject(value) {
	return IsWrapper(value) && !value.Primitive;
}

function IsPrimitiveWrapper(value) {
	return IsWrapper(value) && !!value.Primitive;
}

function ToComparable(value) {
	if (!IsWrapper(value))
		return value;
	if (Has(value, $$toComparable))
		return Call(Get(value, $$toComparable), value);
	throw new TypeError('Object is not comparable');
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

function Own(obj) {
	if (!IsObject(obj))
		throw new TypeError('Object expected');
	var O = CreateObject(null),
		keys = getOwnPropertyNames(obj),
		i, key;
	for (i = 0, key; i < keys.length; i++) {
		key = keys[i];
		define(O, key, getOwnPropertyDescriptor(obj, key));
	}
	keys = getOwnPropertyNames(obj.Value);
	for (i = 0, key; i < keys.length; i++) {
		key = keys[i];
		define(O.Value, key, getOwnPropertyDescriptor(obj.Value, key));
	}
	if (hasOwn(obj, 'StaticSymbols')) {
		keys = getOwnPropertyNames(obj.StaticSymbols);
		O.StaticSymbols = create(null);
		for (i = 0, key; i < keys.length; i++) {
			key = keys[i];
			define(O.StaticSymbols, key,
				getOwnPropertyDescriptor(obj.StaticSymbols, key)
			);
		}
	}
	if (hasOwn(obj, 'Static')) {
		keys = getOwnPropertyNames(obj.Static);
		O.Static = create(null);
		for (i = 0, key; i < keys.length; i++) {
			key = keys[i];
			define(O.Static, key,
				getOwnPropertyDescriptor(obj.Static, key)
			);
		}
	}
	return O;
}

function Has(obj, key) {
	var K;
	if (!IsObject(obj))
		return false;
	if (IsWrapper(key)) {
		if ('Has' in key)
			return key.Has(obj);
		else
			throw new Error(
				'Object cannot be used as a property key in has operation'
			);
	}
	K = ToString(key);
	return (K in obj.Value
		|| hasOwn(obj, 'Static') && hasOwn(obj.Static, key));
}

function HasOwn(obj, key) {
	var K;
	if (!IsObject(obj))
		return false;
	if (IsWrapper(key)) {
		if ('HasOwn' in key)
			return key.HasOwn(obj);
		else
			throw new Error(
				'Object cannot be used as a property key in has operation'
			);
	}
	K = ToString(key);
	return (hasOwn(obj.Value, K)
		|| hasOwn(obj, 'Static') && hasOwn(obj.Static, key));
}

// TODO: Uses of `someObj.Value.someKey` in other functions should probably
// be changed to use `Get`, especially considering static properties.
function Get(obj, key, receiver) {
	var desc, get, GetF, proto, K, T, O;
	if (obj === null || obj === undefined)
		return undefined;
	if (receiver === null)
		receiver = undefined;
	if (IsWrapper(key)) {
		if ('Get' in key)
			return key.Get(obj, receiver);
		else
			throw new Error(
				'Object cannot be used as a property key in get operation'
			);
	}
	K = ToString(key);
	if (IsWrapper(obj)) {
		if (hasOwn(obj, 'Static') && hasOwn(obj.Static, K))
			O = obj.Static;
		else
			O = obj.Value;
		if (receiver === undefined) {
			if ('ProxyJs' in obj)
				return proxyJs(O[K]);
			else
				return O[K];
		}
		else {
			desc = getPropertyDescriptor(O, K);
			if (desc == null)
				return undefined;
			else if (hasOwn(desc, 'get')) {
				get = desc.get;
				if (typeof get != 'function')
					throw new TypeError('Function expected');
				if (obj.ProxyJs) {
					// TODO: Can this just be
					//     return proxyJs(call(get, receiver));
					// ?
					GetF = CreateFunction(null, get);
					return proxyJs(Call(GetF, receiver, [ ]));
				}
				else {
					GetF = get.__ProtoFunction__;
					if (typeof GetF != 'function')
						throw new TypeError('Function expected');
					return Call(GetF, receiver, [ ]);
				}
			}
			else if (hasOwn(desc, 'value')) {
				if (obj.ProxyJs)
					return proxyJs(desc.value);
				else
					return desc.value;
			}
			else
				return undefined;
		}
	}
	switch (T = typeof obj) {
		case 'boolean': proto = BooleanProto; break;
		case 'number': proto = NumberProto; break;
		case 'string': proto = StringProto; break;
		default: throw new TypeError('Unexpected type "' + T + '"');
	}
	if (receiver === undefined)
		receiver = obj;
	desc = GetDescriptor(proto, K);
	if (desc === undefined || desc.static)
		return undefined;
	if (hasOwn(desc, 'get')) {
		get = desc.get;
		if (typeof get != 'function')
			throw new TypeError('Function expected');
		return Call(get, receiver, [ ]);
	}
	else if (hasOwn(desc, 'value'))
		return desc.value;
	else
		return undefined;
}

function GetOwn(obj, key, receiver) {
	var K;
	if (obj === null || obj === undefined)
		return undefined;
	if (IsWrapper(key)) {
		if ('GetOwn' in key)
			return key.GetOwn(obj, receiver);
		else
			throw new Error(
				'Object cannot be used as a property key in get operation'
			);
	}
	K = ToString(key);
	if (hasOwn(obj.Value, K) || hasOwn(obj, 'Static') && hasOwn(obj.Static, K))
		return Get(obj, K, receiver);
	return undefined;
}

function Set(obj, key, value, receiver) {
	var desc, set, SetF, K, R, handle = I, O;
	if (obj === null || obj === undefined)
		throw new TypeError('Cannot set property of nil');
	if (!IsObject(obj))
		throw new TypeError('Object expected');
	if (obj.ProxyJs)
		handle = UnwrapProto;
	// TODO: Symbol setters
	if (IsWrapper(key)) {
		if ('Set' in key) {
			value = handle(value);
			key.Set(obj, value, receiver);
			return value;
		}
		else
			throw new Error(
				'Object cannot be used as a property key in set operation'
			);
	}
	K = ToString(key);
	if (hasOwn(obj, 'Static') && hasOwn(obj.Static, K))
		O = obj.Static;
	else
		O = obj.Value;
	if (receiver === null || receiver === undefined) {
		O[K] = handle(value);
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
			SetF = CreateFunction(null, set);
			Call(SetF, receiver, [ value ]);
			return  value;
		}
		else {
			if (typeof set != 'function')
				throw new TypeError('Function expected');
			SetF = set.__ProtoFunction__;
			if (typeof SetF != 'function')
				throw new TypeError('Function expected');
			Call(SetF, receiver, [ value ]);
			return value;
		}
	}
	else if (hasOwn(desc, 'value')) {
		O[K] = handle(value);
		return value;
	}
	else
		throw new TypeError(
			'Object has a getter without a setter for property "'
			+ K + '"'
		);
}

function SetOwn(obj, key, value, receiver) {
	var K;
	if (obj === null || obj === undefined)
		throw new TypeError('Cannot set property of nil');
	if (!IsObject(obj))
		throw new TypeError('Object expected');
	if (IsWrapper(key)) {
		if ('SetOwn' in key) {
			value = handle(value);
			key.SetOwn(obj, value, receiver);
			return value;
		}
		else
			throw new Error(
				'Object cannot be used as a property key in set operation'
			);
	}
	K = ToString(key);
	if (!(K in obj.Value) || hasOwn(obj.Value, K)
	|| hasOwn(obj, 'Static') && hasOwn(obj.Static, K)) {
		Set(obj, K, value, receiver);
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
	if (!IsObject(obj))
		throw new TypeError('Object expected');
	if (IsWrapper(key)) {
		if ('Delete' in key)
			return !!key.Delete(obj);
		else
			throw new TypeError(
				'Object cannot be used as a property key in delete'
				+ 'operation'
			);
	}
	K = ToString(key);
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
	allKeys = create(null);
	allKeys.length = 0;
	set = create(null);
	o = obj;
	do {
		keys = getOwnPropertyNames(o.Value);
		for (i = 0; i < keys.length; i++) {
			key = keys[i];
			if (!(key in set)) {
				set[key] = true;
				push(allKeys, keys[i]);
			}
		}
	} while (o = getPrototypeOf(o));
	if (hasOwn(obj, 'Static'))
		pushAll(allKeys, getOwnPropertyNames(obj.Static));
	return CreateArray(ArrayProto, allKeys);
}

function GetOwnKeys(obj) {
	var keys;
	if (obj === undefined || obj === null || !IsObject(obj))
		return CreateArray(ArrayProto);
	keys = getOwnPropertyNames(obj.Value);
	if (hasOwn(obj, 'Static'))
		pushAll(keys, getOwnPropertyNames(obj.Static));
	return CreateArray(ArrayProto, keys);
}

function Freeze(obj) {
	if (!IsObject(obj))
		throw new TypeError('Object expected');
	freeze(obj.Value);
	if (hasOwn(obj, 'Static'))
		freeze(obj.Static);
	return obj;
}

function GetDescriptor(obj, key) {
	var O, isStatic = false;
	if (!IsObject(obj))
		throw new TypeError('Object expected');
	// TODO: what if key is a symbol or private symbol?
	if (IsWrapper(key) && 'SymbolId' in key) {
		key = key.SymbolId;
		if (hasOwn(obj, 'StaticSymbols') && hasOwn(obj.StaticSymbols, key)) {
			isStatic = true;
			O = obj.StaticSymbols;
		}
		else if (key in obj)
			O = obj;
		else
			return undefined;
	} else {
		key = ToString(key);
		if (hasOwn(obj, 'Static') && hasOwn(obj.Static, key)) {
			isStatic = true;
			O = obj.Static;
		}
		else if (key in obj.Value)
			O = obj.Value;
		else
			return undefined;
	}
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
	if (!IsObject(obj))
		throw new TypeError('Object expected');
	key = ToString(key);
	if (hasOwn(obj.Value, key)
	|| hasOwn(obj, 'Static') && hasOwn(obj.Static, key))
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
		d.enumerable = false;
		desc[key] = d;
	}

	return desc;

}

function getUncommonPropertyNames(from, compareWith) {

	var namesMap = create(null),
		names = concatUncommonNames(from, compareWith),
		keys = create(null), name;
	keys.length = 0;

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
	if (Object(from) != from
		|| from === compareWith
		|| isPrototypeOf(from, compareWith)) return [ ];
	return concat(getOwnPropertyNames(from),
		concatUncommonNames(getPrototypeOf(from), compareWith));
}

function Like(obj) {
	if (obj === undefined)
		obj = null;
	if (obj !== null && !IsObject(obj))
		throw new TypeError('Object expected');
	return CreateObject(obj);
}

function New(obj, args) {
	if (!IsObject(obj))
		throw new TypeError('Object expected');
	var newObj = CreateObject(obj),
		init = Get(newObj, 'init');
	if (IsCallable(init))
		Call(init, newObj, args);
	return newObj;
}

function mixin(mixinWhat, mixinWith) {

	if (Object(mixinWhat) != mixinWhat)
		throw new TypeError('Object expected');

	if (!isExtensible(mixinWhat))
		throw new Error('Cannot mixin on non-exensible object');

	if (Object(mixinWith) != mixinWith)
		throw new TypeError('Object expected');

	var keys = getUncommonPropertyNames(mixinWith, mixinWhat),
		key, whatDesc, withDesc;

	for (var i = 0; i < keys.length; i++) {
		key = keys[i];
		whatDesc = own(getPropertyDescriptor(mixinWhat, name));
		withDesc = own(getPropertyDescriptor(mixinWith, name));

		if (!whatDesc || whatDesc.configurable)
			// If mixinWhat does not already have the property, or if mixinWhat
			// has the property and it's configurable, add it as is.
			define(mixinWhat, name, withDesc);
		else if (whatDesc.writable && 'value' in withDesc)
			// If the property is writable and the withDesc has a value, write the value.
			mixinWhat[name] = withDesc.value;
	}

	return mixinWhat;

}

function Mixin(to, from) {
	if (!IsObject(to))
		throw new TypeError('Object expected');
	// Mixin with nil as the second arg is ignored.
	if (from === null || from === undefined)
		return to;
	if (!IsObject(from))
		throw new TypeError('Object expected');
	mixin(to.Value, from.Value);
	if (hasOwn(from, 'Static')) {
		if (!hasOwn(to, 'Static'))
			to.Static = create(null);
		mixin(to.Static, from.Static);
	}
	return to;
}

function GetPrototype(obj) {
	if (!IsObject(obj))
		throw new TypeError('Object expected');
	return getPrototypeOf(obj);
}

function Define(obj, kind, key, value, isStatic, writable, configurable) {
	// TODO: Permit this operation on wrappers?
	if (!IsObject(obj))
		throw new TypeError('Object expected');
	var O, desc = create(null), prop,
		isSymbol = IsWrapper(key) && 'SymbolId' in key;
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
		O = obj;
	else
		O = obj.Value;
	kind = ToString(kind);
	if (isSymbol)
		key = key.SymbolId;
	else if (typeof key != 'string')
		throw new TypeError('Expected string or symbol');
	if (kind == 'value')
		desc.value = value;
	else if (kind == 'get') {
		if (!IsCallable(value))
			throw new TypeError('Function expected');
		desc.get = function() {
			return Call(value, this, [ ]);
		};
		desc.get.__ProtoFunction__ = value;
	}
	else if (kind == 'set') {
		if (!IsCallable(value))
			throw new TypeError('Function expected');
		desc.set = function(v) {
			return Call(value, this, [ v ]);
		};
		desc.get.__ProtoFunction__ = value;
	}
	else
		throw new Error('Invalid kind: "' + kind + '"');
	desc.writable = ToBoolean(writable);
	desc.configurable = ToBoolean(configurable);
	desc.enumerable = false;
	defineProperty(O, key, desc);
	return obj;
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
	if (Object(obj) !== obj)
		throw new TypeError('Object expected');
	K = String(key);
	do {
		desc = getOwnPropertyDescriptor(obj, K);
	} while (desc === undefined && (obj = getPrototypeOf(obj)));
	return desc;
}