var console = CreatePrototype({

	log: function log(/* ...values */) {
		Log(arguments);
	}

});

function Log(values) {
	var args = create(null),
		value;
	args.length = 0;
	for (var i = 0; i < values.length; i++) {
		value = values[i];
		if (IsWrapper(value))
			push(args, value.Value);
		else
			push(args, value);
	}
	consoleLog(args);
}