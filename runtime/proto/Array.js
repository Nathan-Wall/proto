// TODO: This needs a lot of work.
// TODO: Account for wrapped arguments
var ArrayProto = CreatePrototype({

	'@@iterator': function iterator() {
		return ArrayValues(this);
	},

	slice: function(from, to) {
		var O = ToObject(this),
			L = ToLength(Get(O, 'length')),
			copy = create(null);
		if (from === undefined)
			from = 0;
		if (to === undefined)
			to = L;
		from = ToLength(from);
		to = ToLength(to);
		if (to > L)
			to = L;
		copy.length = 0;
		for (var i = from; i < to; i++)
			push(copy, Get(O, i));
		return CreateArray(undefined, copy);
	},

	push: function(/* ...values */) {
		var O = ExpectObject(this),
			j = ToLength(Get(O, 'length'));
		for (var i = 0; i < arguments.length; i++)
			DefineValue(O, j++, arguments[i]);
		DefineValue(O, 'length', j);
		return j;
	},

	unshift: function(/* ...values */) {
		var O = ExpectObject(this),
			L = ToLength(Get(O, 'length')),
			aL = arguments.length,
			i;
		for (i = L - 1; i >= 0; i--)
			DefineValue(O, i + aL, Get(O, i));
		for (i = 0; i < aL; i++)
			DefineValue(O, i, arguments[i]);
		L += aL;
		DefineValue(O, 'length', L);
		return L;
	},

	join: function(sep) {
		var values = GetArrayValues(this);
		return join(values, sep);
	},

	map: function(transform) {
		var O = ToObject(this),
			L = ToLength(Get(O, 'length')),
			mapped = createSack();
		for (var i = 0; i < L; i++)
			push(mapped, Call(transform, undefined, [ Get(O, i) ]));
		return CreateArray(undefined, mapped);
	},

	// TODO: Make stable
	sort: function(test) {
		var values = GetArrayValues(this),
			T = ExpectFunction(test);
		return CreateArray(undefined, sort(values, function(a, b) {
			return Call(T, undefined, [ a, b ]);
		}));
	}

	// Note: forEach is intentionally left out of proto since `for..of` can
	// be used for the same purpose and has the benefit of allowing breaking.

});

var ArrayIteratorPrototype = CreatePrototype({

	'@@iterator': function() { return this; },

	next: function next() {
		var O = ExpectObject(this);
		if (!Has(O, $$arrayIteratorNextIndex))
			throw new TypeError('ArrayIterator expected');
		var a = Get(O, $$arrayIteratorIteratedObject);
		if (a === undefined)
			return CreateIterResultObject(undefined, true);
		var index = Get(O, $$arrayIteratorNextIndex),
			itemKind = Get(O, $$arrayIterationKind),
			lenValue = Get(a, 'length'),
			len = ToLength(lenValue),
			elementKey, elementValue, result;
		if (index >= len) {
			Set(O, $$arrayIteratorIteratedObject, undefined);
			return CreateIterResultObject(undefined, true);
		}
		Set(O, $$arrayIteratorNextIndex, index + 1);
		if (test(/value/, itemKind)) {
			elementKey = ToString(index);
			elementValue = Get(a, elementKey);
		}
		if (test(/key\+value/, itemKind)) {
			result = CreateObject(ArrayProto, {
				length: 2,
				'0': index,
				'1': elementValue
			});
			return CreateIterResultObject(result, false);
		}
		else if (test(/key/, itemKind))
			return CreateIterResultObject(index, false);
		if (!test(/value/, itemKind))
			throw new Error('Expected itemKind to contain substring "value"');
		return CreateIterResultObject(elementValue, false);
	}

});

// elements will always be a native JS object
function CreateArray(proto, elements) {
	var obj, L;
	if (proto === undefined)
		proto = ArrayProto;
	obj = CreateObject(proto);
	if (elements !== undefined) {
		expectObject(elements);
		L = ToInteger(elements.length);
		for (var i = 0; i < L; i++)
			// We can use `SetOwn` instead of `DefineValue` here for performance
			// because we know `obj` doesn't have any previously defined own
			// setters, since we just created it.
			SetOwn(obj, i, elements[i]);
		// `SetOwn` instead of `DefineValue` for performance
		SetOwn(obj, 'length', L);
	}
	else
		// `SetOwn` instead of `DefineValue` for performance
		SetOwn(obj, 'length', 0);
	return obj;
}

function GetArrayValues(array) {
	var O = ToObject(array),
		L = ToLength(Get(O, 'length')),
		values = createSack();
	for (var i = 0; i < L; i++)
		push(values, Get(O, i));
	return values;
}

function PushAll(to, from) {
	var T = ExpectObject(to),
		F = ExpectObject(from),
		L = ToLength(Get(F, 'length')),
		j = ToLength(Get(T, 'length'));
	for (var i = 0; i < L; i++)
		DefineValue(O, j++, Get(F, i));
	DefineValue(T, 'length', j);
	return j;
}

function Slice(obj, from, to, receiver) {
	// TODO: Get `receiver` working (it should be the receiver for getters
	// when retrieving properties from obj).
	// TODO: the prototype for the sliced object should probably not always
	// be array proto but should be derived from the argument somehow
	// When something is done about this, we may need to change from using 
	// `SetOwn` below instead of `DefineValue` since an object's `init` could
	// set up own properties... (if we do call `init` here; maybe we shouldn't)
	var R = CreateArray(ArrayProto);
	if (!IsObject(obj))
		return R;
	from = ToNumber(from);
	to = ToNumber(to);
	for (var i = from, j = 0;
		from < to ? i < to : i > to;
		from < to ? i++ : i--)
			// We can use `SetOwn` instead of `DefineValue` here for performance
			// because we know `obj` doesn't have any previously defined own
			// setters, since we just created it.
			SetOwn(R, j++, Get(obj, i));
	return R;
}

function SliceOwn(obj, from, to, receiver) {
	// TODO: Get `receiver` working (it should be the receiver for getters
	// when retrieving properties from obj).
	// TODO: the prototype for the sliced object should probably not always
	// be array proto but should be derived from the argument somehow
	var R = CreateArray(ArrayProto);
	if (!IsObject(obj))
		return R;
	from = ToNumber(from);
	to = ToNumber(to);
	for (var i = from, j = 0;
		from < to ? i < to : i > to;
		from < to ? i++ : i--)
			// `SetOwn` instead of `DefineValue` for performance
			SetOwn(R, j++, GetOwn(obj, i));
	return R;
}

function ArrayValues(obj) {
	var O = ToObject(obj);
	return CreateArrayIterator(O, 'value');
};

function CreateArrayIterator(array, kind) {
	var O = ToObject(array),
		iterator = CreateObject(ArrayIteratorPrototype);
	Set(iterator, $$arrayIteratorIteratedObject, O);
	Set(iterator, $$arrayIteratorNextIndex, 0);
	Set(iterator, $$arrayIterationKind, kind);
	return iterator;
}