function CreateRange(proto, inclusive, from, to, step) {
	if (proto === undefined)
		proto = RangeProto;
	var obj = CreateObject(proto);
	from = ToNumber(from);
	if (from !== from)
		throw new RangeError('Invalid range bounds');
	to = ToNumber(to);
	if (to !== to)
		throw new RangeError('Invalid range bounds');
	if (step === undefined)
		step = from < to ? 1 : -1;
	step = ToNumber(step);
	if (step !== step)
		throw new RangeError('Invalid step');
	Set(obj, $$rangeFrom, from);
	Set(obj, $$rangeTo, to);
	Set(obj, $$rangeInclusive, ToBoolean(inclusive));
	Set(obj, $$rangeStep, step);
	return obj;
}

var RangeProto = CreatePrototype({

	'@@iterator': function iterator() {
		ExpectObject(this);
		if (!Has(this, $$rangeFrom) || !Has(this, $$rangeTo))
			throw new TypeError('Range expected');
		var iter = CreateObject(RangeIteratorProto);
		Set(iter, $$rangeIteratorFrom, Get(this, $$rangeFrom));
		Set(iter, $$rangeIteratorTo, Get(this, $$rangeTo));
		Set(iter, $$rangeIteratorStep, Get(this, $$rangeStep));
		Set(iter, $$rangeIteratorInclusive,
			Get(this, $$rangeInclusive)
		);
		Set(iter, $$rangeIteratorDone, false);
		Set(iter, $$rangeIteratorIteration, 0);
		return iter;
	},

	'@@get': function get(obj, receiver) {
		ExpectObject(this);
		if (!Has(this, $$rangeFrom) || !Has(this, $$rangeTo))
			throw new TypeError('Range expected');
		return Slice(
			obj,
			Get(this, $$rangeFrom),
			Get(this, $$rangeTo),
			receiver
		);
	},

	'@@getOwn': function getOwn(obj, receiver) {
		return SliceOwn(
			obj,
			Get(this, $rangeFrom),
			Get(this, $rangeTo),
			receiver
		);
	}

});

// RangeProto.Set = function Set(obj, value, receiver) {
// 	// TODO
// };
// RangeProto.SetOwn = function SetOwn(obj, value, receiver) {
// 	// TODO
// };

var RangeIteratorProto = CreateObject(undefined, {
	next: CreateFunction(undefined, function() {
		ExpectObject(this);
		if (!Has(this, $$rangeIteratorFrom))
			throw new TypeError('Range iterator expected');
		var from = Get(this, $$rangeIteratorFrom),
			to = Get(this, $$rangeIteratorTo),
			inclusive = Get(this, $$rangeIteratorInclusive),
			step = Get(this, $$rangeIteratorStep),
			done = Get(this, $$rangeIteratorDone),
			iteration = Get(this, $$rangeIteratorIteration),
			// We use this kind of calculation, rather than additive, for higher
			// precision when using a non-integer step.
			current = from + step * iteration;
		if (step > 0)
			done = done || (inclusive ? current > to : current >= to);
		else if (step < 0)
			done = done || (inclusive ? current < to : current <= to);
		if (done)
			return CreateObject(undefined, {
				value: undefined,
				done: true
			});
		// Make the following cases produce 1 value:
		// `-inf...-inf` and `inf...inf`
		if (from === to && step != 0)
			Set(this, $$rangeIteratorDone, true);
		Set(this, $$rangeIteratorIteration,
			Get(this, $$rangeIteratorIteration) + 1
		);
		return CreateObject(undefined, {
			value: current,
			done: false
		});
	})
});

function ModifyRangeStep(range, step) {
	ExpectObject(range);
	if (!Has(range, $$rangeFrom))
		throw new TypeError('Range expected');
	return CreateRange(
		undefined,
		Get(range, $$rangeInclusive),
		Get(range, $$rangeFrom),
		Get(range, $$rangeTo),
		step
	);
}