// This implementation is very closely based on the 2014-05-22 ES6 draft for
// WeakMap.

var curWeakMapId = createSack([ MIN_PRECISION ]);

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

// This should be called without the `index` argument. That argument is used
// for recursion.
function nextWeakMapId(index) {
	if (index === undefined)
		index = 0;
	curWeakMapId[index]++;
	if (curWeakMapId[index] > MAX_PRECISION) {
		curWeakMapId[index] = MIN_PRECISION;
		if (curWeakMapId.length == index + 1)
			push(curWeakMapId, MIN_PRECISION);
		else
			nextWeakMapId(index + 1);
	}
	return join(curWeakMapId, '.');
}

function ExpectWeakMap(M) {
	if (!IsWeakMap(M))
		throw new TypeError('WeakMap expected');
	return M;
}

function WeakMapInit(map, iterable) {

	var iter, adder, next, nextValue, k, v;

	ExpectObject(map);
	if (hasOwn(map, 'WeakMapId'))
		throw new TypeError('WeakMap has already been initialized');

	// Setting to 'initializing' temporarily in case side effects from the
	// steps below try to initialize the map again.
	map.WeakMapId = 'initializing';

	if (iterable != null) {
		iter = GetIterator(iterable);
		adder = Get(map, "set");
		if (!IsCallable(adder)) {
			delete map.WeakMapId;
			throw new TypeError('Expected `set` method on WeakMap object');
		}
	}

	map.WeakMapId = nextWeakMapId();

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
	wmId = map.WeakMapId;
	return wmId !== undefined && wmId !== 'initializing';
}

function ClearWeakMap(M) {
	ExpectWeakMap(M);
	while (!hasOwn(M, 'WeakMapId'))
		M = getPrototype(M);
	M.WeakMapId = nextWeakMapId();
}

function WeakMapDelete(M, key) {
	var wmId;
	ExpectWeakMap(M);
	if (!IsObject(key) || !hasOwn(key, 'WeakMapValue'))
		return false;
	wmId = M.WeakMapId;
	if (!(wmId in key.WeakMapValue))
		return false;
	return delete key.WeakMapValue[wmId];
}

function WeakMapGet(M, key) {
	ExpectWeakMap(M);
	if (!IsObject(key) || !hasOwn(key, 'WeakMapValue'))
		return undefined;
	return key.WeakMapValue[M.WeakMapId];
}

function WeakMapHas(M, key) {
	ExpectWeakMap(M);
	if (!IsObject(key) || !hasOwn(key, 'WeakMapValue'))
		return false;
	return M.WeakMapId in key.WeakMapValue;
}

function WeakMapSet(M, key, value) {
	var wmKey;
	ExpectWeakMap(this);
	if (!IsObject(key))
		throw new TypeError('WeakMap keys must be an objects');
	wmKey = key.WeakMapValue;
	if (wmKey === undefined)
		wmKey = key.WeakMapValue = create(null);
	return wmKey[M.WeakMapId] = value;
}
