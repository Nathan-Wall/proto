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
	global_console = console;

function global_boolean(value) {
	return ToBoolean(value);
}

function global_number(value) {
	return ToNumber(value);
}

function global_int(value) {
	return ToInteger(value);
}

// TODO: Rename `whole` and make upperbound larger than 2^32?
// TODO: Provide `natural` as well?
function global_uint(value) {
	return ToUint32(value);
}
	
function global_string(value) {
	return ToString(value);
}

function global_function(value) {
	if (!IsCallable(value))
		throw new TypeError('Function expected');
	return value;
}

function global_object(value) {
	return ToObject(value);
}

function global_setTimeout(f, interval) {
	return SetTimeout(f, interval);
}
