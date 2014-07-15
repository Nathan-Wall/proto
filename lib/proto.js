'use strict';

var fs = require('fs'),
	path = require('path'),
	proprima = require('./proprima/proprima'),
	escodegen = require('escodegen'),
	ejs = require('ejs'),
	compiler = require('./compiler/compiler'),
	buildRuntime = require('./build-runtime').build,
	rootDir = path.resolve(__dirname, '..') + '/';

function wrap(source, neededRuntimeProps) {
	return String(ejs.render(
		String(fs.readFileSync(rootDir + 'runtime/wrap.ejs')),
		{
			filename: rootDir + 'runtime/wrap.ejs',
			source: source,
			runtime: escodegen.generate(buildRuntime(neededRuntimeProps))
		}
	));
}

function compile(source, relativePath, fullRuntime) {
	if (relativePath === undefined)
		relativePath = '.';
	var compiled = compiler.compile(
			proprima.parse(source), relativePath
		),
		jsSource = escodegen.generate(compiled.program);
	return wrap(
		jsSource,
		fullRuntime ? undefined : compiled.neededRuntimeProps
	);
}

function run(file) {
	try {
		(0, eval)(
			'(function(require) {'
				+ compile(
					fs.readFileSync(file),
					path.dirname(file),
					true
				)
			+ '})'
		)(require);
	}
	catch (x) {
		// TODO: This doesn't seem to work as intended...
		//console.error('(' + compiler.state.file + ')');
		throw x;
	}
}

module.exports = {
	compile: compile,
	run: run
};