var jsonStringify = JSON.stringify,
	jsonParse = JSON.parse,

	globals = own({

		Object: ObjectProto,
		Boolean: BooleanProto,
		Number: NumberProto,
		String: StringProto,
		Array: ArrayProto,
		Function: FunctionProto,
		Range: RangeProto,
		Symbol: SymbolProto,
		Slot: SlotProto,
		Generator: GeneratorProto,
		Date: DateProto,
		reflect: reflect,
		inf: Infinity,
		NaN: NaN,

		Error: CreatePrototype({
			init: function(message) {
				SetOwn(this, 'message', message);
			}
		}),
		
		console: console,

		boolean: CreateFunction(undefined, function(value) {
			return ToBoolean(value);
		}),

		number: CreateFunction(undefined, function(value) {
			return ToNumber(value);
		}),

		int: CreateFunction(undefined, function(value) {
			return ToInteger(value);
		}),

		// TODO: Rename `whole` and make upperbound larger than 2^32?
		// TODO: Provide `natural` as well?
		uint: CreateFunction(undefined, function(value) {
			return ToUint32(value);
		}),

		string: CreateFunction(undefined, function(value) {
			return ToString(value);
		}),

		function: CreateFunction(undefined, function(value) {
			if (!IsCallable(value))
				throw new TypeError('Function expected');
			return value;
		}),

		object: CreateFunction(undefined, function(value) {
			return ToObject(value);
		}),

		sleep: CreateFunction(undefined, function(interval) {
			return Sleep(interval);
		}),

		Math: CreatePrototype({
			ceil: function(value) {
				return ceil(value);
			}
		}),

		JSON: CreatePrototype({
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
		})
	});

function GetBuiltInGlobal(name) {
	return globals[name];
}