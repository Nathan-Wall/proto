function CreateAsyncFunction(proto, progeneratedFn, name, arity) {
	if (arity === undefined)
		arity = progeneratedFn.length;
	var genF = CreateGeneratorFunction(null, progeneratedFn);
	return CreateFunction(proto, createWrapper(progeneratedFn, function() {
		var gen = Call(genF, this, slice(arguments)),
			promise = Like(PromiseProto);
		PromiseInit(promise,
			CreateFunction(undefined, function(resolve, reject) {
				gen.AsyncResolve = resolve;
				gen.AsyncReject = reject;
			})
		);
		AsyncNext(gen);
		return promise;
	}), name, arity);
}

function AsyncNext(gen, send) {
	var info, value, done;
	try { info = GeneratorNext(gen, send); }
	catch (x) {
		Call(gen.AsyncReject, undefined, [ x ]);
		return;
	}
	value = info.Value.value;
	done = info.Value.done;
	if (done) {
		Call(gen.AsyncResolve, undefined, [ value ]);
		return;
	}
	if (!IsPromise(value))
		throw new TypeError('Promise expected');
	// TODO: Does this always create a useless return promise? If so, it could
	// be optimized to prevent this.
	PromiseThen(value,
		CreateFunction(undefined, function(v) {
			AsyncNext(gen, v);
		}),
		CreateFunction(undefined, function(x) {
			GeneratorThrow(gen, x);
		})
	);
}