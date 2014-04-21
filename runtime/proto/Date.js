var DateProto = CreatePrototype({

	static_now: function() {
		return DateNow();
	},

	static_parse: function(s) {
		return DateParse(s);
	}

});