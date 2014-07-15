// This is based on https://github.com/domenic/promises-unwrapping
// commit ab245ff421075c6d8351a26c0f8b9e791bc7c76c

// TODO: Is ReturnIfAbrupt supposed to throw or ignore an exception?

var PromiseProto = CreatePrototype({

	init: function init(resolver) {
		ExpectFunction(resolver);
		PromiseInit(this, resolver);
	},

	then: function then(onFulfilled, onRejected) {
		return PromiseThen(this, onFulfilled, onRejected);
	},

	catch: function catch_(onRejected) {
		return PromiseThen(this, undefined, onRejected);
	},

	static_cast: function cast(value) {
		return CastToPromise(this, value);
	},

	static_all: function all(promises) {
		return PromiseAll(this, promises);
	}

});

function CastToPromise(P, x) {
	var proto, deferred;
	if (IsPromise(x)) {
		proto = getPrototypeOf(x);
		if (proto === P)
			return x;
	}
	deferred = GetDeferred(P);
	Call(deferred.Resolve, undefined, [ x ]);
	return deferred.Promise;
}

function GetDeferred(P) {
	var deferred, resolver, promise;
	ExpectObject(P);
	deferred = { Promise: undefined, Resolve: undefined, Reject: undefined };
	resolver = CreateDeferredConstructionFunction();
	Set(resolver, $$promiseDeferred, deferred);
	promise = New(P, [ resolver ]);
	ExpectFunction(deferred.Resolve);
	ExpectFunction(deferred.Reject);
	deferred.Promise = promise;
	return deferred;
}

function IsPromise(x) {
	if (!IsObject(x))
		return false;
	if (Get(x, $$promiseStatus) === undefined)
		return false;
	return true;
}

function MakePromiseReactionFunction(deferred, handler) {
	var F = CreatePromiseReactionFunction();
	Set(F, $$promiseDeferred, deferred);
	Set(F, $$promiseHandler, handler);
	return F;
}

function PromiseReject(promise, reason) {
	var reactions;
	if (Get(promise, $$promiseStatus) != 'unresolved')
		return;
	reactions = Get(promise, $$promiseRejectReactions);
	Set(promise, $$promiseResult, reason);
	Set(promise, $$promiseResolveReactions, undefined);
	Set(promise, $$promiseRejectReactions, undefined);
	Set(promise, $$promiseStatus, 'has-rejection');
	TriggerPromiseReactions(reactions, reason);
}

function PromiseResolve(promise, resolution) {
	var reactions;
	if (Get(promise, $$promiseStatus) !== 'unresolved')
		return;
	reactions = Get(promise, $$promiseResolveReactions);
	Set(promise, $$promiseResult, resolution);
	Set(promise, $$promiseResolveReactions, undefined);
	Set(promise, $$promiseRejectReactions, undefined);
	Set(promise, $$promiseStatus, 'has-resolution');
	TriggerPromiseReactions(reactions, resolution);
}

function TriggerPromiseReactions(reactions, argument) {
	for (var i = 0; i < reactions.length; i++)
		(function(reaction) {
			QueueMicrotask(function() {
				Call(reaction, undefined, [ argument ]);
			});			
		})(reactions[i]);
}

function CreateDeferredConstructionFunction() {
	var F = CreateFunction(null, function(resolve, reject) {
		var deferred = Get(F, $$promiseDeferred);
		deferred.Resolve = resolve;
		deferred.Reject = reject;
	});
	return F;
}

function CreatePromiseAllCountdownFunction() {
	var F = CreateFunction(null, function(x) {
		var index = Get(F, $$promiseIndex),
			values = Get(F, $$promiseValues),
			deferred = Get(F, $$promiseDeferred),
			countdownHolder = Get(F, $$promiseCountdownHolder);
		values[index] = x;
		if (values.length < index + 1)
			values.length = index + 1;
		countdownHolder.Countdown--;
		if (countdownHolder.Countdown == 0)
			return Call(deferred.Resolve, undefined, [
				CreateArray(undefined, values)
			]);
	});
	return F;
}

function CreatePromiseReactionFunction() {
	var F = CreateFunction(null, function(x) {
		var deferred = Get(F, $$promiseDeferred),
			handler = Get(F, $$promiseHandler),
			handlerResult,
			then;
		try { handlerResult = Call(handler, undefined, [ x ]); }
		catch (e) {
			Call(deferred.Reject, undefined, [ proxyJs(e) ]);
			return;
		}
		if (!IsObject(handlerResult)) {
			Call(deferred.Resolve, undefined, [ handlerResult ]);
			return;
		}
		if (handlerResult === deferred.Promise)
			Call(deferred.Reject, undefined, [
				new TypeError('Promise cannot resolve itself')
			]);
		if (IsPromise(handlerResult))
			PromiseThen(handlerResult, deferred.Resolve, deferred.Reject);
		else
			Call(deferred.Resolve, undefined, [ handlerResult ]);
	});
	return F;
}

function CreatePromiseResolutionHandlerFunction() {
	var F = CreateFunction(null, function(x) {
		var fulfillmentHandler = Get(F, $$promiseFulfillmentHandler),
			rejectionHandler = Get(F, $$promiseRejectionHandler);
		if (IsPromise(x))
			return PromiseThen(x, fulfillmentHandler, rejectionHandler);
		return Call(fulfillmentHandler, undefined, [ x ]);
	});
	return F;
}

function CreateRejectPromiseFunction() {
	var F = CreateFunction(null, function(reason) {
		var promise = Get(F, $$promise);
		return PromiseReject(promise, reason);
	});
	return F;
}

function CreateResolvePromiseFunction() {
	var F = CreateFunction(null, function(resolution) {
		var promise = Get(F, $$promise);
		return PromiseResolve(promise, resolution);
	});
	return F;
}

function PromiseInit(promise, resolver) {
	var resolve, reject;
	Set(promise, $$promiseStatus, 'unresolved');
	Set(promise, $$promiseResolveReactions, createSack());
	Set(promise, $$promiseRejectReactions, createSack());
	resolve = CreateResolvePromiseFunction();
	Set(resolve, $$promise, promise);
	reject = CreateRejectPromiseFunction();
	Set(reject, $$promise, promise);
	try { Call(resolver, undefined, [ resolve, reject ]); }
	catch (e) { PromiseReject(promise, proxyJs(e)); }
}

function PromiseAll(proto, iterable) {
	var deferred = GetDeferred(proto),
		iterator, values, index, next, nextPromise, countdownFunction, result,
		countdownHolder, nextValue;
	try { iterator = GetIterator(iterable); }
	catch (e) {
		PromiseReject(deferred.Promise, proxyJs(e));
		return deferred.Promise;
	}
	values = createSack();
	countdownHolder = { Countdown: 0 };
	index = 0;
	while (true) {
		try { next = IteratorStep(iterator); }
		catch (e) {
			PromiseReject(deferred.Promise, proxyJs(e));
			return deferred.Promise;
		}
		if (next === false) {
			if (index == 0)
				Call(deferred.Resolve, undefined, [
					CreateArray(undefined, values)
				]);
			return deferred.Promise;
		}
		try { nextValue = IteratorValue(next); }
		catch (e) {
			PromiseReject(deferred.Promise, proxyJs(e));
			return deferred.Promise;
		}
		try { nextPromise = CastToPromise(proto, nextValue); }
		catch (e) {
			PromiseReject(deferred.Promise, proxyJs(e));
			return deferred.Promise;
		}
		countdownFunction = CreatePromiseAllCountdownFunction();
		Set(countdownFunction, $$promiseIndex, index);
		Set(countdownFunction, $$promiseValues, values);
		Set(countdownFunction, $$promiseDeferred, deferred);
		Set(countdownFunction, $$promiseCountdownHolder, countdownHolder);
		try {
			result = PromiseThen(
				nextPromise, countdownFunction, deferred.Reject
			);
		} catch (e) {
			PromiseReject(deferred.Promise, proxyJs(e));
			return deferred.Promise;
		}
		index++;
		countdownHolder.Countdown++;
	}
}

function PromiseThen(promise, onFulfilled, onRejected) {
	if (!IsPromise(promise))
		throw new TypeError('Promise expected');
	var proto = getPrototypeOf(promise),
		deferred = GetDeferred(proto),
		rejectionHandler,
		fulfillmentHandler,
		resolutionHandler,
		resolveReaction,
		rejectReaction,
		status;
	rejectionHandler = deferred.Reject;
	if (onRejected !== undefined)
		rejectionHandler = ExpectFunction(onRejected);
	fulfillmentHandler = deferred.Resolve;
	if (onFulfilled !== undefined)
		fulfillmentHandler = ExpectFunction(onFulfilled);
	resolutionHandler = CreatePromiseResolutionHandlerFunction();
	Set(resolutionHandler, $$promiseFulfillmentHandler, fulfillmentHandler);
	Set(resolutionHandler, $$promiseRejectionHandler, rejectionHandler);
	resolveReaction = MakePromiseReactionFunction(deferred, resolutionHandler);
	rejectReaction = MakePromiseReactionFunction(deferred, rejectionHandler);
	status = Get(promise, $$promiseStatus);
	if (status === 'unresolved') {
		push(Get(promise, $$promiseResolveReactions), resolveReaction);
		push(Get(promise, $$promiseRejectReactions), rejectReaction);
	}
	else if (status === 'has-resolution')
		QueueMicrotask(function() {
			Call(resolveReaction, undefined, [ Get(promise, $$promiseResult) ]);
		});
	else if (status === 'has-rejection')
		QueueMicrotask(function() {
			Call(rejectReaction, undefined, [ Get(promise, $$promiseResult) ]);
		});
	return deferred.Promise;
}

function QueueMicrotask(f) {
	setTimeout(f, 0);
}