var fs = require('fs'),
	path = require('path'),
	esprima = require('./esprima-proto'),
	escodegen = require('escodegen'),
	ejs = require('ejs'),
	transpiler = require('./transpiler'),
	rootDir = path.resolve(__dirname, '..') + '/';

function wrap(source) {
	return String(ejs.render(
		String(fs.readFileSync(rootDir + 'runtime/wrap.ejs')),
		{
			filename: rootDir + 'runtime/wrap.ejs',
			source: source
		}
	));
}

module.exports = {
	transpile: function transpile(source) {
		return wrap(
			escodegen.generate(
				transpiler.transpile(
					esprima.parse(source)
				)
			)
		);
	}
};