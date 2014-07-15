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

var GENSTATE_SUSPENDED_START = 'suspendedStart',
	GENSTATE_SUSPENDED_YIELD = 'suspendedYield',
	GENSTATE_EXECUTING = 'executing',
	GENSTATE_COMPLETED = 'completed',

	// Returning this object from the innerFn has the same effect as
	// breaking out of the dispatch switch statement.
	GENERATOR_CONTINUE = create(null);

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
	Set(obj, $$generatorStart, progeneratedFn);
	return CreateFunction(undefined, function() {
		var iter = Like(obj);
		GeneratorInit(iter, CreateArray(null, arguments), this);
		return iter;
	}, name, arity, receiver);
}

function GeneratorInit(generator, args, receiver) {

	ExpectObject(generator);
	if (!Has(generator, $$generatorStart))
		throw new TypeError('Generator prototype expected');

	ExpectObject(args);

	Set(generator, $$generatorInnerFn, bind(
		apply(Get(generator, $$generatorStart), receiver, GetArrayValues(args)),
		receiver
	));
	// TODO: Change from `new GeneratorContext()` to `CreateGeneratorContext()`.
	Set(generator, $$generatorContext, new GeneratorContext());
	Set(generator, $$generatorState, GENSTATE_SUSPENDED_START);

}

function GeneratorInvoke(generator) {
	var context = Get(generator, $$generatorContext),
		value;
	Set(generator, $$generatorState, GENSTATE_EXECUTING);
	do {
		value = Get(generator, $$generatorInnerFn)(context);
	} while (value === GENERATOR_CONTINUE);
	// If an exception is thrown from innerFn, we leave state ===
	// GENSTATE_EXECUTING and loop back for another invocation.
	Set(generator, $$generatorState,
		context.done ? GENSTATE_COMPLETED : GENSTATE_SUSPENDED_YIELD
	);
	return CreateSimpleObject({
		value: value,
		done: context.done
	});
}

function GeneratorAssertCanInvoke(generator) {
	var state = Get(generator, $$generatorState);
	if (state === GENSTATE_EXECUTING)
		throw new Error('Generator is already running');
	if (state === GENSTATE_COMPLETED)
		throw new Error('Generator has already finished');
}

function GeneratorNext(generator, value) {
	ExpectObject(generator);
	if (!Has(generator, $$generatorState))
		throw new TypeError('Generator expected');
	GeneratorAssertCanInvoke(generator);
	var delegateInfo = GeneratorHandleDelegate(generator, GeneratorNext, value),
		context = Get(generator, $$generatorContext);
	if (delegateInfo)
		return delegateInfo;
	if (Get(generator, $$generatorState) === GENSTATE_SUSPENDED_YIELD)
		context.sent = value;
	while (true) try {
		return GeneratorInvoke(generator);
	} catch (exception) {
		context.dispatchException(
			proxyJs(exception)
		);
	}
}

function GeneratorThrow(generator, exception) {
	ExpectObject(generator);
	if (!(Has(generator, $$generatorState)))
		throw new TypeError('Generator expected');
	GeneratorAssertCanInvoke(generator);
	var delegateInfo = GeneratorHandleDelegate(
		generator, GeneratorThrow, exception
	);
	if (delegateInfo)
		return delegateInfo;
	if (Get(generator, $$generatorState) === GENSTATE_SUSPENDED_START) {
		Set(generator, $$generatorState, GENSTATE_COMPLETED);
		throw UnwrapProto(exception);
	}
	while (true) {
		Get(generator, $$generatorContext).dispatchException(exception);
		try {
			return GeneratorInvoke(generator);
		} catch (thrown) {
			exception = proxyJs(thrown);
		}
	}
}

function GeneratorHandleDelegate(generator, method, arg) {
	var context = Get(generator, $$generatorContext),
		delegate = context.delegate,
		info;
	if (delegate) {
		try {
			info = method(delegate.generator, arg);
		} catch (uncaught) {
			context.delegate = null;
			return GeneratorThrow(generator, proxyJs(uncaught));
		}
		if (info !== undefined) {
			ExpectObject(info);
			if (Get(info, 'done')) {
				context[delegate.resultName] = Get(info, 'value');
				context.next = delegate.nextLoc;
			}
			else
				return info;
		}
		context.delegate = null;
	}
}

var GeneratorProto = CreatePrototype({

	'@@iterator': function iterator() {
		return this;
	},

	init: function init() {
		// TODO: Each generator's init should probably adjust it's arity
		GeneratorInit(this, CreateArray(null, arguments), this);
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
				throw UnwrapProto(thrown);
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
				throw UnwrapProto(exception);

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

			var info = GeneratorNext(generator, this.sent),
				value = Get(info, 'value');

			ExpectObject(info);

			if (Get(info, 'done')) {
				this.delegate = null;
				this[resultName] = value;
				this.next = nextLoc;
				return GENERATOR_CONTINUE;
			}

			this.delegate = {
				generator: generator,
				resultName: resultName,
				nextLoc: nextLoc
			};

			return value;

		}

	});

	return GeneratorContext;

})();