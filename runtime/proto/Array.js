var ArrayProto = CreatePrototype({

	'@Iterator': function iterator() {
		return ArrayValues(this);
	},

	push: function(/* ...values */) {
		pushAll(this, arguments);
	},

	join: function(sep) {
		return join(this, sep);
	}

});

var ArrayIteratorPrototype = CreatePrototype({

	'@Iterator': function() { return this; },

	next: function next() {
		var O = this;
		if (!IsObject(O))
			throw new TypeError('Object expected');
		if (!('ArrayIteratorNextIndex' in O))
			throw new TypeError('ArrayIterator expected');
		var a = O.IteratedObject;
		if (a === undefined)
			return CreateIterResultObject(undefined, true);
		var index = O.ArrayIteratorNextIndex,
			itemKind = O.ArrayIterationKind,
			lenValue = Get(a, 'length'),
			len = ToLength(lenValue),
			elementKey, elementValue, result;
		if (index >= len) {
			O.IteratedObject = undefined;
			return CreateIterResultObject(undefined, true);
		}
		O.ArrayIteratorNextIndex = index + 1;
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
		if (Object(elements) !== elements)
			throw new TypeError('Object expected');
		L = elements.length >>> 0;
		for (var i = 0; i < L; i++)
			SetOwn(obj, i, elements[i]);
		define(obj.Value, 'length', {
			value: L,
			enumerable: false,
			writable: true,
			configurable: true
		});
	}
	else
		define(obj.Value, 'length', {
			value: 0,
			enumerable: false,
			writable: true,
			configurable: true
		});
	return obj;
}

function PushAll(to, from) {
	if (!IsObject(to))
		throw new TypeError('Object expected');
	if (!IsObject(from))
		throw new TypeError('Object expected');
	pushAll(to.Value, from.Value);
}

function Slice(obj, from, to, receiver) {
	// TODO: Get `receiver` working (it should be the receiver for getters
	// when retrieving properties from obj).
	// TODO: the prototype for the sliced object should probably not always
	// be array proto but should be derived from the argument somehow
	var R;
	if (!IsObject(obj))
		return CreateArray(ArrayProto);
	from = ToNumber(from);
	to = ToNumber(to);
	if (from < to)
		return CreateArray(ArrayProto, slice(obj.Value, from, to));
	else {
		R = CreateArray(ArrayProto);
		for (var i = from, j = 0;
			from < to ? i < to : i > to;
			from < to ? i++ : i--)
				SetOwn(R, j++, GetOwn(obj, i));
		return R;
	}
}

function SliceOwn(obj, from, to, receiver) {
	// TODO: the prototype for the sliced object should probably not always
	// be array proto but should be derived from the argument somehow
	var R;
	if (!IsObject(obj))
		return CreateArray(ArrayProto);
	from = ToNumber(from);
	to = ToNumber(to);
	R = CreateArray(ArrayProto);
	for (var i = from, j = 0; i > to; i--)
			// I'm pretty sure SetOwn will mimic Array#slice correctly..
			// TODO: double check on this
			SetOwn(R, j++, Get(obj, i));
	return R;
}

function ArrayValues(obj) {
	if (!IsObject(obj))
		obj = { Value: { } };
	return CreateArrayIterator(obj, 'value');
};

function CreateArrayIterator(array, kind) {
	if (!IsObject(array))
		array = { Value: { } };
	var iterator = CreateObject(ArrayIteratorPrototype);
	iterator.IteratedObject = array;
	iterator.ArrayIteratorNextIndex = 0;
	iterator.ArrayIterationKind = kind;
	return iterator;
}