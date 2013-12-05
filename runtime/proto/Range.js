function CreateRange(proto, from, to) {
	if (proto === undefined)
		proto = RangeProto;
	var obj = CreateObject(proto);
	from = ToNumber(from);
	if (from !== from)
		throw new RangeError('Invalid range bounds');
	to = ToNumber(to);
	if (to !== to)
		throw new RangeError('Invalid range bounds');
	obj.RangeFrom = from;
	obj.RangeTo = to;
	return obj;
}

var RangeProto = (function() {

	var RangeProto = CreateObject(ObjectProto);

	RangeProto.Iterator = CreateFunction(undefined, function Iterator() {
		if (!IsObject(this))
			throw new TypeError('Object expected');
		if (!('RangeFrom' in this) || !('RangeTo' in this))
			throw new TypeError('Range expected');
		var from = this.RangeFrom,
			to = this.RangeTo,
			iter = CreateObject(RangeIteratorProto);
		iter.RangeIteratorCurrent = from;
		iter.RangeIteratorTo = to;
		iter.RangeIteratorStep = from < to ? 1 : -1;
		return iter;
	});

	RangeProto.Get = function Get(obj, receiver) {
		if (!IsObject(this))
			throw new TypeError('Object expected');
		if (!('RangeFrom' in this) || !('RangeTo' in this))
			throw new TypeError('Range expected');
		return Slice(obj, this.RangeFrom, this.RangeTo, receiver);
	};
	RangeProto.GetOwn = function GetOwn(obj, receiver) {
		return SliceOwn(obj, this.RangeFrom, this.RangeTo, receiver);
	};

})();

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
		if (!('RangeIteratorCurrent' in this))
			throw new TypeError('Range iterator expected');
		var current = this.RangeIteratorCurrent,
			to = this.RangeIteratorTo,
			step = this.RangeIteratorStep;
		if (step > 0 ? current >= to : current <= to)
			return CreateObject(undefined, {
				value: undefined,
				done: true
			});
		this.RangeIteratorCurrent += step;
		return CreateObject(undefined, {
			value: current,
			done: false
		});
	})
});