#!/usr/bin/env node

var http = require('http'),
	path = require('path'),
	url = require('url'),
	fs = require('fs'),
	program = require('commander'),
	proto = require('../lib/proto'),
	root, port,

	HEADERS = {
		'.js': 'text/javascript',
		'.css': 'text/css',
		'.html': 'text/html'
	};

program
	.usage('[options] [dir]')
	.option('-p, --port <port>', 'specify port [3000]', Number, 3000)
	.parse(process.argv);

root = path.resolve(program.args.shift() || '.');
port = program.port;

http.createServer(function(req, res) {
	var file = path.join(root, url.parse(req.url).pathname),
		ext = path.extname(file);
	switch (ext) {
		case '.proto':
			fs.readFile(file, function(err, source) {
				if (err)
					return res.end('File read error');
				res.setHeader('Content-type', 'text/javascript');
				res.end(
					proto.compile(String(source), path.dirname(file), true)
				);
			});
			break;
		case '.js':
		case '.css':
		case '.html':
			fs.readFile(file, function(err, source) {
				if (err)
					return res.end('File read error');
				res.setHeader('Content-type', HEADERS[ext]);
				res.end(String(source));
			});
			break;
		default:
			res.end('File type not supported');
	}
}).listen(port);

console.log('Server running on port ' + port);