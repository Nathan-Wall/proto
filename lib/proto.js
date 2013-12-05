'use strict';

var fs = require('fs'),
	path = require('path'),
	proprima = require('./proprima'),
	escodegen = require('escodegen'),
	ejs = require('ejs'),
	transpiler = require('./transpiler'),
	progenerator = require('./progenerator/main'),
	buildRuntime = require('./build-runtime').build,
	rootDir = path.resolve(__dirname, '..') + '/';

function wrap(source, neededRuntimeProps) {
	return String(ejs.render(
		String(fs.readFileSync(rootDir + 'runtime/wrap.ejs')),
		{
			filename: rootDir + 'runtime/wrap.ejs',
			source: source,
			runtime: escodegen.generate(buildRuntime(neededRuntimeProps)),
			_transpileFile: function(filename) {
				return _transpileFile(filename, [ 'P' ]);
			}
		}
	));
}

function _transpileFile(filename, idWhiteList) {
	var file = path.resolve(rootDir + 'runtime/', filename),
		source = fs.readFileSync(file),
		program = proprima.parse(source),
		transpiled = transpiler.transpile(
			program, path.dirname(file), idWhiteList
		);
	return escodegen.generate(transpiled.program);
}

module.exports = {
	transpile: function transpile(source, relativePath) {
		if (relativePath === undefined)
			relativePath = '.';
		var transpiled = transpiler.transpile(
			proprima.parse(source), relativePath
		);
		var source = escodegen.generate(transpiled.program);
		return wrap(source, transpiled.neededRuntimeProps);
	}
};