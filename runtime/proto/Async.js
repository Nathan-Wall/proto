function CreateAsyncFunction(proto, progeneratedFn, name, arity, receiver) {
	if (arity === undefined)
		arity = progeneratedFn.length;
	if (arguments.length < 5)
		receiver = DYNAMIC_THIS;
	var genF = CreateGeneratorFunction(null, progeneratedFn);
	return CreateFunction(proto, createWrapper(progeneratedFn, function() {
		var gen = Call(genF, this, slice(arguments)),
			promise = Like(PromiseProto);
		PromiseInit(promise,
			CreateFunction(undefined, function(resolve, reject) {
				Set(gen, $$asyncResolve, resolve);
				Set(gen, $$asyncReject, reject);
			})
		);
		QueueMicrotask(function() {
			AsyncNext(gen);
		});
		return promise;
	}), name, arity, receiver);
}

function AsyncNext(gen, send) {
	try {
		AsyncHandleResult(gen, GeneratorNext(gen, send));
	}
	catch (x) {
		Call(Get(gen, $$asyncReject), undefined, [ proxyJs(x) ]);
		return;
	}
}

function AsyncThrow(gen, exception) {
	try {
		AsyncHandleResult(gen, GeneratorThrow(gen, exception));
	}
	catch (x) {
		Call(Get(gen, $$asyncReject), undefined, [ proxyJs(x) ]);
		return;
	}
}

function AsyncHandleResult(gen, result) {
	var value = Get(result, 'value'),
		done = Get(result, 'done');
	if (done) {
		Call(Get(gen, $$asyncResolve), undefined, [ value ]);
		return;
	}
	if (IsPromise(value))
		// TODO: Does this always create a useless return promise? If so, it could
		// be optimized to prevent this.
		PromiseThen(value,
			CreateFunction(undefined, function(v) {
				AsyncNext(gen, v);
			}),
			CreateFunction(undefined, function(x) {
				AsyncThrow(gen, x);
			})
		);
	else
		QueueMicrotask(function() {
			AsyncNext(gen, value);
		});
}