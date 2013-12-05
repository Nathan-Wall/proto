// TODO: Should generators use these functions? ... Maybe there's even some
// duplication in GeneratorObject that can be removed?

function GetIterator(iterable) {
	var iterator, I;
	if (!IsObject(iterable))
		throw new TypeError('Object expected');
	I = Get(iterable, $$iterator);
	if (!IsCallable(I))
		throw new TypeError('Iterable expected');
	iterator = Call(I, iterable, [ ]);
	if (!IsObject(iterator))
		throw new TypeError('Iterator expected');
	return iterator;
}

function IteratorNext(iterator, value) {
	if (!IsObject(iterator))
		throw new TypeError('Object expected');
	var result = CallMethod(iterator, 'next', [ value ]);
	if (!IsObject(result))
		throw new TypeError('Object expected');
	return result;
}

function IteratorComplete(iterResult) {
	if (!IsObject(iterResult))
		throw new TypeError('Object expected');
	return !!Get(iterResult, 'done');
}

function IteratorValue(iterResult) {
	if (!IsObject(iterResult))
		throw new TypeError('Object expected');
	return Get(iterResult, 'value');	
}

function IteratorStep(iterator, value) {
	var result = IteratorNext(iterator, value),
		done = IteratorComplete(result);
	if (done)
		return false;
	return result;
}

function CreateIterResultObject(value, done) {
	if (typeof done != 'boolean')
		throw new TypeError('Boolean expected');
	return CreateObject(undefined, {
		value: value,
		done: done
	});
}

// TODO: There are more ES6 functions that could go here..