var Object = global.Object,
	Number = global.Number,
	String = global.String,
	Error = global.Error,
	TypeError = global.TypeError,
	RangeError = global.RangeError,
	Infinity = global.Infinity,

	lazyBind = Function.prototype.bind.bind(Function.prototype.call),
	lazyTie = Function.prototype.bind.bind(Function.prototype.apply),

	create = Object.create,
	getPrototypeOf = Object.getPrototypeOf,
	isExtensible = Object.isExtensible,
	freeze = Object.freeze,
	keys = Object.keys,
	defineProperty = Object.defineProperty,
	getOwnPropertyNames = Object.getOwnPropertyNames,
	getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor,
	isArray = Array.isArray,
	min = Math.min,
	max = Math.max,
	floor = Math.floor,
	abs = Math.abs,
	pow = Math.pow,

	hasOwn = lazyBind(Object.prototype.hasOwnProperty),
	isPrototypeOf = lazyBind(Object.prototype.isPrototypeOf),
	call = lazyBind(Function.prototype.call),
	apply = lazyBind(Function.prototype.apply),
	bind = lazyBind(Function.prototype.bind),
	// TODO: Is there a reason to have both `bind` and `lazyBind`?
	// Maybe using `bind(f, o)` is more performant instead of `lazyBind(f, o)`?
	// If not, maybe just get rid of `bind` and rename `lazyBind` to `bind`?
	tie = lazyTie,
	join = lazyBind(Array.prototype.join),
	push = lazyBind(Array.prototype.push),
	pushAll = lazyTie(Array.prototype.push),
	concat = lazyBind(Array.prototype.concat),
	pop = lazyBind(Array.prototype.pop),
	shift = lazyBind(Array.prototype.shift),
	slice = lazyBind(Array.prototype.slice),
	splice = lazyBind(Array.prototype.splice),
	_splice = Array.prototype.splice,
	charAt = lazyBind(String.prototype.charAt),
	stringSlice = lazyBind(String.prototype.slice),
	test = lazyBind(RegExp.prototype.test),

	MAX_PRECISION = pow(2, 53),
	MAX_UINT = pow(2, 32) - 1,

	// This is being done instead of `CreateObject(null)` to avoid a cycle which
	// is very difficult to deal with in the builder.
	ObjectProto = (function() {
		var o = create(null);
		o.Value = create(null);
		return o;
	})(),
	NumberProto = CreateObject(ObjectProto),
	StringProto = CreateObject(ObjectProto),
	DateProto = CreateObject(ObjectProto),

	$$get = CreateSymbolPrimitive('@get', 'Get'),
	$$getOwn = CreateSymbolPrimitive('@getOwn', 'GetOwn'),
	$$has = CreateSymbolPrimitive('@has', 'Has'),
	$$hasOwn = CreateSymbolPrimitive('@hasOwn', 'HasOwn'),
	$$set = CreateSymbolPrimitive('@set', 'Set'),
	$$setOwn = CreateSymbolPrimitive('@setOwn', 'SetOwn'),
	$$delete = CreateSymbolPrimitive('@delete', 'Delete'),
	$$iterator = CreateSymbolPrimitive('@iterator', 'Iterator'),
	$$toComparable = CreateSymbolPrimitive('@toComparable', 'ToComparable'),

	I = function I(value) { return value; },
	NOOP = function() { },

	identifiers = new Identifiers();

// TODO: Probably replace with ToIterable once iterables are worked out
function ToArray(value) {
	if (!IsObject(value))
		throw new TypeError('Object expected');
	if (IsLike(value, ArrayProto))
		return value;
	var r = create(null);
	r.length = 0;
	if (('From' in value) && ('To' in value)) {
		if (value.From === Infinity || value.From === -Infinity
		|| value.To === Infinity || value.To === -Infinity)
			throw new RangeError('Infinite range');
		if (value.From < value.To)
			for (var i = value.From; i < value.To; i++)
				push(r, i);
		else
			for (var i = value.From; i > value.To; i--)
				push(r, i);				
		return CreateArray(undefined, r);
	}
	throw new TypeError('Object is not iterable');
}

function ToObject(value) {
	var type;
	if (IsObject(value))
		return value;
	switch (type = ToType(value)) {
		case 'nil':
			return CreateObject(undefined);
		case 'boolean':
			return CreateBoolean(undefined, value);
		case 'number':
			return CreateNumber(undefined, value);
		case 'string':
			return CreateString(undefined, value);
		case 'symbol':
			return CreateSymbol(undefined, value);
		default:
			throw new TypeError('Unknown type "' + type + '"');
	}
}

function ToType(value) {
	if (value === null || value === undefined)
		return 'nil';
	if (value.Primitive)
		return value.Type;
	// Note that since functions are wrapped, the return value should be
	// "object".
	return typeof value;
}

function arrayMerge(/* ...arrays */) {
	var r = create(null);
	r.length = 0;
	for (var i = 0, arg; i < arguments.length; i++) {
		arg = arguments[i];
		if (isArray(arg))
			pushAll(r, arg);
		else
			pushAll(r, arg.Value);
	}
	return slice(r);
}

function arraySlice(array, from, to) {
	return slice(array, from, to);
}

function spliceAll(array, index, count, elements) {
	return apply(_splice, array, arrayMerge([ index, count ], slice(elements)));
}

// TODO: This may not be being used...
function own(obj) {
	if (Object(obj) !== obj)
		throw new TypeError('Object expected');
	var O = create(null),
		keys = getOwnPropertyNames(obj);
	for (var i = 0, key; i < keys.length; i++) {
		key = keys[i];
		define(O, key, getOwnPropertyDescriptor(obj, key));
	}
	return O;
}

function proxyJs(value) {
	if (Object(value) !== value)
		return value;
	var p = CreateObject(null);
	// TODO: How will this work with inheritance?
	p.ProxyJs = true;
	p.Value = value;
	if (typeof value == 'function')
		p.Function = function() {
			var receiver = this,
				args = create(null);
			args.length = 0;
			if (IsObject(receiver))
				receiver = receiver.Value;
			for (var i = 0, arg; i < arguments.length; i++) {
				arg = arguments[i];
				if (IsWrapper(arg)) {
					if (arg.ProxyJs)
						arg = UnproxyJs(arg);
					else
						arg = UnwrapProto(arg);
				}
				push(args, arg);
			}
			return proxyJs(apply(value, receiver, args));
		};
	return p;
}

function UnproxyJs(value) {
	if (IsObject(value))
		return value.Value;
	return value;
}

// TODO: Some work will probably need to be done on this for functions...
function UnwrapProto(value) {
	var res, V, ks;
	if (!IsWrapper(value))
		return value;
	// primitive extensions, like symbols, can't be passed out of the system
	if (value.Primitive)
		return undefined;
	if ('Function' in value)
		return value.Function;
	V = value.Value;
	res = create(UnwrapProto(getPrototypeOf(value)));
	ks = getOwnPropertyNames(V);
	for (var i = 0, k, d; i < ks.length; i++) {
		k = ks[i];
		d = getOwnPropertyDescriptor(V, k);
		if (hasOwn(d, 'value'))
			d.value = UnwrapProto(d.value);
		if (hasOwn(d, 'get'))
			d.get = UnproxyProtoFunction(d.get);
		if (hasOwn(d, 'set'))
			d.set = UnproxyProtoFunction(d.set);
		define(res, k, d);
	}
	return res;
}

// TODO: Copy properties from the __ProtoFunction__?
function UnproxyProtoFunction(F) {
	return function() {
		var args = create(null);
		args.length = 0;
		for (var i = 0; i < arguments.length; i++)
			args[i] = proxyJs(arguments[i]);
		apply(F, proxyJs(this), args);
	};
}

function __convertFunctions__(obj) {
	var ret = CreateObject(null),
		K = getOwnPropertyNames(obj);
	for (var i = 0, k; i < K.length; i++) {
		k = K[i];
		if (typeof obj[k] == 'function')
			ret.Value[k] = CreateFunction(FunctionProto, obj[k]);
	}
	return ret;
}

function SetTimeout(f, interval) {
	if (!IsCallable(f))
		throw new TypeError('Function expected');
	interval = ToNumber(interval) >>> 0;
	// TODO: Cancel mechanism
	// TODO: Override existing setTimeout (and/or clearTimeout?) to
	// guarantee integrity.
	setTimeout(f.Function, interval);
}

function SetInterval(f, interval) {
	// TODO
}

function NilCoalesce(left, right) {
	var test = Call(left, undefined, [ ]);
	if (test === undefined || test === null)
		return Call(right, undefined, [ ]);
	return test;
}

// TODO: This currently isn't being used. Remove it?
//
// Creates a wrapper function with the same length as the original.
// Arity is preserved (`length`) but the function's `name` is lost. It is
// possible to preserve the name, but it requires use of `eval` on each
// wrapping.  This implementation only requires `eval` for creating the
// generator, and should be much more performant than one that would
// preserve the name.  Preserving `length` is considered more important
// than preserving `name` because `length` is known to be used by higher-
// order functions (i.e. in mocha).  Nothing utilizing `name` for purposes
// other than debugging is known.
var createWrapper = (function() {

	// Let's memoize wrapper generators to avoid using eval too often.
	var generators = create(null),

		numGenerators = 0,

		// Let's limit length to 512 for now. If someone wants to up it,
		// they can.
		MAX_WRAPPER_LENGTH = 512,

		// Limit the number of generators which are cached to preserve
		// memory in the unusual case that someone creates many generators.
		// We don't go to lengths to make the cache drop old, unused values
		// as there really shouldn't be a need for so many generators in the
		// first place.
		MAX_CACHED_GENERATORS = 64,


	 	// We want to use indirect eval so that implementations can take
	 	// advantage of memory & performance enhancements which are possible
	 	// without direct eval.
		_eval = eval;

	return function createWrapper(/* original, length, f */$0, $1) {

		var original = arguments[0];

		if (typeof original != 'function')
			throw new TypeError('Function expected: ' + original);

		var length, f;

		if (typeof arguments[2] != 'undefined')
			length = arguments[1];
		else
			length = original.length;

		if (typeof arguments[2] != 'undefined')
			f = arguments[2];
		else
			f = arguments[1];

		if (length < 0)
			length = 0;
		length = length >>> 0;
		if (length > MAX_WRAPPER_LENGTH)
			throw new Error(
				'Maximum length allowed is '
				+ MAX_WRAPPER_LENGTH + ': ' + length
			);

		var args = create(null),
			generator = generators[length];

		args.length = 0;

		if (typeof f != 'function')
			throw new TypeError('Function expected: ' + f);

		if (!generator) {

			for (var i = 0; i < length; i++)
				push(args, '$' + i);

			generator = _eval(
				'(function(wrapF, original, apply) {'
					+ '"use strict";'
					+ 'var wrapper = function(' + join(args, ',') + ') {'
						+ 'return apply(wrapF, this, arguments);'
					+ '};'
					// TODO: Come up with a good way to keep up with the
					// original?
					//+ 'wrapper.original = original;'
					+ 'return wrapper;'
				+ '})'
			);

			if (numGenerators < MAX_CACHED_GENERATORS) {
				generators[length] = generator;
				numGenerators++;
			}

		}

		return generator(f, original, apply, _eval);

	};

})();

function toWrapped() {
	return Freeze(__convertFunctions__(this));
}

// return freeze({

// 	Object: ObjectProto,
// 	Boolean: BooleanProto,
// 	Number: NumberProto,
// 	String: StringProto,
// 	Array: ArrayProto,
// 	Function: FunctionProto,
// 	Date: DateProto,
// 	Range: RangeProto,
// 	Symbol: SymbolProto,
// 	Slot: SlotProto,
// 	Generator: GeneratorProto,
// 	Promise: PromiseProto,
// 	reflect: reflect,

// 	ToBoolean: ToBoolean,
// 	ToNumber: ToNumber,
// 	ToUint32: ToUint32,
// 	ToString: ToString,
// 	ToArray: ToArray,
// 	ToObject: ToObject,
// 	ToComparable: ToComparable,
// 	ToType: ToType,

// 	CreateObject: CreateObject,
// 	CreateArray: CreateArray,
// 	CreateFunction: CreateFunction,
// 	CreateRange: CreateRange,
// 	CreateSymbol: CreateSymbol,
// 	CreateSymbolPrimitive: CreateSymbolPrimitive,
// 	SymbolInit: SymbolInit,
// 	CreateSlot: CreateSlot,
// 	SlotInit: SlotInit,
// 	CreateGeneratorFunction: CreateGeneratorFunction,
// 	GeneratorInit: GeneratorInit,
// 	GeneratorNext: GeneratorNext,
// 	GeneratorThrow: GeneratorThrow,
// 	PromiseInit: PromiseInit,
// 	PromiseThen: PromiseThen,
// 	CastToPromise: CastToPromise,
// 	PromiseAll: PromiseAll,
// 	CreateAsyncFunction: CreateAsyncFunction,

// 	Is: Is,
// 	Like: Like,
// 	IsLike: IsLike,
// 	New: New,
// 	Mixin: Mixin,

// 	bind: bind,
// 	Bind: Bind,
// 	arrayMerge: arrayMerge,
// 	arraySlice: arraySlice,
// 	CheckSpread: CheckSpread,
// 	AsCoercive: AsCoercive,

// 	GetPrototype: GetPrototype,
// 	Own: Own,

// 	Has: Has,
// 	HasOwn: HasOwn,
// 	Get: Get,
// 	GetOwn: GetOwn,
// 	Set: Set,
// 	SetOwn: SetOwn,
// 	Delete: Delete,
// 	GetDescriptor: GetDescriptor,
// 	GetOwnDescriptor: GetOwnDescriptor,
// 	Call: Call,
// 	CallMethod: CallMethod,
// 	CallOwnMethod: CallOwnMethod,
// 	PartiallyApply: PartiallyApply,

// 	IsObject: IsObject,
// 	IsCallable: IsCallable,
// 	GetOwnKeys: GetOwnKeys,

// 	Pow: Pow,

// 	Slice: Slice,
// 	SliceOwn: SliceOwn,

// 	SetTimeout: SetTimeout,
// 	SetInterval: SetInterval,

// 	NilCoalesce: NilCoalesce,

// 	proxyJs: proxyJs,

// 	Infinity: Infinity,

// 	'@toString': CreateSymbolPrimitive('@toString', 'ToString'),
// 	'@get': CreateSymbolPrimitive('@get', 'Get'),
// 	'@iterator': $iterator,
// 	'@toComparable': $toComparable,
// 	// ... TODO: Do others

// 	toWrapped: 

// });