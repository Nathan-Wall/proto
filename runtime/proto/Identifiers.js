// TODO: Give this module integrity

var Identifiers = (function() {

	var ALPHANUM = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

	function Identifiers(chars) {
		this._curId = [ 0 ];
		if (chars !== undefined)
			this._chars = String(chars);
	}

	Identifiers.prototype = {

		_curId: undefined,
		_chars: ALPHANUM,

		next: function next() {
			return toIdentifierName(this._curId, this._chars);
		}

	};

	Identifiers.getRandomChar = function(chars) {
		return getRandomChar(chars === undefined ? ALPHANUM : String(chars));
	};
	
	Identifiers.getRandomString = function(length, chars) {
		return getRandomString(
			chars === undefined ? ALPHANUM : String(chars),
			length
		);
	};

	return Identifiers;

})();

function toIdentifierName(r, chars) {
	var id = [ getRandomChar(chars) ];
	for (var i = 0; i < r.length; i++)
		id.push(chars.charAt(r[i]));
	r[0]++;
	i = 0;
	while (r[i] >= chars.length) {
		r[i] = 0;
		if (i < r.length - 1)
			r[i + 1]++;
		else
			r.push(0);
		i++;
	}
	return id.join('');
}

function getRandomString(chars, length) {
	var r = [ ];
	for (var i = 0; i < length; i++)
		r.push(getRandomChar(chars));
	return r.join('');
}

function getRandomChar(chars) {
	var L = chars.length;
	return chars.charAt(Math.floor(Math.random() * L) % L);
}