'use strict';

var fs = require('fs'),
	path = require('path'),
	Mocha = require('mocha'),
	chai = require('chai'),
	proto = require('../lib/proto'),
	rootdir = __dirname,
	testsdir = path.join(rootdir, 'tests'),
	mocha = new Mocha({
		ui: 'bdd'
	}),
	contents;

global.assert = chai.assert;

proto.run(path.join(testsdir, 'test.pr'));