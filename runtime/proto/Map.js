// This implementation is very closely based on the 2014-05-22 ES6 draft for
// Map.

var curMapId = createSack([ MIN_PRECISION ]),

	MAP_DELETED = create(null),
	MAP_ITER_KEY = 1,
	MAP_ITER_VALUE = 2;

var MapProto = CreatePrototype({

	init: function init(iterable) {
		MapInit(this, iterable);
	},

	clear: function clear() {
		ClearMap(this);
	},

	delete: function delete_(key) {
		return MapDelete(this, key);
	},

	entries: function entries() {
		return CreateMapIterator(this, MAP_ITER_KEY | MAP_ITER_VALUE);
	},

	// Note: forEach is intentionally left out of proto since `for..of` can
	// be used for the same purpose and has the benefit of allowing breaking.

	get: function get(key) {
		return MapGet(this, key);
	},

	has: function has(key) {
		return MapHas(this, key);
	},

	keys: function keys() {
		return CreateMapIterator(this, MAP_ITER_KEY);
	},

	set: function set(key, value) {
		return MapSet(this, key, value);
	},

	// TODO
	// get size() {
	// 	var M = ExpectMap(this);
	// 	return M.MapSize;
	// },

	values: function values() {
		return CreateMapIterator(this, MAP_ITER_VALUE);
	},

	'@Iterator': function iterator() {
		return CreateMapIterator(this, MAP_ITER_KEY | MAP_ITER_VALUE);
	}

});

// This should be called without the `index` argument. That argument is used
// for recursion.
function nextMapId(index) {
	if (index === undefined)
		index = 0;
	curMapId[index]++;
	if (curMapId[index] > MAX_PRECISION) {
		curMapId[index] = MIN_PRECISION;
		if (curMapId.length == index + 1)
			push(curMapId, MIN_PRECISION);
		else
			nextMapId(index + 1);
	}
	return join(curMapId, '.');
}

function ExpectMap(M) {
	if (!IsMap(M))
		throw new TypeError('Map expected');
	return M;
}

function MapInit(map, iterable) {

	var iter, adder, next, nextValue, k, v;

	ExpectObject(map);
	if (hasOwn(map, 'MapKeys'))
		throw new TypeError('Map has already been initialized');

	// Setting to 'initializing' temporarily in case side effects from the
	// steps below try to initialize the map again.
	map.MapKeys = 'initializing';
	map.MapPrimitiveHashValues = 'initializing';
	map.MapPrimitiveHashIndices = 'initializing';
	map.MapId = 'initializing';
	map.MapSize = 'initializing';

	if (iterable != null) {
		iter = GetIterator(iterable);
		adder = Get(map, "set");
		if (!IsCallable(adder)) {
			delete map.MapKeys;
			delete map.MapPrimitiveHashValues;
			delete map.MapPrimitiveHashIndices;
			delete map.MapId;
			delete map.MapSize;
			throw new TypeError('Expected `set` method on Map object');
		}
	}

	ClearMap(map, true);

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

function IsMap(map) {
	var mKeys;
	if (!IsObject(map))
		return false;
	mKeys = map.MapKeys;
	return mKeys !== undefined && mKeys !== 'initializing';
}

function ClearMap(map, skipValidation) {
	if (!skipValidation) {
		ExpectMap(map);
		while (!hasOwn(map, 'MapKeys'))
			map = getPrototype(map);
	}
	map.MapKeys = createSack();
	map.MapPrimitiveHashValues = create(null);
	map.MapPrimitiveHashIndices = create(null);
	map.MapId = nextMapId();
	map.MapSize = 0;
}

function MapDeleteIndex(map, index) {
	// TODO: Every once in a while lets run through and clean this up
	// by removing the deleted items.
	// The clean-up operation should be O(n), but since we don't do
	// it every time, `delete` can be faster than O(n) sometimes.
	M.MapKeys[index] = MAP_DELETED;
}

function MapGet(M, key) {
	var mId, keyHash;
	M = ExpectMap(M);
	if (IsWrapper(key)) {
		if (!hasOwn(key, 'MapValue'))
			return undefined;
		mId = M.MapId;
		if (!(mId in key.MapValue))
			return undefined;
		return key.MapValue[mId];
	}
	else {
		keyHash = typeof key + ':' + key;
		return M.MapPrimitiveHashValues[keyHash];
	}
}

function MapHas(M, key) {
	var keyHash;
	ExpectMap(M);
	if (IsWrapper(key)) {
		if (!hasOwn(key, 'MapValue'))
			return false;
		return M.MapId in key.MapValue;
	}
	else {
		keyHash = typeof key + ':' + key;
		return keyHash in M.MapPrimitiveHashValues;
	}
}

function MapDelete(M, key) {
	var mId, keyHash;
	M = ExpectMap(M);
	if (IsWrapper(key)) {
		if (!hasOwn(key, 'MapValue'))
			return false;
		mId = M.MapId;
		if (!(mId in key.MapValue))
			return false;
		MapDeleteIndex(map, key.MapIndex[mId]);
		delete key.MapValue[mId];
		delete key.MapIndex[mId];
		M.MapSize--;
		return true;
	}
	else {
		keyHash = typeof key + ':' + key;
		if (!(keyHash in M.MapPrimitiveHashValues))
			return false;
		MapDeleteIndex(map, M.MapPrimitiveHashIndices[keyHash]);
		delete M.MapPrimitiveHashValues[keyHash];
		delete M.MapPrimitiveHashIndices[keyHash];
		M.MapSize--;
		return true;
	}
}

function MapSet(M, key, value) {
	var mId, keyHash;
	ExpectMap(M);
	if (IsWrapper(key)) {
		mId = M.MapId;
		if (!hasOwn(key, 'MapValue'))
			key.MapValue = create(null);
		else if (!(mId in key.MapValue)) {
			key.MapIndex[mId] = M.MapKeys.length;
			push(M.MapKeys, key);
			M.MapSize++;
		}
		key.MapValue[mId] = value;
	}
	else {
		keyHash = typeof key + ':' + key;
		if (!(keyHash in M.MapPrimitiveHashValues)) {
			M.MapPrimitiveHashIndices[keyHash] = M.MapKeys.length;
			push(M.MapKeys, key);
			M.MapSize++;
		}
		M.MapPrimitiveHashValues[keyHash] = value;
	}
	return value;
}

function CreateMapIterator(map, kind) {
	var iterator;
	ExpectMap(map);
	iterator = CreateObject(MapIteratorPrototype);
	iterator.MapIteratorMap = map;
	iterator.MapIteratorNextIndex = 0;
	iterator.MapIteratorKind = kind;
	return iterator;
}


var MapIteratorPrototype = CreatePrototype({

	next: function next() {
		var O, m, index, itemKind, keys, key, result;
		O = ExpectObject(O);
		if (!('MapIteratorMap' in O))
			throw new TypeError('MapIterator expected');
		m = O.MapIteratorMap;
		index = O.MapIteratorNextIndex;
		itemKind = O.MapIteratorKind;
		if (m === undefined)
			return CreateIterResultObject(undefined, true);
		ExpectMap(m);
		keys = m.MapKeys;
		while (index < keys.length) {
			key = keys[index];
			O.MapIteratorNextIndex = ++index;
			if (key !== MAP_DELETED) {
				switch (itemKind) {
					case MAP_ITER_KEY:
						result = key;
						break;
					case MAP_ITER_VALUE:
						result = MapGet(m, key);
						break;
					case MAP_ITER_KEY | MAP_ITER_VALUE:
						result = CreateArray(undefined, [
							key, MapGet(m, key)
						]);
						break;
					default:
						throw new Error('Unexpected itemKind');
				}
				return CreateIterResultObject(result, false);
			}
		}
		O.MapIteratorMap = undefined;
		return CreateIterResultObject(undefined, true);
	},

	'@Iterator': function() { return this; }

});
