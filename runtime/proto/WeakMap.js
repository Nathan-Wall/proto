// This implementation is very closely based on the 2014-05-22 ES6 draft for
// WeakMap.

var weakMapIds = new Identifiers();

var WeakMapProto = CreatePrototype({

	init: function init(iterable) {
		WeakMapInit(this, iterable);
	},

	clear: function clear() {
		ClearWeakMap(this);
	},

	delete: function delete_(key) {
		return WeakMapDelete(this, key);
	},

	get: function get(key) {
		return WeakMapGet(this, key);
	},

	has: function has(key) {
		return WeakMapHas(this, key);
	},

	set: function set(key, value) {
		return WeakMapSet(this, key, value);
	}

});

function ExpectWeakMap(M) {
	if (!IsWeakMap(M))
		throw new TypeError('WeakMap expected');
	return M;
}

function WeakMapInit(map, iterable) {

	var iter, adder, next, nextValue, k, v;

	ExpectObject(map);
	if (HasOwn(map, $$weakMapId))
		throw new TypeError('WeakMap has already been initialized');

	// Setting to 'initializing' temporarily in case side effects from the
	// steps below try to initialize the map again.
	Set(map, $$weakMapId, 'initializing');

	if (iterable != null) {
		iter = GetIterator(iterable);
		adder = Get(map, 'set');
		if (!IsCallable(adder)) {
			Delete(map, $$weakMapId);
			throw new TypeError('Expected `set` method on WeakMap object');
		}
	}

	Set(map, $$weakMapId, weakMapIds.next());

	if (iter === undefined)
		return;

	while ((next = IteratorStep(iter)) !== false) {
		nextValue = IteratorValue(next);
		ExpectObject(nextValue);
		k = Get(nextValue, '0');
		v = Get(nextValue, '1');
		status = Call(adder, map, [ k, v ]);
	}

}

function IsWeakMap(map) {
	var wmId;
	if (!IsObject(map))
		return false;
	wmId = Get(map, $$weakMapId);
	return wmId !== undefined && wmId !== 'initializing';
}

function ClearWeakMap(M) {
	ExpectWeakMap(M);
	while (!HasOwn(M, $$weakMapId))
		M = getPrototype(M);
	Set(M, $weakMapId, weakMapIds.next());
}

function WeakMapDelete(M, key) {
	var wmId, wmValue;
	ExpectWeakMap(M);
	if (!IsObject(key) || !HasOwn(key, $$weakMapValue))
		return false;
	wmId = Get(M, $$weakMapId);
	wmValue = Get(key, $$weakMapValue);
	if (!(wmId in wmValue))
		return false;
	return delete wmValue[wmId];
}

function WeakMapGet(M, key) {
	ExpectWeakMap(M);
	if (!IsObject(key) || !HasOwn(key, $$weakMapValue))
		return undefined;
	return Get(key, $$weakMapValue)[Get(M, $$weakMapId)];
}

function WeakMapHas(M, key) {
	ExpectWeakMap(M);
	if (!IsObject(key) || !HasOwn(key, $$weakMapValue))
		return false;
	return Get(M, $$weakMapId) in Get(key, $$weakMapValue);
}

function WeakMapSet(M, key, value) {
	var wmKey;
	ExpectWeakMap(this);
	if (!IsObject(key))
		throw new TypeError('WeakMap keys must be an objects');
	wmKey = Get(key, $$weakMapValue);
	if (wmKey === undefined)
		wmKey = Set(key, $$weakMapValue, create(null));
	return wmKey[Get(M, $$weakMapId)] = value;
}
