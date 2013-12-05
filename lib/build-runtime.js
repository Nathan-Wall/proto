'use strict';

var fs = require('fs'),
	path = require('path'),
	esprima = require('./esprima-harmony'),
	esgen = esprima.SyntaxTreeDelegate,
	traverse = require('./traverser').traverse,

	pushAll = Function.prototype.apply.bind(Array.prototype.push),

	RUNTIME_DIR = path.resolve(__dirname, '../runtime/proto');

function build(neededProps) {

	var propsLists = createPropsLists(),
		vars = propsLists.vars,
		funcs = propsLists.funcs,
		usedInfo = addNeededProps(neededProps, vars, funcs),
		neededPropsNames = usedInfo.neededNames,
		usedVars = usedInfo.vars,
		usedFuncs = usedInfo.funcs,
		defs = [ ];

	pushAll(defs, usedFuncs);
	if (usedVars.length > 0)
		defs.push(esgen.createVariableDeclaration(usedVars, 'var'));
	defs.push(
		esgen.createReturnStatement(
			esgen.createCallExpression(
				esgen.createMemberExpression('.',
					esgen.createIdentifier('Object'),
					esgen.createIdentifier('freeze')
				),
				[ toObjectLiteral(neededPropsNames) ]
			)
		)
	);

	return esgen.createProgram([
		esgen.createVariableDeclaration(
			[ esgen.createVariableDeclarator(
				esgen.createIdentifier('runtime'),
				esgen.createCallExpression(
					esgen.createFunctionExpression(
						null, [ ], [ ], 
						esgen.createBlockStatement(defs),
						null, false, false
					),
					[ ]
				)
			) ],
			'var'
		)
	]);

}

function createPropsLists() {

	var files = fs.readdirSync(RUNTIME_DIR),
		vars = Object.create(null),
		funcs = Object.create(null),
		names = [ ],
		program, node;

	for (var i = 0; i < files.length; i++) {
		try {
			program = esprima.parse(
				String(fs.readFileSync(path.join(RUNTIME_DIR, files[i])))
			).body;
		}
		catch (e) {
			throw new e.constructor(files[i] + ': ' + e.message);
		}
		for (var j = 0; j < program.length; j++) {
			node = program[j];
			switch(node.type) {
				case 'VariableDeclaration':
					for (var k = 0, d; k < node.declarations.length; k++)
						addTo(vars, node.declarations[k]);
					break;
				case 'FunctionDeclaration':
					addTo(funcs, node);
					break;
				case 'EmptyStatement':
					break;
				default:
					throw new TypeError(
						'Unexpected node type: "' + node.type + '"'
					);
			}
		}
	}

	return {
		vars: vars,
		funcs: funcs
	};

	function addTo(dict, item) {
		var name = item.id.name;
		if (name in vars || name in funcs)
			throw new Error(
				'Duplicate entry: "' + name + '"'
			);
		else
			dict[name] = item;
	}

}

function addNeededProps(neededProps, vars, funcs) {

	var names = [ ],
		usedVars = [ ],
		usedFuncs = [ ],
		usedSet = Object.create(null),
		depsMap = Object.create(null),
		prop, deps, end = [ ], d;

	for (var i = 0; i < neededProps.length; i++) {
		prop = neededProps[i];
		names.push(prop.name);
		deps = getDependencies(prop).deps;
		for (var j = deps.length - 1; j >= 0; j--)
			if (deps[j].cycle) {
				end.unshift(deps[j].name);
				deps.splice(j, 1);
			}
			else {
				deps[j] = deps[j].name;
			}
		pushAll(deps, end);
		throw deps;
		deps.push(prop.name);
		for (var j = 0; j < deps.length; j++) {
			d = deps[j];
			if (!usedSet[d]) {
				usedSet[d] = true;
				if (vars[d])
					usedVars.push(vars[d]);
				else if (funcs[d])
					usedFuncs.push(funcs[d]);
				else
					throw new Error('Unknown property: "' + d + '"');

			}
		}
	}
	
	return { neededNames: names, vars: usedVars, funcs: usedFuncs };

	function getDependencies(prop, seen) {

		var deps = [ ],
			cycle = false,
			depsSet = Object.create(null),
			forDepsMap = false,
			propName = prop.name,
			node, paramNames = [ ];

		if (seen === undefined) {
			seen = Object.create(null);
			forDepsMap = true;
		}
		else if (seen[propName])
			throw new Error('Unexpected cycle');
		seen[propName] = true;

		if (depsMap[propName])
			return depsMap[propName];

		node = vars[propName] || funcs[propName];
		if (node === undefined) {
			if (/^global_/.test(propName))
				throw new ReferenceError(
					'Undeclared variable: ' + propName.slice(7)
				);
			else
				throw new ReferenceError(
					'Proto runtime variable not found: ' + propName
				);
		}
		if (node.type == 'FunctionDeclaration')
			for (var i = 0; i < node.params.length; i++)
				paramNames.push(node.params[i].name);

		traverse(node, function(info) {

			var node = info.node,
				parent = info.parent,
				key = info.key,
				scope = info.persistentInfo,
				name, d, paramIndex, info;

			if (node == null)
				return false;

			// Test to see if the code path can be skipped based on the
			// the arguments which are not being passed in.
			if (prop.args
			&& node.type == 'IfStatement'
			&& node.alternate == null
			&& node.test.type == 'BinaryExpression'
			&& node.test.operator == '!=='
			&& node.test.right.type == 'Identifier'
			&& node.test.right.name == 'undefined'
			&& ~(paramIndex = paramNames.indexOf(node.test.left.name))
			&& !prop.args[paramIndex]) {
				// We can't store it in depsMap if we're skipping dependencies.
				forDepsMap = false;
				return false;
			}

			if (node.type == 'VariableDeclarator'
			|| node.type == 'FunctionDeclaration') {
				scope['id_' + node.id.name] = true;
				return true;
			}

			if (node.type == 'Identifier'
			&& parent.type == 'FunctionExpression'
			&& key == 'id') {
				Object.getPrototypeOf(scope)['id_' + node.name] = true;
				return false;
			}

			if (node.type == 'Identifier'
			&& parent
			// TODO: if computed, then let key pass
			&& (parent.type != 'MemberExpression' || key != 'property')
			&& (parent.type != 'Property' || key != 'key')
			&& !('id_' + node.name in scope)
			&& (node.name in vars || node.name in funcs)) {
				name = node.name;
				if (seen[name])
					cycle = name;
				else {
					info = { name: name };
					if (parent.type == 'CallExpression') {
						info.args = [ ];
						for (var i = 0; i < parent.arguments.length; i++)
							if (parent.arguments[i].type != 'Identifier'
							|| parent.arguments[i].name != 'undefined')
								info.args[i] = true;
					}
					d = getDependencies(info, seen);
					for (var i = 0; i < d.deps.length; i++)
						if (!depsSet[d.deps[i].name]) {
							depsSet[d.deps[i].name] = true;
							deps.push(d.deps[i]);
						}
					if (!depsSet[name]) {
						depsSet[name] = true;
						if (d.cycle) {
							deps.push({ name: name, cycle: true });
							if (d.cycle != name)
								cycle = d.cycle;
						}
						else
							deps.push({ name: name, cycle: false });
					}
				}
			}

			return true;

		});

		seen[propName] = false;

		if (forDepsMap)
			depsMap[propName] = deps;

		return { deps: deps, cycle: cycle };

	}

}

// function addNeededProps(neededProps, vars, funcs) {

// 	var used = [ ],
// 		usedSet = Object.create(null),
// 		depsMap = Object.create(null),
// 		prop, node, deps;

// 	for (var i = 0; i < neededProps.length; i++) {
// 		prop = neededProps[i];
// 		node = vars[prop] || funcs[prop];
// 		deps = getDependencies(node);
// 		// throw Object.keys(depsMap).filter(function(u) { return depsMap[u].length})
// 		if (node.id.name == 'ObjectProto') throw node.id.name + ':' + deps.filter(function(u) {
// 			u = u.id.name;
// 			if (!global.xy) global.xy = Object.create(null);
// 			if (!global.xy[u]) { global.xy[u] = true; return true; }
// 			return false;
// 		}).map(function(u) { return u.id.name; });
// 	}

// 	function getDependencies(node, seen) {

// 		if (seen === undefined)
// 			seen = Object.create(null);

// 		var deps = [ ];

// 		traverse(node, function(info) {

// 			var node = info.node,
// 				parent = info.parent,
// 				scope = info.persistentInfo,
// 				n;

// 			if (node == null)
// 				return false;

// 			if (node.type == 'VariableDeclarator') {
// 				scope['id_' + node.id.name] = true;
// 				return true;
// 			}

// 			if (node.type == 'Identifier'
// 			&& parent && parent.type != 'MemberExpression'
// 			&& !('id_' + node.name in scope)
// 			&& !seen[node.name]
// 			&& (node.name in vars || node.name in funcs)) {
// 				seen[node.name] = true;
// 				n = vars[node.name] || funcs[node.name];
// 				if (depsMap[node.name])
// 					pushAll(deps, depsMap[node.name]);
// 				else {
// 					depsMap[node.name] = getDependencies(n, seen);
// 					pushAll(deps, depsMap[node.name]);
// 				}
// 				deps.push(n);
// 				seen[node.name] = false;
// 			}

// 			return true;

// 		});

// 		return deps;

// 	}

// }

// function addNeededProps(neededProps, vars, funcs) {

// 	var used = [ ],
// 		usedVars = [ ],
// 		usedFuncs = [ ],
// 		usedSet = Object.create(null),
// 		node, prop, deps, d;

// 	neededProps = neededProps.slice();

// 	for (var i = 0; i < neededProps.length; i++) {
// 		prop = neededProps[i];
// 		node = vars[prop] || funcs[prop];
// 		deps = getDependencies(node);
// 		// throw prop + ':' + deps.map(function(u) { return u.id.name; });
// 		for (var j = 0; j < deps.length; j++) {
// 			d = deps[j];
// 			if (!(d.id.name in usedSet)) {
// 				usedSet[d.id.name] = true;
// 				used.push(d);
// 			}
// 		}
// 		if (!(node.id.name in usedSet)) {
// 			usedSet[node.id.name] = true;
// 			used.push(node);
// 		}
// 	}

// 	for (var i = 0; i < used.length; i++) {
// 		node = used[i];
// 		if (node.type == 'VariableDeclarator')
// 			usedVars.push(node);
// 		else if (node.type == 'FunctionDeclaration')
// 			usedFuncs.push(node);
// 		else
// 			throw new TypeError('Unexpected node type: "' + node.type + '"');
// 	}

// 	return { vars: usedVars, funcs: usedFuncs };	

// 	function getDependencies(of, seen) {

// 		if (seen === undefined)
// 			seen = Object.create(null);
// 		if (seen[of.id.name])
// 			return false;
// 		seen[of.id.name] = true;

// 		var deps = [ ], indices = Object.create(null), end = [ ];

// 		traverse(of, function(info) {

// 			var node = info.node,
// 				parent = info.parent,
// 				scope = info.persistentInfo,
// 				n, d, name;

// 			if (node == null)
// 				return false;

// 			if (node.type == 'VariableDeclarator') {
// 				scope['id_' + node.id.name] = true;
// 				return true;
// 			}

// 			if (node.type == 'Identifier'
// 			&& parent && parent.type != 'MemberExpression'
// 			&& !('id_' + node.name in scope)
// 			&& (node.name in vars || node.name in funcs)) {
// 				n = vars[node.name] || funcs[node.name];
// 				if (seen[node.name]) {
// 					end.push(n);
// 					deps[indices[node.name]] = null;
// 				}
// 				d = getDependencies(n, seen);
// 				if (d === false)
// 					end.push(n);
// 				else
// 					for (var i = 0; i < d.length; i++) {
// 						name = d[i].id.name;
// 						indices[name] = deps.length;
// 						deps.push(d[i]);
// 					}
// 				indices[n.id.name] = deps.length;
// 				deps.push(n);
// 			}

// 			return true;

// 		});
// // if (of.id.name == 'ObjectProto') throw deps.map(function(u) { return u.id.name });
// 		seen[of.id.name] = false;

// 		return deps.filter(function(u) { return u !== null; }).concat(end);

// 	}

// }

function _addNeededProps(neededProps, vars, funcs) {

	var usedVars = [ ],
		usedFuncs = [ ],
		usedSet = Object.create(null),
		usedA = [ ];

	for (var i = 0; i < neededProps.length; i++)
		insertNeeded(neededProps[i]);
throw usedA;
	return { vars: usedVars, funcs: usedFuncs };

	function insertNeeded(prop, seen) {
		if (seen === undefined)
			seen = Object.create(null);
		if (seen[prop])
			return;
		seen[prop] = true;
		if (prop in vars)
			insertToUsed(usedVars, vars[prop], prop, seen);
		else if (prop in funcs)
			insertToUsed(usedFuncs, funcs[prop], prop, seen);
		else
			throw new Error('Unexpected needed property "' + prop + '"');
		seen[prop] = false;
	}

	function insertToUsed(used, node, prop, seen) {

		traverse(node, function(info) {

			var node = info.node,
				parent = info.parent,
				scope = info.persistentInfo;

			if (node == null)
				return false;

			if (node.type == 'VariableDeclarator') {
				scope['id_' + node.id.name] = true;
				return true;
			}

			if (node.type == 'Identifier'
			&& parent && parent.type != 'MemberExpression'
			&& !('id_' + node.name in scope)
			&& (node.name in vars
				|| node.name in funcs)
			&& !(node.name in usedSet))
				insertNeeded(node.name, seen);

			return true;

		});

		if (!(prop in usedSet)) {
			usedA.push(prop);
			usedSet[prop] = true;
			used.push(node);
		}

	}
}

function toObjectLiteral(r) {

	var props = [ ],
		node = esgen.createObjectExpression(props),
		name;

	for (var i = 0; i < r.length; i++) {
		name = r[i];
		props.push(
			esgen.createProperty('init',
				esgen.createIdentifier(name),
				esgen.createIdentifier(name),
				false,
				false
			)
		)
	}

	return node;

}

module.exports = {
	build: build
};