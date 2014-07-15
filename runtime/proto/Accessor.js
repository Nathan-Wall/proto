// This is for internal use only
var AccessorProto = CreatePrototype({ });

function IsAccessor(obj) {
	if (!IsObject(obj))
		return false;
	return Has(obj, $$accessorGet);
}

function CreateAccessor() {
	var obj = CreateObject(AccessorProto);
	DefineValue(obj, $$accessorGet, null);
	DefineValue(obj, $$accessorSet, null);
	return obj;
}

function DefineAccessorGet(acc, fn) {
	if (!IsAccessor(acc))
		throw new TypeError('Accessor expected');
	ExpectFunction(fn);
	DefineValue(acc, $$accessorGet, fn);
}

function DefineAccessorSet(acc, fn) {
	if (!IsAccessor(acc))
		throw new TypeError('Accessor expected');
	ExpectFunction(fn);
	DefineValue(acc, $$accessorSet, fn);
}

function IfAccessorGet(acc, receiver) {
	if (!IsAccessor(acc))
		return acc;
	return Call(Get(acc, $$accessorGet), receiver, [ ]);
}

function CallAccessorSet(acc, receiver, value) {
	if (!IsAccessor(acc))
		throw new TypeError('Accessor expected');
	return Call(Get(acc, $$accessorSet), receiver, [ value ]);
}