// This is for internal use only
var AccessorProto = CreatePrototype({ });

function IsAccessor(obj) {
	if (!IsObject(obj))
		return false;
	return 'AccessorGet' in obj;
}

function CreateAccessor() {
	var obj = CreateObject(AccessorProto);
	obj.AccessorGet = null;
	obj.AccessorSet = null;
	return obj;
}

function DefineAccessorGet(acc, fn) {
	if (!IsAccessor(acc))
		throw new TypeError('Accessor expected');
	if (!IsCallable(fn))
		throw new TypeError('Function expected');
	acc.AccessorGet = fn;
}

function DefineAccessorSet(acc, fn) {
	if (!IsAccessor(acc))
		throw new TypeError('Accessor expected');
	if (!IsCallable(fn))
		throw new TypeError('Function expected');
	acc.AccessorSet = fn;
}

function IfAccessorGet(acc, receiver) {
	if (!IsAccessor(acc))
		return acc;
	return Call(acc.AccessorGet, receiver, [ ]);
}

function CallAccessorSet(acc, receiver, value) {
	if (!IsAccessor(acc))
		throw new TypeError('Accessor expected');
	return Call(acc.AccessorSet, receiver, [ value ]);
}