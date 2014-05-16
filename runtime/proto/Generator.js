/**
 * This is a heavily modifified version of the regenerator runtime.
 * Modified for integrity and to transform it to be more Proto friendly.
 *
 * Copyright (c) 2013, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

var GenStateSuspendedStart = 'suspendedStart',
	GenStateSuspendedYield = 'suspendedYield',
	GenStateExecuting = 'executing',
	GenStateCompleted = 'completed',

	// Returning this object from the innerFn has the same effect as
	// breaking out of the dispatch switch statement.
	GeneratorContinue = create(null);

function CreateGeneratorFunction(proto, progeneratedFn, name, arity, receiver) {
	// TODO: This needs some work... specifically the way the prototypes are set
	// up... proto should probably refer to the function's prototype, not the
	// generator object's prototype.  The way slice(arguments) is being used
	// and the CreateFunction could probably use some work too.
	if (proto === undefined)
		proto = GeneratorProto;
	if (arguments.length < 5)
		receiver = DYNAMIC_THIS;
	var obj = CreateObject(proto);
	obj.GeneratorStart = progeneratedFn;
	return CreateFunction(undefined, function() {
		var iter = Like(obj);
		GeneratorInit(iter, CreateArray(null, arguments), this);
		return iter;
	}, name, arity, receiver);
}

function GeneratorInit(generator, args, receiver) {

	if (!IsObject(generator))
		throw new TypeError('Object expected');
	if (!('GeneratorStart' in generator))
		throw new TypeError('Generator prototype expected');

	if (!IsObject(args))
		throw new TypeError('Object expected');

	generator.InnerFn = bind(
		apply(generator.GeneratorStart, receiver, args.Value),
		receiver
	);
	generator.GeneratorContext = new GeneratorContext();
	generator.GeneratorState = GenStateSuspendedStart;

}

function GeneratorInvoke(generator) {
	var value;
	generator.GeneratorState = GenStateExecuting;
	do {
		value = generator.InnerFn(generator.GeneratorContext);
	} while (value === GeneratorContinue);
	// If an exception is thrown from innerFn, we leave state ===
	// GenStateExecuting and loop back for another invocation.
	generator.GeneratorState = generator.GeneratorContext.done
		? GenStateCompleted
		: GenStateSuspendedYield;
	return CreateSimpleObject({
		value: value,
		done: generator.GeneratorContext.done
	});
}

function GeneratorAssertCanInvoke(generator) {
	if (generator.GeneratorState === GenStateExecuting) {
		throw new Error('Generator is already running');
	}
	if (generator.GeneratorState === GenStateCompleted) {
		throw new Error('Generator has already finished');
	}
}

function GeneratorNext(generator, value) {
	if (!IsObject(generator))
		throw new TypeError('Object expected');
	if (!('GeneratorState' in generator))
		throw new TypeError('Generator expected');
	GeneratorAssertCanInvoke(generator);
	var delegateInfo = GeneratorHandleDelegate(generator, GeneratorNext, value);
	if (delegateInfo)
		return delegateInfo;
	if (generator.GeneratorState === GenStateSuspendedYield)
		generator.GeneratorContext.sent = value;
	while (true) try {
		return GeneratorInvoke(generator);
	} catch (exception) {
		generator.GeneratorContext.dispatchException(exception);
	}
}

function GeneratorThrow(generator, exception) {
	if (!IsObject(generator))
		throw new TypeError('Object expected');
	if (!('GeneratorState' in generator))
		throw new TypeError('Generator expected');
	GeneratorAssertCanInvoke(generator);
	var delegateInfo = GeneratorHandleDelegate(generator, GeneratorThrow, exception);
	if (delegateInfo)
		return delegateInfo;
	if (generator.GeneratorState === GenStateSuspendedStart) {
		generator.GeneratorState = GenStateCompleted;
		throw exception;
	}
	while (true) {
		generator.GeneratorContext.dispatchException(exception);
		try {
			return GeneratorInvoke(generator);
		} catch (thrown) {
			exception = thrown;
		}
	}
}

function GeneratorHandleDelegate(generator, method, arg) {
	var delegate = generator.GeneratorContext.delegate,
		info;
	if (delegate) {
		try {
			info = method(delegate.generator, arg);
		} catch (uncaught) {
			generator.GeneratorContext.delegate = null;
			return GeneratorThrow(generator, uncaught);
		}

		if (info !== undefined) {
			if (!IsObject(info))
				throw new TypeError('Object expected');
			if (info.Value.done) {
				generator.GeneratorContext[delegate.resultName] = info.Value.value;
				generator.GeneratorContext.next = delegate.nextLoc;
			} else {
				return info;
			}
		}

		generator.GeneratorContext.delegate = null;
	}
}

var GeneratorProto = CreatePrototype({

	'@Iterator': function iterator() {
		return this;
	},

	init: function init() {
		// TODO: Each generator's init should probably adjust it's arity
		GeneratorInit(this, slice(arguments), this);
	},

	next: function next(value) {
		return GeneratorNext(this, value);
	},

	throw: function throw_(exception) {
		return GeneratorThrow(this, exception);
	}

});

var GeneratorContext = (function() {

	function GeneratorContext() {
		this.reset();
	}

	GeneratorContext.prototype = own({

		next: undefined,
		sent: undefined,
		tryStack: undefined,
		done: undefined,
		delegate: undefined,

		reset: function() {

			this.next = 0;
			this.sent = void 0;
			this.tryStack = create(null);
			this.tryStack.length = 0;
			this.done = false;
			this.delegate = null;

			// Pre-initialize at least 20 temporary variables to enable hidden
			// class optimizations for simple generators.
			for (var tempIndex = 0, tempName;
			hasOwn(this, tempName = 't' + tempIndex) || tempIndex < 20;
			++tempIndex)
				this[tempName] = null;

		},

		stop: function() {

			this.done = true;

			if (hasOwn(this, "thrown")) {
				var thrown = this.thrown;
				delete this.thrown;
				throw thrown;
			}

			return this.rval;

		},

		pushTry: function(catchLoc, finallyLoc, finallyTempVar) {
			if (finallyLoc)
				push(this.tryStack, {
					finallyLoc: finallyLoc,
					finallyTempVar: finallyTempVar
				});
			if (catchLoc)
				push(this.tryStack, {
					catchLoc: catchLoc
				});
		},

		popCatch: function(catchLoc) {
			var lastIndex = this.tryStack.length - 1,
				entry = this.tryStack[lastIndex];
			if (entry && entry.catchLoc === catchLoc)
				splice(this.tryStack, lastIndex);
		},

		popFinally: function(finallyLoc) {
			var lastIndex = this.tryStack.length - 1,
				entry = this.tryStack[lastIndex];
			if (!entry || !hasOwn(entry, "finallyLoc"))
				entry = this.tryStack[--lastIndex];
			if (entry && entry.finallyLoc === finallyLoc)
				this.tryStack.length = lastIndex;
		},

		dispatchException: function(exception) {

			var finallyEntries = create(null),
				dispatched = false;
			finallyEntries.length = 0;

			if (this.done)
				throw exception;

			// Dispatch the exception to the "end" location by default.
			this.thrown = exception;
			this.next = 'end';
			for (var i = this.tryStack.length - 1; i >= 0; --i) {
				var entry = this.tryStack[i];
				if (entry.catchLoc) {
					this.next = entry.catchLoc;
					dispatched = true;
					break;
				} else if (entry.finallyLoc) {
					push(finallyEntries, entry);
					dispatched = true;
				}
			}

			while (entry = pop(finallyEntries)) {
				this[entry.finallyTempVar] = this.next;
				this.next = entry.finallyLoc;
			}

		},

		delegateYield: function(generator, resultName, nextLoc) {

			var info = GeneratorNext(generator, this.sent);

			if (!IsObject(info))
				throw new TypeError('Object expected');

			if (info.Value.done) {
				this.delegate = null;
				this[resultName] = info.Value.value;
				this.next = nextLoc;

				return GeneratorContinue;
			}

			this.delegate = {
				generator: generator,
				resultName: resultName,
				nextLoc: nextLoc
			};

			return info.Value.value;

		}

	});

	return GeneratorContext;

})();