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
	obj.RangeFrom = from;
	obj.RangeTo = to;
	obj.RangeInclusive = ToBoolean(inclusive);
	obj.RangeStep = step;
	return obj;
}

var RangeProto = CreatePrototype({

	'@Iterator': function iterator() {
		if (!IsObject(this))
			throw new TypeError('Object expected');
		if (!('RangeFrom' in this) || !('RangeTo' in this))
			throw new TypeError('Range expected');
		var iter = CreateObject(RangeIteratorProto);
		iter.RangeIteratorFrom = this.RangeFrom;
		iter.RangeIteratorTo = this.RangeTo;
		iter.RangeIteratorStep = this.RangeStep;
		iter.RangeIteratorInclusive = this.RangeInclusive;
		iter.RangeIteratorDone = false;
		iter.RangeIteratorIteration = 0;
		return iter;
	},

	'@Get': function get(obj, receiver) {
		if (!IsObject(this))
			throw new TypeError('Object expected');
		if (!('RangeFrom' in this) || !('RangeTo' in this))
			throw new TypeError('Range expected');
		return Slice(obj, this.RangeFrom, this.RangeTo, receiver);
	},

	'@GetOwn': function getOwn(obj, receiver) {
		return SliceOwn(obj, this.RangeFrom, this.RangeTo, receiver);
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
		if (!IsObject(this))
			throw new TypeError('Object expected');
		if (!('RangeIteratorFrom' in this))
			throw new TypeError('Range iterator expected');
		var from = this.RangeIteratorFrom,
			to = this.RangeIteratorTo,
			inclusive = this.RangeIteratorInclusive,
			step = this.RangeIteratorStep,
			done = this.RangeIteratorDone,
			iteration = this.RangeIteratorIteration,
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
			this.RangeIteratorDone = true;
		this.RangeIteratorIteration++;
		return CreateObject(undefined, {
			value: current,
			done: false
		});
	})
});

function ModifyRangeStep(range, step) {
	if (!IsObject(range))
		throw new TypeError('Object expected');
	if (!('RangeFrom' in range))
		throw new TypeError('Range expected');
	return CreateRange(
		undefined, range.RangeInclusive, range.RangeFrom, range.RangeTo, step
	);
}