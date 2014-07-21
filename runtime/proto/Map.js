// This implementation is very closely based on the 2014-05-22 ES6 draft for
// Map.

var mapIds = new Identifiers(),

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

	'@@iterator': function iterator() {
		return CreateMapIterator(this, MAP_ITER_KEY | MAP_ITER_VALUE);
	}

});

function ExpectMap(M) {
	if (!IsMap(M))
		throw new TypeError('Map expected');
	return M;
}

function MapInit(map, iterable) {

	var iter, adder, next, nextValue, k, v;

	ExpectObject(map);
	if (HasOwn(map, $$mapKeys))
		throw new TypeError('Map has already been initialized');

	// Setting to 'initializing' temporarily in case side effects from the
	// steps below try to initialize the map again.
	Set(map, $$mapKeys, 'initializing');
	Set(map, $$mapPrimitiveHashValues, 'initializing');
	Set(map, $$mapPrimitiveHashIndices, 'initializing');
	Set(map, $$mapId, 'initializing');
	Set(map, $$mapSize, 'initializing');
	SetSymbolTransferability(map, $$mapKeys, false);
	SetSymbolTransferability(map, $$mapPrimitiveHashValues, false);
	SetSymbolTransferability(map, $$mapPrimitiveHashIndices, false);
	SetSymbolTransferability(map, $$mapId, false);
	SetSymbolTransferability(map, $$mapSize, false);

	if (iterable != null) {
		iter = GetIterator(iterable);
		adder = Get(map, 'set');
		if (!IsCallable(adder)) {
			Delete(map, $$mapKeys);
			Delete(map, $$mapPrimitiveHashValues);
			Delete(map, $$mapPrimitiveHashIndices);
			Delete(map, $$mapId);
			Delete(map, $$mapSize);
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
	mKeys = Get(map, $$mapKeys);
	return mKeys !== undefined && mKeys !== 'initializing';
}

function ClearMap(map, skipValidation) {
	if (!skipValidation) {
		ExpectMap(map);
		while (!HasOwn(map, $$mapKeys))
			map = getPrototype(map);
	}
	Set(map, $$mapKeys, createSack());
	Set(map, $$mapPrimitiveHashValues, create(null));
	Set(map, $$mapPrimitiveHashIndices, create(null));
	Set(map, $$mapId, mapIds.next());
	Set(map, $$mapSize, 0);
}

function MapDeleteIndex(map, index) {
	// TODO: Every once in a while lets run through and clean this up
	// by removing the deleted items.
	// The clean-up operation should be O(n), but since we don't do
	// it every time, `delete` can be faster than O(n) sometimes.
	Get(M, $$mapKeys)[index] = MAP_DELETED;
}

function MapGet(M, key) {
	var mId, keyHash, mapValue;
	M = ExpectMap(M);
	if (IsWrapper(key)) {
		if (!HasOwn(key, $$mapValue))
			return undefined;
		mId = Get(M, $$mapId);
		mapValue = Get(key, $$mapValue);
		if (!(mId in mapValue))
			return undefined;
		return mapValue[mId];
	}
	else {
		keyHash = typeof key + ':' + key;
		return Get(M, $$mapPrimitiveHashValues)[keyHash];
	}
}

function MapHas(M, key) {
	var keyHash;
	ExpectMap(M);
	if (IsWrapper(key)) {
		if (!HasOwn(key, $$mapValue))
			return false;
		return Get(M, $$mapId) in Get(key, $$mapValue);
	}
	else {
		keyHash = typeof key + ':' + key;
		return keyHash in Get(M, $$mapPrimitiveHashValues);
	}
}

function MapDelete(M, key) {
	var mId, keyHash, mapPrimitiveHashValues, mapPrimitiveHashIndices;
	M = ExpectMap(M);
	if (IsWrapper(key)) {
		if (!HasOwn(key, $$mapValue))
			return false;
		mId = Get(M, $$mapId);
		if (!(mId in Get(key, $$mapValue)))
			return false;
		MapDeleteIndex(map, Get(key, $$mapIndex)[mId]);
		delete Get(key, $$mapValue)[mId];
		delete Get(key, $$mapIndex)[mId];
		Set(M, $$mapSize, Get(M, $$mapSize) - 1);
		return true;
	}
	else {
		keyHash = typeof key + ':' + key;
		mapPrimitiveHashValues = Get(M, $$mapPrimitiveHashValues);
		if (!(keyHash in mapPrimitiveHashValues))
			return false;
		mapPrimitiveHashIndices = Get(M, $$mapPrimitiveHashIndices);
		MapDeleteIndex(map, mapPrimitiveHashIndices[keyHash]);
		delete mapPrimitiveHashValues[keyHash];
		delete mapPrimitiveHashIndices[keyHash];
		Set(M, $$mapSize, Get(M, $$mapSize) - 1);
		return true;
	}
}

function MapSet(M, key, value) {
	var mId, keyHash, mapValue, mapKeys, mapPrimitiveHashValues;
	ExpectMap(M);
	if (IsWrapper(key)) {
		mId = Get(M, $$mapId);
		if (!HasOwn(key, $$mapValue)) {
			mapValue = Set(key, $$mapValue, create(null));
			SetSymbolTransferability(key, $$mapValue, false);
		}
		else if (!(mId in (mapValue = Get(key, $$mapValue)))) {
			mapKeys = Get(M, $$mapKeys);
			Get(key, $$mapIndex)[mId] = mapKeys.length;
			push(mapKeys, key);
			Set(M, $$mapSize, Get(M, $$mapSize) + 1);
		}
		mapValue[mId] = value;
	}
	else {
		keyHash = typeof key + ':' + key;
		mapPrimitiveHashValues = Get(M, $$mapPrimitiveHashValues);
		if (!(keyHash in mapPrimitiveHashValues)) {
			mapKeys = Get(M, $$mapKeys);
			Get(M, $$mapPrimitiveHashIndices)[keyHash] = mapKeys.length;
			push(mapKeys, key);
			Set(M, $$mapSize, Get(M, $$mapSize) + 1);
		}
		mapPrimitiveHashValues[keyHash] = value;
	}
	return value;
}

function CreateMapIterator(map, kind) {
	var iterator;
	ExpectMap(map);
	iterator = CreateObject(MapIteratorPrototype);
	Set(iterator, $$mapIteratorMap, map);
	Set(iterator, $$mapIteratorNextIndex, 0);
	Set(iterator, $$mapIteratorKind, kind);
	return iterator;
}

var MapIteratorPrototype = CreatePrototype({

	next: function next() {
		var O, m, index, itemKind, keys, key, result;
		O = ExpectObject(O);
		if (!Has(O, $$mapIteratorMap))
			throw new TypeError('MapIterator expected');
		m = Get(O, $$mapIteratorMap);
		index = Get(O, $$mapIteratorNextIndex);
		itemKind = Get(O, $$mapIteratorKind);
		if (m === undefined)
			return CreateIterResultObject(undefined, true);
		ExpectMap(m);
		keys = Get(m, $$mapKeys);
		while (index < keys.length) {
			key = keys[index];
			Set(O, $$mapIteratorNextIndex, ++index);
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
		Set(O, $$mapIteratorMap, undefined);
		return CreateIterResultObject(undefined, true);
	},

	'@@iterator': function() { return this; }

});
