// TODO: Should generators use these functions? ... Maybe there's even some
// duplication in GeneratorObject that can be removed?

function GetIterator(iterable) {
	var iterator, I;
	ExpectObject(iterable);
	I = Get(iterable, $$iterator);
	if (!IsCallable(I))
		throw new TypeError('Iterable expected');
	iterator = Call(I, iterable, [ ]);
	if (!IsObject(iterator))
		throw new TypeError('Iterator expected');
	return iterator;
}

function IteratorNext(iterator, value) {
	ExpectObject(iterator);
	var result = CallMethod(iterator, 'next', [ value ]);
	return ExpectObject(result);
}

function IteratorComplete(iterResult) {
	ExpectObject(iterResult);
	return !!Get(iterResult, 'done');
}

function IteratorValue(iterResult) {
	ExpectObject(iterResult);
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