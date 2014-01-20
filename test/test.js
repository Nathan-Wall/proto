'use strict';

var fs = require('fs'),
	path = require('path'),
	chai = require('chai'),
	proto = require('../lib/proto'),
	rootdir = __dirname,
	testsdir = path.join(rootdir, 'tests'),
	contents;

global.assert = chai.assert;

(0, eval)(proto.compile(
	fs.readFileSync(path.join(testsdir, 'test.pr')),
	testsdir,
	true
));