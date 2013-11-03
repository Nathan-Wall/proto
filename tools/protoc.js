#!/usr/bin/env node

var fs = require('fs'),
	program = require('commander'),
	proto = require('../lib/proto'),
	file;

program
	.usage('[file]')
	.parse(process.argv);

file = program.args.shift();

process.stdout.write(
	proto.transpile(fs.readFileSync(file))
);