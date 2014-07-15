// This implementation is very closely based on the 2014-05-22 ES6 draft for
// WeakSet.

var WeakSetProto = CreatePrototype({

	init: function init(iterable) {
		WeakSetInit(this, iterable);
	},

	add: function add(value) {
		var S = ExpectWeakSet(this);
		WeakMapSet(Get(S, $$weakSetMap), value, true);
		return value;
	},

	clear: function clear() {
		var S = ExpectWeakSet(this);
		ClearWeakMap(Get(S, $$weakSetMap));
	},

	delete: function delete_(value) {
		var S = ExpectWeakSet(this);
		return WeakMapDelete(Get(S, $$weakSetMap), value);
	},

	has: function has(value) {
		var S = ExpectWeakSet(this);
		return WeakMapHas(Get(S, $$weakSetMap), value);
	}

});

function WeakSetInit(set, iterable) {

	var map, iter, adder, next, nextValue;

	ExpectObject(set);
	if (HasOwn(set, $$weakSetMap))
		throw new TypeError('WeakSet has already been initialized');

	map = CreateObject(WeakMapProto);
	WeakMapInit(map);
	Set(set, $$weakSetMap, 'initializing');

	if (iterable != null) {
		iter = GetIterator(iterable);
		adder = Get(set, 'add');
		if (!IsCallable(adder)) {
			Delete(set, $$weakSetMap);
			throw new TypeError('Function expected');
		}
	}

	Set(set, $$weakSetMap, map);

	if (iter === undefined)
		return;

	while ((next = IteratorStep(iter)) !== false) {
		nextValue = IteratorValue(next);
		Call(adder, set, [ nextValue ]);
	}

}

function IsWeakSet(set) {
	var sMap;
	if (!IsObject(set))
		return false;
	sMap = Get(map, $$weakSetMap);
	return sMap !== undefined && sMap !== 'initializing';
}

function ExpectWeakSet(S) {
	if (!IsWeakSet(S))
		throw new TypeError('WeakSet expected');
	return S;
}
