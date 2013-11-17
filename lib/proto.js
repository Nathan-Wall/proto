'use strict';

var fs = require('fs'),
	path = require('path'),
	proprima = require('./proprima'),
	escodegen = require('escodegen'),
	ejs = require('ejs'),
	transpiler = require('./transpiler'),
	regenerator = require('./regenerator/main'),
	rootDir = path.resolve(__dirname, '..') + '/';

function wrap(source, extraRuntimes) {
	return String(ejs.render(
		String(fs.readFileSync(rootDir + 'runtime/wrap.ejs')),
		{
			filename: rootDir + 'runtime/wrap.ejs',
			source: source,
			extraRuntimes: extraRuntimes,
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
		var extra;
		if (transpiled.needsGeneratorRuntime)
			extra = fs.readFileSync(regenerator.runtime.dev, 'utf-8');
		return wrap(source, extra);
	}
};