var global_Object = ObjectProto,
	global_Boolean = BooleanProto,
	global_Number = NumberProto,
	global_String = StringProto,
	global_Array = ArrayProto,
	global_Function = FunctionProto,
	global_Range = RangeProto,
	global_Symbol = SymbolProto,
	global_Slot = SlotProto,
	global_Generator = GeneratorProto,
	global_Promise = PromiseProto,
	global_reflect = reflect,
	global_inf = Infinity,
	global_NaN = NaN,
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

	global_setTimeout = CreateFunction(undefined, function(value) {
		return SetTimeout(f, interval);
	}),

	global_Math = CreatePrototype({
		ceil: function(value) {
			return ceil(value);
		}
	});
