// This implementation is very closely based on the 2014-05-22 ES6 draft for
// Set.

var SET_ITER_KEY = 1,
	SET_ITER_VALUE = 2;

var SetProto = CreatePrototype({

	init: function init(iterable) {
		SetInit(this, iterable);
	},

	add: function add(value) {
		var S = ExpectSet(this);
		MapSet(S.SetMap, value, true);
		return value;
	},

	clear: function clear() {
		var S = ExpectSet(this);
		ClearMap(S.SetMap);
	},

	delete: function delete_(value) {
		var S = ExpectSet(this);
		return MapDelete(S.SetMap, value);
	},

	entries: function entries() {
		return CreateSetIterator(this, SET_ITER_KEY | SET_ITER_VALUE);
	},

	// Note: forEach is intentionally left out of proto since `for..of` can
	// be used for the same purpose and has the benefit of allowing breaking.

	has: function has(value) {
		var S = ExpectSet(this);
		return MapHas(S.SetMap, value);
	},

	keys: function keys() {
		return CreateSetIterator(this, SET_ITER_KEY);
	},

	// TODO
	// get size() {
	// 	var S = ExpectSet(this);
	// 	return S.SetMap.MapSize;
	// },

	values: function values() {
		return CreateSetIterator(this, SET_ITER_VALUE);
	},

	'@Iterator': function iterator() {
		return CreateSetIterator(this, MAP_ITER_VALUE);
	}

});

function SetInit(set, iterable) {

	var map, iter, adder, next, nextValue;

	ExpectObject(set);
	if (hasOwn(set, 'SetMap'))
		throw new TypeError('Set has already been initialized');

	map = CreateObject(MapProto);
	MapInit(map);
	set.SetMap = 'initializing';

	if (iterable != null) {
		iter = GetIterator(iterable);
		adder = Get(set, 'add');
		if (!IsCallable(adder)) {
			delete set.SetMap;
			throw new TypeError('Function expected');
		}
	}

	set.SetMap = map;

	if (iter === undefined)
		return;

	while ((next = IteratorStep(iter)) !== false) {
		nextValue = IteratorValue(next);
		Call(adder, set, [ nextValue ]);
	}

}

function IsSet(set) {
	var sMap;
	if (!IsObject(set))
		return false;
	sMap = map.SetMap;
	return sMap !== undefined && sMap !== 'initializing';
}

function ExpectSet(S) {
	if (!IsSet(S))
		throw new TypeError('Set expected');
	return S;
}
