function CreateAsyncFunction(proto, progeneratedFn) {
	var genF = CreateGeneratorFunction(null, progeneratedFn);
	return CreateFunction(proto, function() {
		var gen = Call(genF, this, slice(arguments)),
			promise = Like(PromiseProto);
		PromiseInit(promise,
			CreateFunction(undefined, function(resolve) {
				gen.AsyncResolve = resolve;
			})
		);
		AsyncNext(gen);
		return promise;
	});
}

function AsyncNext(gen, send) {
	var info = GeneratorNext(gen, send),
		value = info.Value.value,
		done = info.Value.done;
	if (done) {
		Call(gen.AsyncResolve, undefined, [ value ]);
		return;
	}
	if (!IsPromise(value))
		throw new TypeError('Promise expected');
	PromiseThen(value, CreateFunction(undefined, function(v) {
		AsyncNext(gen, v);
	}));
}