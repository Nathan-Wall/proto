// TODO: Make function declarations support lexical this:
//     fn foo() ::{ this; }
// I think this is already supported by the parser, just needs some transformation rules (make sure it hoists!)
var fs = require('fs'),
	path = require('path'),
	esprima = require('esprima'),
	traverser = require('./traverser'),
	Replacement = traverser.Replacement,
	traverse = require('./smart-traverse'),

	rootDir = path.resolve(__dirname, '..') + '/'

	lazyBind = Function.prototype.bind.bind(Function.prototype.call),
	slice = lazyBind(Array.prototype.slice),
	_splice = Array.prototype.splice;

function transpile(program) {

	var blockNode,
		blockKey,
		block = {
			insert: function(/* ...nodes */) {
				insert(slice(arguments));
			},
			hoist: function(/* ...nodes */) {
				insert(slice(arguments), true);
			}
		},
		toInsert = [ ];

	traverse(program, function(info) {

		var node = info.node,
			parents = info.parents,
			parent = info.parent,
			key = info.key;

		blockNode = info.blockNode;
		blockKey = info.blockKey;
		
		if (node == null)
			return false;

		if (node.type == 'FunctionDeclaration')
			checkFnDeclaration(parents);

		if (node.type == 'Literal'
		&& node.value === null)
			// `null` is just an identifier
			return new Replacement({
				__skip__: true,
				type: 'Identifier',
				name: '$__proto_null__$'
			});
		else if (node.type == 'Identifier'
		&& node.name == 'undefined')
			// `undefined` should be like any other identifier (mutable)
			return new Replacement({
				__skip__: true,
				type: 'Identifier',
				name: '$__proto_undefined__$'
			});
		else if (node.type == 'Identifier'
		&& node.name == 'nil')
			return new Replacement({
				__skip__: true,
				type: 'Identifier',
				name: 'undefined'
			});
		else if (node.type == 'MemberExpression'
		&& node.own)
			return replaceGetSetOwn(node, parents);
		else if (node.type == 'MemberExpression') {
			wrapMemberExpression(node, parents);
			return true;
		}
		else if (node.type == 'UnaryExpression'
		&& node.operator == 'typeof')
			return replaceTypeOf(node);
		else if (node.operator == '+') {
			if (node.left)
				node.left = toProtoCall('ToNumber', [ node.left ]);
			if (node.right)
				node.right = toProtoCall('ToNumber', [ node.right ]);
			if (node.argument)
				node.argument = toProtoCall('ToNumber', [ node.argument ]);
			//return replaceWrappedToNumber(node);
			return true;
		}
		else if (node.operator == '&') {
			node.operator = '+';
			if (node.left)
				node.left = toProtoCall('ToString', [ node.left ]);
			if (node.right)
				node.right = toProtoCall('ToString', [ node.right ]);
			if (node.argument)
				node.argument = toProtoCall('ToString', [ node.argument ]);
			return true;
		}
		else if (node.operator == '&&&') {
			node.operator = '&';
			return true;
		}
		else if (node.operator == '|||') {
			node.operator = '|';
			return true;
		}
		else if (node.operator == '!||') {
			node.operator = '^';
			return true;
		}
		else if (node.operator == '^'
		|| node.operator == '|')
			throw new Error('Operator not supported: ^');
		else if (node.type == 'UnaryExpression'
		&& node.operator == '#') {
			// For performance, we can use specialized creators for these
			// expressions.
			if (node.argument.type == 'ObjectExpression'
			|| node.argument.type == 'ArrayExpression') {
				node.argument.noProto = true;
				return new Replacement(node.argument);
			}
			return new Replacement(
				toProtoCall('Own', [ node.argument ])
			);
		}
		else if (node.type == 'ObjectExpression') {
			node.__skip__ = true;
			return new Replacement(
				toProtoCall('CreateObject', [
					Expression(
						node.noProto
							? 'null'
							: 'undefined'
					),
					node
				])
			);
		}
		else if (node.type == 'ArrayExpression')
			return new Replacement(
				toProtoCall(
					'CreateArray',
					[
						Expression(
							node.noProto
								? 'null'
								: '$__proto__$.Array'
						),
						{
							__skip__: true,
							type: 'ArrayExpression',
							elements: node.elements
						}
					]
				)
			);
		else if (node.type == 'UnaryExpression'
		&& node.operator == 'like')
			return new Replacement(
				toProtoCall('Like', [ node.argument ])
			);
		else if (node.type == 'NewExpression')
			return new Replacement(
				toProtoCall('New', [ node.callee ].concat(node.arguments))
			);
		else if (node.type == 'ArrowFunctionExpression')
			return replaceArrowFn(node);
		else if (node.type == 'AssignmentExpression'
		&& node.operator == ':=')
			return replaceDefinePropsOp(node);
		else if (node.type == 'BinaryExpression'
		&& node.operator == '::')
			return replaceBindOp(node, parent);
		else if (node.type == 'CallExpression')
			return replaceCallExpression(node);
		else if (node.type == 'FunctionExpression' && node.lexicalThis)
			return replaceLexicalThisFn(node);
		else if (node.type == 'FunctionDeclaration' && node.lexicalThis)
			return replaceLexicalThisFnDeclaration(node);
		else if (node.type == 'BinaryExpression' && node.operator == 'like')
			return new Replacement(
				toProtoCall('IsLike', [ node.left, node.right ])
			);

		return true;

	},
	function() {
		toInsert.forEach(function(info) {
			var index;
			if ('blockKey' in info) {
				index = +info.blockKey;
				while (info.beforeNode === undefined
				&& info.blockNode.length > index) {
					info.beforeNode = info.blockNode[index];
					index++;
				}
				if (info.beforeNode === undefined)
					throw new Error('Sibling not found');
				delete info.blockKey;
			}
		});
	});
	// esprima.parse(
	// 	fs.readFileSync(rootDir + 'runtime/runtime.js')
	// ).body.reverse().forEach(function(u) {
	// 	program.body.unshift(u);
	// });
	
	applyInsertions();

	return program;

	function Identifier(name) {
		return {
			__skip__: true,
			type: 'Identifier',
			name: name
		};
	}

	function Expression(s) {
		var node = esprima.parse(s).body[0].expression;
		traverse(node, function(info) {
			var n = info.node;
			if (n)
				n.__skip__ = true;
			return true;
		});
		return node;
	}

	function Literal(s) {
		return {
			__skip__: true,
			type: 'Literal',
			value: eval(s),
			raw: s
		};
	}

	function ArrayWrap(nodes) {
		return {
			__skip__: true,
			type: 'ArrayExpression',
			elements: nodes
		};
	}

	function toProtoCall(fn, args, props) {
		var node = {
			__skip__: true,
			type: 'CallExpression',
			callee: {
				__skip__: true,
				type: 'MemberExpression',
				computed: false,
				object: {
					__skip__: true,
					type: 'Identifier',
					name: '$__proto__$'
				},
				property: {
					__skip__: true,
					type: 'Identifier',
					name: fn
				}
			},
			arguments: args
		};
		if (Object(props) === props)
			Object.keys(props).forEach(function(key) {
				node[key] = props[key];
			});
		return node;
	}

	function tmpVar(node) {
		var name = '$__proto_' + ((Math.random() * 1024) | 0) + '__$'
		block.insert({
			__skip__: true,
			type: 'VariableDeclaration',
			declarations: [
				{
					__skip__: true,
					type: 'VariableDeclarator',
					id: {
						__skip__: true,
						type: 'Identifier',
						name: name
					},
					init: transpile(node)
				}
			],
			kind: 'var'
	    });
		return Identifier(name);
	}

	function getAssignment(node, parents) {
		for (var i = 0; i < parents.length; i++)
			if (parents[i].type != 'MemberExpression')
				break;
		var isAssignment = i < parents.length
			&& parents[i].type == 'AssignmentExpression'
			&& parents[i].left === (parents[i - 1] || node);
		if (!isAssignment)
			return false;
		var p = parents[i + 1],
			ch = parents[i],
			key;
		if (p === undefined)
			throw new Error('Expected assignment parent');
		Object.keys(p).some(function(k) {
			if (p[k] === ch) {
				key = k;
				return true;
			}
		});
		if (key === undefined)
			throw new Error('Key not found for assignment parent');
		return {
			node: ch,
			parent: p,
			key: key
		};
	}

	function wrapMemberExpression(node, parents) {
		if (getAssignment(node, parents))
			node.object = toProtoCall('NilSetThrow', [ node.object ]);
		else
			node.object = toProtoCall('NilCoerce', [ node.object ]);
		// I'm currently choosing this rather than something like
		// `Get(obj, key)` because this way will fail on the correct
		// line (in user code) in the event that `obj[key]` is a getter that throws,
		// rather than failing on a line generated by compilation. That seems to be
		// really the only difference between the two options. Another thing to
		// investigate would be if there is a performance difference between the
		// two options.
	}

	function replaceTypeOf(node) {
		return new Replacement(
			toProtoCall('ToType', [ node.argument ])
		);
	}

	function replaceWrappedToNumber(node) {
		return new Replacement(
			toProtoCall('ToNumber', [ node ])
		);
	}

	function replaceArrowFn(node) {
		node.type = 'FunctionExpression';
		if (node.expression) {
			node.body = {
				__skip__: true,
				type: 'BlockStatement',
				body: [ {
					__skip__: true,
					type: 'ReturnStatement',
					argument: node.body
				} ]
			};
			node.expression = false;
		}
		if (node.lexicalThis) {
			return replaceLexicalThisFn(node);
		}
		return true;
	}

	function replaceLexicalThisFn(node) {
		var foundThis = false;
		traverse(node, function(info) {
			var n = info.node;
			if (n && n.type == 'ThisExpression'
			|| n && n.type == 'CallExpression'
			&& n.callee.type == 'Identifier'
			&& n.callee.name == 'eval')
				foundThis = true;
			return !foundThis;
		});
		if (foundThis)
			return new Replacement({
				__skip__: true,
				type: 'CallExpression',
				callee: {
					__skip__: true,
					type: 'MemberExpression',
					computed: false,
					object: node,
					property: {
						__skip__: true,
						type: 'Identifier',
						name: 'bind'
					}
				},
				arguments: [
					{
						__skip__: true,
						type: 'ThisExpression'
					}
				]
			});
		return true;
	}

	function replaceLexicalThisFnDeclaration(node) {
		node.type = 'FunctionExpression';
		var boundFn = replaceLexicalThisFn(node).node;
		block.hoist({
			type: 'VariableDeclaration',
			declarations: [ {
				__skip__: true,
				type: 'VariableDeclarator',
				id: boundFn.callee.object.id,
				init: boundFn
			} ],
			kind: 'var'
		});
		return new Replacement();
	}

	function replaceDefinePropsOp(node) {
		var left = node.left,
			right = node.right;
		return new Replacement(
			toProtoCall('Mixin', [ left, right ])
		);
	}

	function translateBindOp(node) {
		var fn = tmpVar(node.right),
			obj = tmpVar(node.left);
		return {
			function: fn,
			object: obj
		};
	}

	function replaceBindOp(node, parent) {
		// Note: This does not handle bind + call operations such as `foo::bar()`.
		// Those are streamlined in `replaceCallExpression` for improved
		// performance.
		var info = translateBindOp(node);
		return new Replacement(
			// TODO: reorder fn and obj evaluation? (see related TODO below)
			toProtoCall('Bind', [ info.function, info.object ])
		);
	}

	function replaceGetSetOwn(node, parents) {
		var assignInfo = getAssignment(node, parents),
			assignParent = assignInfo.parent,
			assignNode = assignInfo.node,
			assignKey = assignInfo.key,
			prop;
		if (assignInfo) {
			if (!assignParent)
				throw new Error(
					'Expected parent node for assignment expression'
				);
			var prop = assignNode.left.property;
			if (!assignNode.left.computed)
				prop = Literal('"' + prop.name + '"');
			assignParent[assignKey] = transpile(toProtoCall(
				'SetOwn', [
					assignNode.left.object,
					prop,
					assignNode.right
				]
			));
			return false;
		}
		else {
			prop = node.property;
			if (!node.computed)
				prop = Literal('"' + prop.name + '"');
			return new Replacement(
				toProtoCall('GetOwn', [ node.object, prop ])
			);
		}
	}

	function replaceCallExpression(node) {
		var obj,
			prop,
			fn = node.callee,
			own;
		if (node.callee.type == 'MemberExpression') {
			obj = node.callee.object;
			prop = node.callee.property;
			own = node.callee.own;
			if (!node.callee.computed)
				prop = Literal('"' + prop.name + '"');
			// Call(Own)Method serves one purpose:
			// 1. It provides a convenient way to make a call without having to
			//    utilize temporary variables for calls such as `foo.bar.baz()`
			//    which would otherwise become `Call(foo.bar.baz, foo.bar)`
			//    computing `foo.bar` twice.
			// It was originally thought that it would also pave the way to enable
			// proxies invoke traps to still work, but it doesn't seem so at this
			// point.
			return new Replacement(
				toProtoCall(own ? 'CallOwnMethod' : 'CallMethod',
					[ obj, prop, ArrayWrap(node.arguments) ]
				)
			);
		}
		// For peformance considerations, we can combine these two operations.
		if (node.callee.type == 'BinaryExpression'
		&& node.callee.operator == '::') {
			obj = translateBindOp(node.callee);
			fn = obj.function;
			obj = obj.object;
		}
		if (obj === undefined) {
			obj = Identifier('undefined');
		}
		// TODO: reorder fn and obj evaluation? (see related TODO above)
		return new Replacement(
			toProtoCall('Call',
				[ fn, obj, ArrayWrap(node.arguments) ]
			)
		);
	}

	// Make sure function declarations only occur at the top level of a function
	// and not in any other block.
	// TODO: Move this checking logic into the parser.
	function checkFnDeclaration(parents) {
		var ptype2 = parents[1] && parents[1].type,
			ptype3 = parents[2] && parents[2].type;
		if (ptype2 != 'Program'
		&& ptype3 != 'FunctionDeclaration' && ptype3 != 'FunctionExpression')
			throw new Error('Unexpected function declaration');
	}

	function insert(nodes, hoist) {
		if (blockNode === undefined)
			throw new Error('No block found');
		if (String(+blockKey) !== blockKey)
			throw new Error('Invalid key: ' + blockKey);
		hoist = !!hoist;
		toInsert.push({
			__hoisted__: hoist,
			blockNode: blockNode,
			// blockKey is translated to beforeNode later
			blockKey: hoist ? 0 : blockKey,
			nodes: nodes
		});
	}

	function applyInsertions() {

		var hoists = [ ], other = [ ];

		toInsert.forEach(function(info) {
			if (info.__hoisted__)
				hoists.push(info);
			else
				other.push(info);
		});

		hoists.forEach(insert);
		other.forEach(insert);

		function insert(info) {
			var blockNode = info.blockNode,
				beforeNode = info.beforeNode,
				nodes = info.nodes,
				index = info.__hoisted__ ? 0 : -1;
			if (index == -1)
				for (var i = 0; i < blockNode.length; i++)
					if (blockNode[i] === beforeNode) {
						index = i;
						break;
					}
			if (index === -1)
				throw new Error('Cannot insert. Sibling node not found.');
			_splice.apply(
				blockNode,
				[ index, 0 ].concat(nodes)
			);
		}

	}

}

// function replaceNil(info) {
//
// 	var node = info.node,
// 		parents = info.parents;
//
// 	return new Replacement({
// 		type: 'MemberExpression',
// 		computed: false,
// 		object: {
// 			type: 'Identifier',
// 			name: '$__proto__$'
// 		},
// 		property: {
// 			type: 'Identifier',
// 			name: 'nil'
// 		}
// 	});
//
// }

module.exports = {
	transpile: transpile,
	Replacement: Replacement
};