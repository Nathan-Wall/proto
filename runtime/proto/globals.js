var jsonStringify = JSON.stringify,
	jsonParse = JSON.parse,

	global_Object = ObjectProto,
	global_Boolean = BooleanProto,
	global_Number = NumberProto,
	global_String = StringProto,
	global_Array = ArrayProto,
	global_Function = FunctionProto,
	global_Range = RangeProto,
	global_Symbol = SymbolProto,
	global_Slot = SlotProto,
	global_Generator = GeneratorProto,
	global_Date = DateProto,
	global_reflect = reflect,
	global_inf = Infinity,
	global_NaN = NaN,
	global_Error = CreatePrototype({
		init: function(message) {
			SetOwn(this, 'message', message);
		}
	}),
	global_console = console,

	global_boolean = CreateFunction(undefined, function(value) {
		return ToBoolean(value);
	}),

	global_number = CreateFunction(undefined, function(value) {
		return ToNumber(value);
	}),

	global_int = CreateFunction(undefined, function(value) {
		return ToInteger(value);
	}),

	// TODO: Rename `whole` and make upperbound larger than 2^32?
	// TODO: Provide `natural` as well?
	global_uint = CreateFunction(undefined, function(value) {
		return ToUint32(value);
	}),

	global_string = CreateFunction(undefined, function(value) {
		return ToString(value);
	}),

	global_function = CreateFunction(undefined, function(value) {
		if (!IsCallable(value))
			throw new TypeError('Function expected');
		return value;
	}),

	global_object = CreateFunction(undefined, function(value) {
		return ToObject(value);
	}),

	global_setTimeout = CreateFunction(undefined, function(callback, interval) {
		return SetTimeout(callback, interval);
	}),

	global_setInterval = CreateFunction(undefined, function(callback, interval) {
		return SetInterval(callback, interval);
	}),

	global_Math = CreatePrototype({
		ceil: function(value) {
			return ceil(value);
		}
	}),

	global_JSON = CreatePrototype({
		stringify: function(value, replacer, space) {
			// TODO: Static properties
			// TODO: Does this work with nested objects?
			if (IsWrapper(value))
				return jsonStringify(value.Value, replacer, space);
			else
				return jsonStringify(value);
		},
		parse: function(value, reviver) {
			// TODO: More direct algorithm? Get rid of using proxyJs here?
			return proxyJs(jsonParse(value, reviver));
		}
	});
