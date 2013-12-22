var FunctionProto = CreatePrototype({

	// TODO: make length setting work

	insert: function insert(index) {
		if (!IsCallable(this))
			throw new TypeError('Function expected');
		var index = ToUint32(index),
			args = slice(arguments, 1);
		// TODO: 
		//return (...r) -> this(...[ ...r[0..index], ...args, r[index..inf] ]);
		// TODO: set arity?
	},

	prepend: function prepend() {
		if (!IsCallable(this))
			throw new TypeError('Function expected');
		var f = this,
			preArgs = slice(arguments);
		return CreateFunction(undefined, function() {
			return Call(f, this, concat(preArgs, slice(arguments)));
		});
		// TODO: set arity?
	},

	append: function append() {
		if (!IsCallable(this))
			throw new TypeError('Function expected');
		var f = this,
			preArgs = slice(arguments);
		return CreateFunction(undefined, function() {
			return Call(f, this, concat(slice(arguments), preArgs));
		});
		// TODO: set arity?
	}

});

function CreateFunction(proto, jsfn, name, arity) {
	if (proto === undefined)
		proto = FunctionProto;
	var obj = CreateObject(proto);
	FunctionInit(obj, jsfn, name, arity);
	return obj;
}

function FunctionInit(obj, jsfn, name, arity) {
	if (typeof jsfn != 'function')
		throw new TypeError('Function expected');
	if (arity === undefined)
		arity = jsfn.length;
	else
		arity = ToUint32(arity);
	obj.Function = jsfn;
	define(obj.Value, 'name', {
		value: name,
		writable: false,
		enumerable: false,
		configurable: false
	});
	define(obj.Value, 'arity', {
		value: arity,
		writable: false,
		enumerable: false,
		configurable: false
	});
}

function IsCallable(value) {
	if (!IsObject(value))
		return false;
	var F = value.Function;
	return typeof F == 'function';
}

// args should always be a native JS array (or undefined)
function Call(f, receiver, args) {
	var F = GetFunction(f);
	if (args !== undefined) {
		if (!isArray(args))
			throw new TypeError('Native JS Array expected');
	}
	return apply(F, receiver, args);
}

function GetFunction(F) {
	var f;
	if (!IsObject(F))
		throw new TypeError('Function expected');
	f = F.Function;
	if (typeof f != 'function')
		throw new TypeError('Function expected');
	return f;
}

function CallMethod(obj, key, args) {
	var F = Get(obj, key);
	if (!IsCallable(F)) {
		if (typeof key == 'string')
			throw new TypeError('Method expected: ' + key);
		else
			throw new TypeError('Method expected');
	}
	return Call(F, obj, args);
}

function CallOwnMethod(obj, key, args) {
	return Call(GetOwn(obj, key), obj, args);
}

function Bind(obj, receiver) {
	var f = GetFunction(obj),
		bound;
	if (arguments.length == 1)
	 	bound = lazyBind(f);
	else
		bound = lazyBind(f, receiver);
	return CreateFunction(FunctionProto, bound, obj.name, obj.arity + 1);
}

function AsCoercive(f, nilable) {
	if (!IsCallable(f))
		throw new TypeError('Function expected');
	if (nilable)
		return CreateFunction(null, function(value) {
			if (value === null || value === undefined)
				return undefined;
			return Call(f, undefined, [ value ]);
		}, f.name, 1);
	return f;
}

function PartiallyApply(f, appliedArgs) {
	if (!IsCallable(f))
		throw new TypeError('Function expected');
	if (!isArray(appliedArgs))
		throw new TypeError('Array expected');
	return CreateFunction(undefined, function() {
		var args = create(null),
			unusedIndices = create(null),
			unusedCollapsed = create(null),
			arg, slot, unused, i, j, insert;
		args.length = 0;
		for (i = 0; i < arguments.length; i++)
			unusedIndices[i] = true;
		unusedIndices.length = arguments.length;
		unusedCollapsed.length = 0;
		// First pass: Replace slots that are explicit indices (including
		// iterator slots) and note which ones have been used.
		for (i = 0; i < appliedArgs.length; i++) {
			arg = appliedArgs[i];
			if (IsWrapper(arg) && 'Slot' in arg) {
				slot = arg.Slot;
				if (typeof slot == 'number') {
					if (sign(slot) == -1)
						slot = arguments.length - 1 + slot;
					unusedIndices[slot] = false;
					push(args, arguments[slot]);
				}
				else if (slot != null && IsObject(slot) && Has(slot, $$iterator)) {
					insert = PartiallApplyIterable(
						slot, arguments, unusedIndices
					);
					spliceAll(args, i, 1, insert);
					i += insert.length - 1;
				}
				else if (slot === null)
					push(args, arg);
				else
					throw new Error('Unexpected slot value');
			}
			else
				push(args, arg);
		}
		// Collapse unusedIndices array
		for (i = 0; i < unusedIndices.length; i++)
			if (unusedIndices[i])
				push(unusedCollapsed, i);
		// Second pass: Fill in implicit slots
		for (i = 0; i < args.length; i++) {
			arg = args[i];
			if (IsWrapper(arg) && 'Slot' in arg) {
				slot = arg.Slot;
				if (slot === null && !arg.RestSlot) {
					j = shift(unusedCollapsed);
					args[i] = arguments[j];
					unusedIndices[j] = false;
				}
				else if (!arg.RestSlot)
					throw new Error('Unexpected slot value');
			}
		}
		// Third pass: Fill in rest slots
		for (i = 0; i < args.length; i++) {
			arg = args[i];
			if (IsWrapper(arg) && 'Slot' in arg) {
				slot = arg.Slot;
				if (slot !== null || !arg.RestSlot)
					throw new Error('Unexpected slot value');
				insert = PartiallyApplyRest(unusedCollapsed, arguments);
				spliceAll(args, i, 1, insert);
				i += insert.length - 1;
			}
		}
		Call(f, this, slice(args));
	}, undefined, appliedArgs.length);
}

function PartiallyApplyRest(unusedIndices, args) {
	var insert = create(null);
	insert.length = unusedIndices.length;
	for (var i = 0; i < unusedIndices.length; i++)
		insert[i] = args[unusedIndices[i]];
	return insert;
}

function PartiallApplyIterable(iterable, args, unusedIndices) {
	var iter = GetIterator(iterable),
		insert = create(null),
		index, next;
	insert.length = 0;
	while (true) {
		next = IteratorStep(iter);
		if (next === false)
			return insert;
		index = ToIndex(IteratorValue(next), args.length);
		push(insert, args[index]);
		unusedIndices[index] = false;
	}
}