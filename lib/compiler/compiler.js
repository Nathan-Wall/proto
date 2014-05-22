'use strict';

var fs = require('fs'),
	path = require('path'),
	proprima = require('../proprima'),
	esprima = require('../esprima-harmony'),
	Identifiers = require('../identifiers'),
	identifiers = setupIdentifiers(),
	traverser = require('../traverser'),
	traverse = traverser.traverse,
	containsNode = traverser.containsNode,
	containsNodeType = traverser.containsNodeType,
	sequencer = require('./sequencer'),
	isSequenceable = sequencer.isSequenceable,
	statementToExpression = sequencer.statementToExpression,
	progenerator = require('../progenerator/main'),
	// TODO: remove this when ejs is removed as a default file type from the
	// built-in module loader.
	ejs = require('ejs'),

	lazyTie = Function.prototype.bind.bind(Function.prototype.apply),
	create = Object.create,
	isArray = Array.isArray,
	pushAll = lazyTie(Array.prototype.push),

	protogen = wrapProtogen(proprima.SyntaxTreeDelegate),
	esgen = wrapEsgen(esprima.SyntaxTreeDelegate),
	identifiers,
	blockInterceptIds = new Identifiers(),

	processors = {
		ArrayExpression: ArrayExpression,
		ArrayPattern: ArrayPattern,
		AssignmentExpression: AssignmentExpression,
		BinaryExpression: BinaryExpression,
		BlockStatement: BlockStatement,
		BreakStatement: BreakStatement,
		CallExpression: CallExpression,
		CascadeContext: CascadeContext,
		CascadeStatement: CascadeStatement,
		CatchClause: CatchClause,
		Coercive: Coercive,
		ComprehensionBlock: ComprehensionBlock,
		ComprehensionExpression: ComprehensionExpression,
		ConditionalExpression: ConditionalExpression,
		ContinueStatement: ContinueStatement,
		DebuggerStatement: DebuggerStatement,
		DoWhileStatement: DoWhileStatement,
		EmptyStatement: EmptyStatement,
		ExportDeclaration: ExportDeclaration,
		ExportBatchSpecifier: ExportBatchSpecifier,
		ExportSpecifier: ExportSpecifier,
		ExpressionStatement: ExpressionStatement,
		ForOfStatement: ForOfStatement,
		ForStatement: ForStatement,
		FunctionDeclaration: FunctionDeclaration,
		FunctionExpression: FunctionExpression,
		Identifier: Identifier,
		IfStatement: IfStatement,
		ImportDeclaration: ImportDeclaration,
		ImportSpecifier: ImportSpecifier,
		LabeledStatement: LabeledStatement,
		Literal: Literal,
		LogicalExpression: LogicalExpression,
		MemberExpression: MemberExpression,
		ModuleDeclaration: ModuleDeclaration,
		NewExpression: NewExpression,
		ObjectExpression: ObjectExpression,
		ObjectPattern: ObjectPattern,
		PartialApplicationExpression: PartialApplicationExpression,
		Program: Program,
		Property: Property,
		ReturnStatement: ReturnStatement,
		SequenceExpression: SequenceExpression,
		SlotExpression: SlotExpression,
		SpreadElement: SpreadElement,
		StatementExpression: StatementExpression,
		SwitchCase: SwitchCase,
		SwitchStatement: SwitchStatement,
		SymbolDeclaration: SymbolDeclaration,
		SymbolDeclarator: SymbolDeclarator,
		TaggedTemplateExpression: TaggedTemplateExpression,
		TemplateElement: TemplateElement,
		TemplateLiteral: TemplateLiteral,
		ThisExpression: ThisExpression,
		ThrowStatement: ThrowStatement,
		TryStatement: TryStatement,
		UnaryExpression: UnaryExpression,
		UpdateExpression: UpdateExpression,
		VariableDeclaration: VariableDeclaration,
		VariableDeclarator: VariableDeclarator,
		WhileStatement: WhileStatement,
		YieldExpression: YieldExpression
	},

	curBlockBodies,
	relativePath,
	programInsertIndex,
	idWhitelist = create(null),
	idBlacklist = create(null),

	currentScope = create(null),

	neededRuntimeProps,

	state = create(null),
	importedFiles,

	// This flag can be toggled to set whether BlockStatements which are inside
	// other BlockStatements should be merged into their parent.  This help
	// clean up the compiled code, but turning it off may be helpful for
	// debugging the compiler since it will show a better picture of which code
	// was grouped together.
	squashBlocks = true,

	ES_NULL = createLiteral(null, 'null'),
	ES_UNDEFINED = esgen.createIdentifier('undefined');

[
	'Object', 'Boolean', 'Number', 'String', 'Array',
	'Function', 'reflect'
].forEach(function(key) {
	idWhitelist[key] = true;
});

[
	'global', 'undefined', 'null', '$__proto__$', 'function', 'instanceof',
	'arguments', 'eval', 'exports'
	// TODO: What other words have been removed and should be included in
	// this list?
].forEach(function(key) {
	idBlacklist[key] = true;
});

// TODO: Figure out how to add these to neededRuntimeProps only when necessary.
currentScope['sym_@iterator'] = toProtoProperty('@iterator');
currentScope['sym_@toComparable'] = toProtoProperty('@toComparable');

function compile(program, relPath, _idWhitelist) {
	// The wrapper IIFE is used to separate "globals" from top-level hoists.
	// Take the following code, for example:
	//     foo();
	//     fn foo :{ 123; }
	// This will output something roughly like:
	//     var A = $__proto__$.GetBuiltInGlobal('foo');
	//     (function() {
	//         var A = function() { 123; };
	//         A();
	//     })
	// The reason the global `A` is defined is because when the compiler first
	// sees the `foo` variable it is in the context of the function call *before
	// the compiler knows the variable has been hoisted*.  The compiler rewrites
	// this variable to pull from Proto's built-in globals (in case one is named
	// `foo`).  Later on when the compiler realizes that `foo` is a user defined
	// function to hoist, rather than correcting old mistakes, it can simply
	// hoist the function declaration to the top of the current block and use
	// its new name.  The wrapper function makes sure the block the function is
	// being hoisted within is not the same block which defines the global.
	// This is important because hoisting would put the declaration before the
	// global definition, making the declaration ignored.
	var wrapperBody = esgen.createBlockStatement([ ]),
		wrapper = esgen.createExpressionStatement(
			esgen.createCallExpression(
				esgen.createFunctionExpression(
					null, [ ], null, wrapperBody, null, false, false
				),
				[ ]
			)
		),
		processed, programBody;
	curBlockBodies = [ wrapperBody.body ];
	relativePath = path.resolve(__dirname, relPath);
	programInsertIndex = 0;
	identifiers.reset();
	blockInterceptIds.reset();
	neededRuntimeProps = create(null);
	importedFiles = create(null);
	// TODO: This is currently not very precise because old runtime names
	// don't get removed after an import... importing in general needs to be
	// reworked so that these kinds of globals don't clash.
	if (_idWhitelist !== undefined)
		_idWhitelist.forEach(function(id) {
			idWhitelist[id] = true;
		});
	processed = process(program);
	programBody = wrapperBody.body;
	wrapperBody.body = processed.body;
	processed.body = programBody.concat([ wrapper ]);
	ensureAllDeclared(processed);
	return {
		program: processed,
		neededRuntimeProps: Object.keys(neededRuntimeProps).map(function(key) {
			var info = neededRuntimeProps[key];
			info.name = key;
			return info;
		})
	};
}

function process(node, params) {

	if (node === null)
		return node;

	var processor = processors[node.type],
		preload,
		processed,
		body,
		scope,
		scopeAdditions,
		prevScope = currentScope,
		keys;

	if (node.type == 'BlockStatement' || node.type == 'Program') {
		scope = create(currentScope);
		scopeAdditions = node.__scopeAdditions__;
		if (scopeAdditions) {
			keys = Object.keys(scopeAdditions);
			for (var i = 0; i < keys.length; i++)
				scope[keys[i]] = scopeAdditions[keys[i]];
		}
	}
	else
		scope = currentScope;

	if (!processor)
		throw new Error('Unrecognized node type "' + node.type + '"');
	// Check to make sure ES nodes aren't processed
	if (node.__ES__)
		return node;

	currentScope = scope;
	processed = processor(node, scope, params || { });
	currentScope = prevScope;

	return processed;

}

function processAll(nodes, params) {
	assert(isArray(nodes));
	return nodes.map(function(u) {
		return process(u, params);
	});
}

function processBlockBody(nodes) {
	assert(isArray(nodes));
	var body = [ ];
	curBlockBodies.push(body);
	for (var i = 0, p; i < nodes.length; i++) {
		p = process(nodes[i]);
		// Some processors may not return anything (for example:
		// FunctionDeclaration)...
		if (p !== undefined) {
			// Inline nested block statements
			if (squashBlocks && p.type == 'BlockStatement')
				pushAll(body, p.body);
			else
				body.push(p);
		}
	}
	curBlockBodies.pop();
	return body;
}

// Note: This is currently set up to accept the *original* id (from Proto).
// That means if the id `null` is used in Proto, that one (and not the
// translated `null_` version) should be passed in here.
// TODO: Evaluate if this should be changed to accept the translated version
// instead, and look to see where `addDefinedVar` is used to determine if a
// change is possible or desired.  The current way it is being used seems a bit
// strange because it requires both `process` and `addDefinedVar` to always
// choose the same way to translate a variable from Proto to JS, which means
// the translation must be deterministic.  Passing in the translated id here
// would help decouple some of that logic, but it may require some difficult
// refactoring where `addDefinedVar` is currently being used.
function addDefinedVar(id, forScope, kind) {
	var scope, name;
	if (forScope)
		scope = getScopeFor(forScope);
	else
		scope = currentScope;
	name = checkIdentifierName(id.name, scope);
	scope['Identifier:defined_' + name] = kind === undefined ? 'var' : kind;
}

function getScopeFor(node) {
	if (!node.__scopeAdditions__)
		node.__scopeAdditions__ = create(null);
	return node.__scopeAdditions__;
}

function checkIdentifierName(name, scope) {
	var check = scope['Identifier:rename_' + name];
	if (check)
		name = check;
	if (idBlacklist[name.replace(/_+$/, '')])
		name += '_';
	return name;
}

function programInsert(node) {
	var body = curBlockBodies[0];
	assert(isArray(body));
	body.splice(programInsertIndex++, 0, node);
}

function blockInsert(node) {
	var body = curBlockBodies[curBlockBodies.length - 1];
	assert(isArray(body));
	if (squashBlocks && node.type == 'BlockStatement')
		pushAll(body, node.body);
	else
		body.push(node);
}

function blockHoist(node) {
	// TODO: Make parser reject function declarations inside blocks that aren't
	// the body of a function?... later if we have block scoping, it could be
	// good to hoist to the block where the function is declared (rather than
	// to the function, like JS), and preventing FDs in non-function blocks now
	// will ensure at least that is backwards compatible.
	// Of course if block scoping is something that can be achieved relatively
	// quickly, it may be best to leave the ability to have FDs in blocks so
	// that all that will be needed is to have block scoping turned on.
	var body = curBlockBodies[curBlockBodies.length - 1];
	assert(isArray(body));
	body.unshift(node);
}

function setupIdentifiers() {
	var prefix = '$__proto_',
		compilationId,
		infix = '_id_',
		suffix = '__$',
		identifiers = new Identifiers();
	return {
		reset: function reset() {
			compilationId = Identifiers.getRandomString(4);
			identifiers.reset();
		},
		next: function next() {
			var id = esgen.createIdentifier(
				prefix + compilationId + infix + identifiers.next() + suffix
			);
			return id;
		}
	}
}

function wrapProtogen(delegate) {
	var d = create(null);
	for (var key in delegate)
		(function(f) {
			d[key] = function() {
				return process(f.apply(this, arguments));
			};
			d['_' + key] = f;
		})(delegate[key]);
	return d;
}

function wrapEsgen(delegate) {
	var d = create(null);
	for (var key in delegate)
		(function(f) {
			d[key] = function() {
				var node = f.apply(this, arguments);
				node.__ES__ = true;
				return node;
			};
		})(delegate[key]);
	return d;
}

// TODO: Remove `init` param... it's not a good idea.. sequence expressions
// are better. ??
function tmpVar(init, coercive) {
	var tmp = identifiers.next();
	if (init === undefined)
		init = null;
	blockInsert(
		protogen.createVariableDeclaration(
			[ protogen._createVariableDeclarator(tmp, init, coercive) ],
			'var'
		)
	);
	return tmp;
}

function permanentVar(init) {
	var pvar = identifiers.next();
	programInsert(
		protogen.createVariableDeclaration(
			[ protogen._createVariableDeclarator(pvar, init) ],
			'var'
		)
	);
	return pvar;
}

function destructuringAssignment(node) {
	var tmp, destructured, expressions;
	assert(node.type == 'AssignmentExpression');
	assert(node.operator == '=');
	assert(isObject(node.left));
	assert(node.left.type == 'ObjectPattern'
		|| node.left.type == 'ArrayPattern');
	// TODO: Having tmp inserted could place it *before* an expression that it
	// should follow.  Example:
	//     a = foo(), { b } = bar();
	// I think, as it is now, bar will execute before foo. This needs to be
	// fixed. `tmpVar` is probably a bad idea and should probably just be
	// removed.
	tmp = tmpVar();
	destructured = destructure(node.left, tmp);
	expressions = destructured.map(function(info) {
		assert(info.coercive == null);
		return protogen.createAssignmentExpression('=', info.left, info.right);
	});
	expressions.unshift(
		protogen.createAssignmentExpression('=', tmp, node.right)
	);
	// Make sure the destructured expression evaluates to the same value as the
	// original expression.
	expressions.push(tmp);
	return esgen.createSequenceExpression(expressions);
}

function destructureVariableDeclarator(node) {
	assert(node.type == 'VariableDeclarator');
	assert(node.id.type == 'ObjectPattern'
		|| node.id.type == 'ArrayPattern');
	var tmp = identifiers.next(),
		destructured = destructure(node.id, tmp);
	return [
			protogen._createVariableDeclarator(tmp, node.init, node.coercive)
		].concat(
			destructured.map(function(info) {
				return protogen._createVariableDeclarator(
					info.left, info.right, info.coercive
				);
			})
		);
}

function destructure(left, right) {
	assert(left.type == 'ObjectPattern' || left.type == 'ArrayPattern');
	if (left.type == 'ObjectPattern')
		return destructureObject(left, right);
	else
		return destructureArray(left, right);
}

function destructureObject(node, tmp) {
	var r = [ ], tmp2;
	assert(isArray(node.properties));
	for (var i = 0, n; i < node.properties.length; i++) {
		n = node.properties[i];
		assert(n.type == 'Property');
		assert(isObject(n.key));
		assert(n.key.type == 'Identifier');
		assert(n.kind == 'init');
		assert(n.method === false);
		// TODO: The parser currently allows a CallExpression for n.value...
		// Have this be a syntax error (I think?).  Example:
		//    ({ a: b() }) = foo;
		var left = n.value,
			right = protogen._createMemberExpression(
				false, false, tmp, n.key
			);
		if (left.type == 'ArrayPattern' || left.type == 'ObjectPattern') {
			tmp2 = tmpVar(undefined, n.coercive);
			r.push({ left: tmp2, right: right });
			pushAll(r, destructure(left, tmp2));
		}
		else
			r.push({ left: left, right: right, coercive: n.coercive });
	}
	return r;
}

function destructureArray(node, tmp) {
	var r = [ ], tmp2;
	assert(isArray(node.elements));
	for (var i = 0, n; i < node.elements.length; i++) {
		n = node.elements[i];
		var left = clone(n),
			right = protogen._createMemberExpression(
				true, false, tmp,
				protogen._createLiteral('Numeric', i, String(i))
			),
			coercive = n.coercive;
		delete left.coercive;
		if (left.type == 'ArrayPattern' || left.type == 'ObjectPattern') {
			tmp2 = tmpVar(undefined, coercive)
			r.push({ left: tmp2, right: right });
			pushAll(r, destructure(left, tmp2));
		}
		else
			r.push({ left: left, right: right, coercive: coercive });
	}
	return r;
}

function memberAssignment(node) {
	assert(isObject(node.left));
	assert(isObject(node.left.object));
	assert(isObject(node.left.property));
	assert(isObject(node.right));
	return toProtoCall(
		node.own ? 'SetOwn' : 'Set', [
			process(node.left.object),
			getPropertyFromMemberExpression(node.left),
			process(node.right)
		]
	);
}

function getPropertyFromMemberExpression(node) {
	if (node.computed
	|| node.property.type == 'Literal' && node.property.raw.charAt(0) == '@')
		return process(node.property);
	else {
		assert(node.property.type == 'Identifier');
		return createStringLiteral(node.property.name);
	}
}

function unaryBindOperator(node) {
	if (node.argument.type == 'CallExpression')
		return unaryBindOperatorCall(node.argument);
	if (node.argument.type != 'MemberExpression')
		throw new TypeError('MemberExpression expected');
	// TODO: This will currently call any getters twice.. fix that.
	// example: ::foo.bar.baz; will call foo.bar twice.
	var fn = process(node.argument),
		obj = process(node.argument.object);
	return toProtoCall('Bind', [ fn, obj ]);
}

function unaryBindOperatorCall(node) {
	// TODO: This will currently call any getters twice.. fix that.
	// example: ::foo.bar.baz(); will call foo.bar twice.
	if (node.callee.type != 'MemberExpression')
		throw new TypeError('MemberExpression expected');
	var fn = process(node.callee),
		obj = process(node.callee.object);
	return toProtoCall('Call', [ fn, obj ]);
}

function binaryBindOperator(node) {
	// Note: This does not handle bind + call operations such as `foo::bar()`.
	// Those are streamlined in `CallExpression` for improved performance.
	return toProtoCall('Bind', [ process(node.right), process(node.left) ]);
}

function binaryLikeOperator(node) {
	return toProtoCall('IsLike', [ process(node.left), process(node.right) ]);
}

function unaryLikeOperator(node) {
	return toProtoCall('Like', [ process(node.argument) ]);
}

function mixinOperator(node) {
	assert(node.left.type != 'ObjectPattern'
		&& node.left.type != 'ArrayPattern');
	return toProtoCall('Mixin', [ process(node.left), process(node.right) ]);
}

function objectToSyntaxTree(obj) {
	var keys = Object.keys(obj),
		props = [ ];
	for (var i = 0, k; i < keys.length; i++) {
		k = keys[i];
		props.push(
			esgen.createProperty(
				'init', esgen.createIdentifier(k), obj[k], false, false, false
			)
		);
	}
	return esgen.createObjectExpression(props);
}

function objectsToSyntaxTrees(objs) {
	var trees = [ ];
	for (var i = 0; i < objs.length; i++)
		trees.push(objectToSyntaxTree(objs[i]));
	return esgen.createArrayExpression(trees);
}

function createObjectExpression(node, own) {
// TODO: Make `const` keyword in object expression work (it currently parses)
// but doesn't make it non-writable/non-configurable (should it do both?).
	var props = [ ],
		statics = [ ],
		computed = [ ],
		prop, kind, key;

	assert(isArray(node.properties));

	for (var i = 0; i < node.properties.length; i++) {
		prop = node.properties[i];
		if (prop.key.type == 'Literal' && prop.key.kind == 'Symbol'
		|| prop.kind != 'init'
		|| prop.conditional) {
			if (prop.coercive != null)
				throw new SyntaxError('Unexpected coercive');
			kind = prop.kind;
			if (kind == 'init')
				kind = 'value';
			if (prop.key.type == 'Literal' && prop.key.kind == 'Symbol')
				key = process(prop.key);
			else if (prop.key.type == 'Identifier')
				key = createStringLiteral(prop.key.name);
			else
				throw new Error(
					'Unexpected property type: "' + prop.key.type + '"'
				);
			computed.push({
				kind: createStringLiteral(kind),
				key: key,
				value: process(prop.value),
				static: createBooleanLiteral(prop.static),
				conditional: createBooleanLiteral(prop.conditional)
			});
		}
		else if (prop.static) {
			prop = clone(prop);
			prop.static = false;
			statics.push(process(prop));
		}
		else
			props.push(process(prop));
	}

	return toProtoCall('CreateObject', [
		own ? ES_NULL
			: ES_UNDEFINED,
		esgen.createObjectExpression(props),
		statics.length > 0
			? esgen.createObjectExpression(statics)
			: ES_UNDEFINED,
		computed.length > 0
			? objectsToSyntaxTrees(computed)
			: ES_UNDEFINED
	]);

}

function createArrayExpression(node, own) {
	assert(isArray(node.elements));
	return toProtoCall('CreateArray', [
		own ? ES_NULL
			: ES_UNDEFINED,
		unspread(node.elements)
	]);
}

function createLiteral(value, raw) {
	return {
		type: 'Literal',
		value: value,
		raw: raw,
		__ES__: true
	};
}

function createBooleanLiteral(value) {
	return createLiteral(value, String(value));
}

function createNumericLiteral(value) {
	return createLiteral(value, String(value));
}

function createStringLiteral(value) {
	return createLiteral(value, '"' + value + '"')
}

function toProtoCall(fn, args) {
	var prop = toProtoProperty(fn),
		info;
	if (neededRuntimeProps) {
		info = neededRuntimeProps[fn];
		if (!info.args)
			info.args = [ ];
		// Mark arguments which aren't undefined because knowledge of which
		// arguments aren't passed in can be used to remove unused code paths.
		for (var i = 0; i < args.length; i++)
			if (args[i].type != 'Identifier' || args[i].name != 'undefined')
				info.args[i] = true;
	}
	return esgen.createCallExpression(prop, args);
}

function toProtoProperty(name) {
	if (/^\@/.test(name))
		name = '$$' + name.slice(1);
	var computed = /[^\w\_\$]/.test(name);
	if (neededRuntimeProps && !neededRuntimeProps[name])
		neededRuntimeProps[name] = create(null);
	return esgen.createMemberExpression(
		computed ? '[' : '.',
		esgen.createIdentifier('$__proto__$'),
		(computed ? createStringLiteral : esgen.createIdentifier)(name)
	);
}

function unspread(nodes) {
	// The nodes may or may not have a spread element.  We push to both `args`
	// and `unspreadArgs` until we can determine whether there is a spread element.
	// If no spread element is found, `args` is used as a simple array of the
	// arguments. Otherwise, `unspreadArgs` passes through `ArrayMerge`.
	var args = [ ], unspreadArgs  = [ ], hasSpread = false;
	for (var i = 0, node, p; i < nodes.length; i++) {
		node = nodes[i];
		if (node != null && node.type == 'SpreadElement') {
			hasSpread = true;
			unspreadArgs.push(
				toProtoCall('CheckSpread', [ process(node.argument) ])
			);
		}
		else {
			p = process(node);
			if (!hasSpread)
				args.push(p);
			// For efficiency, we use ES arrays here rather than Proto arrays.
			// ArrayMerge has to be smart enough to work for both kinds.
			unspreadArgs.push(esgen.createArrayExpression([ p ]));
		}
	}
	return hasSpread ? toProtoCall('arrayMerge', unspreadArgs)
		: esgen.createArrayExpression(args);
}

function wrapBlockScope(f, resultId) {
	function ScopeWrapper(node, scope) {
		var type = node.type,
			id, value, label, trans;
		if (scope.blockScope) {
			if (node.label)
				label = process(node.label);
			if (label && scope.blockScope.labels[label.name])
				return f.apply(this, arguments);
			if (!label && scope.blockScope.allowSimple[type])
				return f.apply(this, arguments);
			id = blockInterceptIds.next();
			// TODO: work on this
			trans = f(node, scope.blockScope.outerScope);
			//trans = clone(node);
			if (trans.type == 'ReturnStatement') {
				value = trans.argument;
				trans.argument = esgen.createMemberExpression('.',
					clone(resultId),
					esgen.createIdentifier('value')
				);
			}
			scope.blockScope.interrupts.push({
				type: type,
				id: id,
				node: trans
			});
			return esgen.createReturnStatement(
				objectToSyntaxTree({
					type: createStringLiteral(type),
					id: createStringLiteral(id),
					value: value === undefined
						? ES_UNDEFINED
						: value
				})
			);
		}
		return f.apply(this, arguments);
	}
	ScopeWrapper.unwrap = function() {
		return f;
	};
	return ScopeWrapper;
}

function wrapBlockScopeYield(f, resultId) {
	function ScopeWrapper(node, scope) {
		var type = node.type,
			id, value, trans;
		if (scope.blockScope) {
			id = blockInterceptIds.next();
			// TODO: work on this
			trans = f(node, scope.blockScope.outerScope);
			//trans = clone(node);
			value = trans.argument;
			trans.argument = esgen.createMemberExpression('.',
				clone(resultId),
				esgen.createIdentifier('value')
			);
			trans = esgen.createMemberExpression('.',
				toProtoCall('GeneratorNext', [ trans ]),
				esgen.createIdentifier('value')
			);
			trans = trans;
			scope.blockScope.interrupts.push({
				type: type,
				id: id,
				node: trans,
				update: true
			});
			return esgen.createYieldExpression(
				objectToSyntaxTree({
					type: createStringLiteral(type),
					id: createStringLiteral(id),
					value: value
				})
			);
		}
		return f.apply(this, arguments);
	}
	ScopeWrapper.unwrap = function() {
		return f;
	};
	return ScopeWrapper;
}

function wrapBlockScopeControl(f, types) {
	if (f.wrapCount) {
		f.wrapCount++;
		return f;
	}
	function ScopeWrapper(node, scope) {
		var trans = f.apply(this, arguments);
		if (scope.blockScope)
			for (var i = 0; i < types.length; i++)
				scope.blockScope.allowSimple[types[i]] = true;

		return trans;
	}
	ScopeWrapper.unwrap = function() {
		if (--ScopeWrapper.wrapCount > 0)
			return ScopeWrapper;
		return f;
	};
	ScopeWrapper.wrapCount = 1;
	return ScopeWrapper;
}

function wrapBlockScopeLabel(f) {
	if (f.wrapCount) {
		f.wrapCount++;
		return f;
	}
	function ScopeWrapper(node, scope) {
		var label;
		if (scope.blockScope) {
			label = process(node.label);
			scope.blockScope.labels[label.name] = true;
		}
		var trans = f.apply(this, arguments);
		assert(trans.type == 'LabeledStatement');
		return trans;
	}
	ScopeWrapper.unwrap = function() {
		if (--ScopeWrapper.wrapCount > 0)
			return ScopeWrapper;
		return f;
	};
	ScopeWrapper.wrapCount = 1;
	return ScopeWrapper;
}

function wrapInterruptBlockScope(f) {
	if (f.wrapCount) {
		f.wrapCount++;
		return f;
	}
	function ScopeWrapper(node, scope) {
		node.body.__scopeAdditions__ = { blockScope: null };
		return f.apply(this, arguments);
	}
	ScopeWrapper.unwrap = function() {
		if (--ScopeWrapper.wrapCount > 0)
			return ScopeWrapper;
		return f;
	};
	ScopeWrapper.wrapCount = 1;
	return ScopeWrapper;
}

// This is a shortcut for ranges in for..of, for performance.
// TODO: Check to make sure coercives work with for..of
// TODO: What if the @iterator method is overridden for the Range prototype?
function forOfRange(node, scope) {

	var left = node.left,
		right = node.right,
		body = node.body,
		step,
		i = tmpVar(),
		u = tmpVar(),
		from = tmpVar(),
		to = tmpVar(),
		updateAmount = tmpVar(),
		init, test, update, inclusive;

	assert(left.type == 'Identifier');

	if (right.operator == 'by') {
		step = right.right;
		right = right.left;
	}
	else
		step = protogen._createConditionalExpression(
			protogen.createBinaryExpression('<', from, to),
			protogen._createLiteral('Numeric', 1, '1'),
			protogen._createUnaryExpression(
				'-', protogen._createLiteral('Numeric', 1, '1')
			)
		);

	assert(right.type == 'BinaryExpression');
	assert(right.operator == '..' || right.operator == '...');
	inclusive = right.operator == '...';

	scope['Identifier:rename_' + left.name] = u.name;
	body = process(body);
	delete scope['Identifier:rename_' + left.name];

	// TODO: Put a check in to make sure neither this nor the end are infinity
	init = esgen.createSequenceExpression([
		protogen.createAssignmentExpression(
			'=', i, createNumericLiteral(0)
		),
		protogen.createAssignmentExpression(
			'=', from, toProtoCall('ToNumber', [ process(right.left) ])
		),
		protogen.createAssignmentExpression(
			'=', u, from
		),
		protogen.createAssignmentExpression(
			'=', to, toProtoCall('ToNumber', [ process(right.right) ])
		),
		protogen.createAssignmentExpression(
			'=', updateAmount, step
		)
	]);
	test = protogen.createConditionalExpression(
		protogen.createBinaryExpression('<', from, to),
		protogen.createBinaryExpression(inclusive ? '<=' : '<', u, to),
		protogen.createBinaryExpression(inclusive ? '>=' : '>', u, to)
	);
	// TODO: This might not behave the way it should in the following case:
	// var a = {
	//   get b() {
	//     console.log(b);
	//     return { c: 0 };
	//   }
	// };
	// for (a.b.c of 1..10) ;
	// because it will access a.b twice for each update
	update = esgen.createSequenceExpression([
		esgen.createUnaryExpression('++', i),
		protogen.createAssignmentExpression(
			'=', u,
			// from, i, and updateAmount are guarnanteed to be numbers at this
			// point, so we don't have to use Proto's explicit ToNumber
			// `+` operator. This will be more performant.
			esgen.createBinaryExpression('+',
				from,
				esgen.createBinaryExpression('*', updateAmount, i)
			)
		)
	]);

	return esgen.createForStatement(init, test, update, body);

}

function breakupExpression(node) {
	// TODO: Are there any other expression types that should be broken down
	// like this?
	switch (node.type) {
		case 'BinaryExpression':
		case 'LogicalExpression':
			return breakupBinaryOrLogicalExpression(node);
		case 'SequenceExpression':
			return breakupSequenceExpression(node);
		case 'ConditionalExpression':
			return breakupConditionalExpression(node);
		default:
			throw new Error('Unable to break up node type "' + node.type + '"');
	}
}

// TODO: Make conditional expressions which contain block expressions evaluate
// one piece at a time similarly to how it works for binary expressions.
function breakupBinaryOrLogicalExpression(node) {
	var tmpL = tmpVar(),
		tmpR = tmpVar(),
		left = node.left,
		right = node.right,
		operator = node.operator,
		leftAssign = protogen._createAssignmentExpression('=', tmpL, left),
		rightAssign = protogen._createAssignmentExpression('=', tmpR, right);
	// TODO: Are there any other short-circuiting operators to worry about?
	switch(operator) {
		case '&&':
			rightAssign = protogen._createConditionalExpression(
				tmpL, rightAssign, ES_UNDEFINED
			);
			break;
		case '||':
			rightAssign = protogen._createConditionalExpression(
				tmpL, ES_UNDEFINED, rightAssign
			);
			break;
	}
	blockInsert(protogen.createBlockStatement([
		toStatement(leftAssign),
		toStatement(rightAssign)
	]));
	return protogen.createBinaryExpression(operator, tmpL, tmpR);
}

function breakupConditionalExpression(node) {
	var tmpT = tmpVar(),
		consequent = node.consequent,
		alternate = node.alternate,
		tAssign = protogen._createAssignmentExpression('=', tmpT, node.test);
	return protogen.createStatementExpression(
		protogen._createBlockStatement([
			toStatement(tAssign),
			protogen._createIfStatement(
				tmpT, toStatement(consequent), toStatement(alternate)
			)
		])
	);
}

function breakupSequenceExpression(node) {
	var tmp = tmpVar(),
		statements = node.expressions.map(function(u) {
				return protogen._createExpressionStatement(u);
			}),
		finalStatement = statements[statements.length - 1];
	finalStatement.expression = protogen._createAssignmentExpression('=',
		tmp, finalStatement.expression
	);
	blockInsert(protogen.createBlockStatement(statements));
	return tmp;
}

function assignCompletion(identifier, node) {
	// TODO: I think it would make more sense to process the proto nodes in
	// rather than ES nodes.
	var tmp, tmp2;
	// TODO: Are there other types that should be accounted for?
	// TODO: switch statement
	switch (node.type) {
		case 'ExpressionStatement':
			return esgen.createExpressionStatement(
				esgen.createAssignmentExpression('=',
					identifier, node.expression
				)
			);
		case 'LabeledStatement':
			return esgen.createLabeledStatement(
				node.label,
				assignCompletion(identifier, node.body)
			);
		case 'BlockStatement':
			return assignCompletionInBlock(identifier, node);
		case 'ForStatement':
		case 'WhileStatement':
		case 'DoWhileStatement':
			tmp = tmpVar();
			node.body = assignCompletion(tmp, node.body);
			return protogen.createBlockStatement([
				node,
				esgen.createExpressionStatement(
					esgen.createAssignmentExpression('=',
						identifier, tmp
					)
				)
			]);
		case 'TryStatement':
			tmp = tmpVar();
			return protogen.createBlockStatement([
				esgen.createTryStatement(
					assignCompletion(tmp, node.block),
					node.guardedHandlers,
					node.handlers.map(function(handler) {
						return esgen.createCatchClause(
							handler.param,
							assignCompletion(tmp, handler.body)
						);
					}),
					node.finalizer
				),
				esgen.createExpressionStatement(
					esgen.createAssignmentExpression('=',
						identifier, tmp
					)
				)
			]);
		case 'IfStatement':
			tmp = tmpVar();
			// `tmp2` is used in case `node.test` is (or contains) a block
			// expression
			tmp2 = tmpVar();
			return protogen.createBlockStatement([
				esgen.createExpressionStatement(
					esgen.createAssignmentExpression('=', tmp2, node.test)
				),
				esgen.createIfStatement(
					tmp2,
					protogen.createBlockStatement([
						protogen._createExpressionStatement(
							protogen._createAssignmentExpression('=',
								tmp,
								protogen._createStatementExpression(
									node.consequent
								)
							)
						)
					]),
					node.alternate === null
						? null
						: protogen.createBlockStatement([
							protogen._createExpressionStatement(
								protogen._createAssignmentExpression('=',
									tmp,
									protogen._createStatementExpression(
										node.alternate
									)
								)
							)
					])
				),
				esgen.createExpressionStatement(
					esgen.createAssignmentExpression('=',
						identifier, tmp
					)
				)
			]);
		case 'SwitchStatement':
			return assignCompletion(identifier, switchToIf(node));
		case 'BreakStatement':
			return protogen.createBlockStatement([
				esgen.createExpressionStatement(
					esgen.createAssignmentExpression('=',
						identifier, ES_UNDEFINED
					)
				),
				node
			]);
		default:
			throw new Error('Not implemented: ' + node.type + ' in expression');			
	// 		return protogen.createBlockStatement([
	// 			esgen.createExpressionStatement(
	// 				esgen.createAssignmentExpression('=',
	// 					identifier, ES_UNDEFINED
	// 				)
	// 			),
	// 			node
	// 		]);
	}
}

function assignCompletionInBlock(identifier, node) {
	// TODO: What should happen at a `break` in the block?
	assert(node.type === 'BlockStatement');
	var body = node.body,
		statementIndex = findLastNonEmptyStatement(body),
		statement = body[statementIndex],
		tmp = tmpVar();
	body[statementIndex] = assignCompletion(tmp, statement);
	return protogen.createBlockStatement([
		node,
		esgen.createExpressionStatement(
			esgen.createAssignmentExpression('=',
				identifier, tmp
			)
		)
	]);
}

function findLastNonEmptyStatement(body) {
	for (var i = body.length - 1; i >= 0; i--)
		if (body[i].type != 'EmptyStatement')
			return i;
	body.push(
		esgen.createExpressionStatement(ES_UNDEFINED)
	);
	return body.length - 1;
}

function switchToIf(node) {
	var label = identifiers.next(),
		tmp = tmpVar(),
		block = [
			// TODO: Does this need to have `assignCompletion` or something like
			// it called on it in case `node.descriminant` contains a statement
			// expression?
			esgen.createExpressionStatement(
				esgen.createAssignmentExpression('=', tmp, node.discriminant)
			)
		];
	node.cases.forEach(function(switchCase) {
		if (switchCase.test === null)
			protogen.createBlockStatement(switchCase.consequent);
		else
			block.push(
				esgen.createIfStatement(
					esgen.createBinaryExpression('===', tmp, switchCase.test),
					protogen.createBlockStatement(switchCase.consequent),
					null
				)
			);
	});
	return esgen.createLabeledStatement(
		label, protogen.createBlockStatement(block)
	);
}

function toStatement(node) {
	return protogen._createExpressionStatement(node);
}

function assert(value, msg) {
	if (!value)
		throw new Error('Assertion failure'
			+ (msg === undefined ? '' : ': ' + msg)
		);
}

function isObject(value) {
	return Object(value) === value;
}

function reduceBlock(node) {
	if (!squashBlocks)
		return node;
	while (node != null
	&& node.type == 'BlockStatement'
	&& node.body.length == 1)
		node = node.body[0];
	if (node != null && node.type == 'BlockStatement')
		node.body = inlineNestedBlocks(node.body);
	return node;
}

function inlineNestedBlocks(nodes) {
	assert(isArray(nodes));
	var body = [ ];
	for (var i = 0, p; i < nodes.length; i++) {
		p = nodes[i];
		// Inline nested block statements
		if (squashBlocks && p.type == 'BlockStatement')
			pushAll(body, p.body);
		else
			body.push(p);
	}
	return body;
}

function ArrayExpression(node) {
	return createArrayExpression(node, false);
}

function ArrayPattern(node) {
	// This should be taken care of by AssignmentExpression
	throw new Error('Unexpected "ArrayPattern"');
}

function AssignmentExpression(node, scope) {
	var right, coercive, left;
	assert(typeof node.operator == 'string');
	assert(isObject(node.left));
	assert(isObject(node.right));
	if (node.operator == '=')
		assert(node.left.type == 'Identifier'
			|| node.left.type == 'MemberExpression'
			|| node.left.type == 'ObjectPattern'
			|| node.left.type == 'ArrayPattern');
	if (node.left.type == 'ArrayPattern' || node.left.type == 'ObjectPattern')
		return destructuringAssignment(node);
	switch (node.operator) {
		case ':=':
			return mixinOperator(node);
		case '&=':
		case '+=':
		case '-=':
		case '*=':
		case '^=':
			return esgen.createAssignmentExpression('=',
				process(node.left),
				protogen.createBinaryExpression(
					node.operator.charAt(0), node.left, node.right
				)
			);
	}
	if (node.left.type == 'MemberExpression')
		return memberAssignment(node);
	assert(node.left.type == 'Identifier');
	left = process(node.left);
	if (scope['Identifier:defined_' + left.name] == 'const')
		throw new Error('Cannot assign to constant ' + node.left.name);
	right = node.right;
	coercive = scope['coercive_' + left.name];
	if (coercive)
		right = protogen._createCallExpression(coercive, [ right ]);
	return esgen.createAssignmentExpression(
		node.operator, left, process(right)
	);
}

function BinaryExpression(node) {
	var operator, info, tmp;
	// If this expression contains a statement expression, we need to break up its
	// parts and evaluate them one at a time.
	if (containsNodeType(node, 'StatementExpression'))
		return breakupExpression(node);
	switch (node.operator) {
		case '::':
			return binaryBindOperator(node);
		case 'like':
			return binaryLikeOperator(node);
		case '&': if (!operator) operator = '+';
			return esgen.createBinaryExpression(operator,
				toProtoCall('ToString', [ process(node.left) ]),
				toProtoCall('ToString', [ process(node.right) ])
			);
		case 'mod': if (!operator) operator = '%';
		case '+':
			if (!operator) operator = node.operator;
			return esgen.createBinaryExpression(operator,
				toProtoCall('ToNumber', [ process(node.left) ]),
				toProtoCall('ToNumber', [ process(node.right) ])
			);
		case '^':
			return toProtoCall('Pow', [
				process(node.left), process(node.right)
			]);
		case 'in':
			// Shortcut for the `key in #obj` form, for performance
			if (node.right.type == 'UnaryExpression'
			&& node.right.operator == '#')
				return toProtoCall('HasOwn', [
					process(node.right.argument),
					process(node.left)
				]);
			return toProtoCall('Has', [
				process(node.right), process(node.left)
			]);
		case 'and':  if (!operator) operator = '&';
		case 'or':   if (!operator) operator = '|';
		case 'xor':  if (!operator) operator = '^';
		case 'rsh':  if (!operator) operator = '>>';
		case 'ursh': if (!operator) operator = '>>>';
		case 'lsh':  if (!operator) operator = '<<';
			return esgen.createBinaryExpression(operator,
				toProtoCall('ToUint32', [ process(node.left) ]),
				toProtoCall('ToUint32', [ process(node.right) ])
			);
		case 'is':
			return toProtoCall('Is', [
				process(node.left), process(node.right)
			]);
		case '==': if (!operator) operator = '===';
		case '!=': if (!operator) operator = '!==';
			return esgen.createBinaryExpression(
				operator, process(node.left), process(node.right)
			);
		case '~=': if (!operator) operator = '==';
		case '!~=': if (!operator) operator = '!=';
		case '<': case '>': case '>=': case '<=':
			if (!operator)
				operator = node.operator;
			return esgen.createBinaryExpression(operator,
				toProtoCall('ToComparable', [ process(node.left) ]),
				toProtoCall('ToComparable', [ process(node.right) ])
			);
		case '|':
			// TODO: Get proprima to recognize this syntax error.
			// ex: var a = b | 0;
			// Note: I think it does now.. should just do a little checking.
			// Then can remove the note and maybe change this to an assert.
			throw new SyntaxError('Unexpected token |');
		case '..':
		case '...':
			return toProtoCall('CreateRange', [
				ES_UNDEFINED,
				createBooleanLiteral(node.operator == '...'),
				process(node.left), process(node.right)
			]);
		case 'by':
			// TODO: make shortcut for `1 .. 10 by 2` case
			// (using both .. and by)
			return toProtoCall('ModifyRangeStep', [
				process(node.left), process(node.right)
			]);
		case '??': // TODO: Document
			tmp = tmpVar();
			return protogen.createSequenceExpression([
				protogen._createAssignmentExpression('=',
					tmp, node.left
				),
				protogen._createConditionalExpression(
					esgen.createBinaryExpression('==',
						tmp, ES_NULL
					),
					node.right, tmp
				)
			]);
		case '!like': if (!operator) operator = 'like';
		case '!is': if (!operator) operator = 'is';
		case '!in': if (!operator) operator = 'in';
			return protogen.createUnaryExpression('!',
				protogen._createBinaryExpression(operator,
					process(node.left), process(node.right)
				)
			);
		default:
			return esgen.createBinaryExpression(
				node.operator, process(node.left), process(node.right)
			);
	}
}

function BlockStatement(node, scope) {

	var body = node.body,
		scopeNeeded = false;

	if (node.__scopeNeeded__ !== false)
		for (var i = 0; i < body.length; i++)
			if (body[i].type == 'VariableDeclaration'
			|| body[i].type == 'FunctionDeclaration') {
				scopeNeeded = true;
				break;
			}

	if (!scopeNeeded)
		return esgen.createBlockStatement(processBlockBody(node.body));

	var oldBreakStatement = BreakStatement,
		oldContinueStatement = ContinueStatement,
		oldReturnStatement = ReturnStatement,
		tmp = tmpVar(),
		block, cases, generator, tmpGen, createBlockType, interrupt, n;

	scope.blockScope = {
		outerScope: Object.getPrototypeOf(scope),
		interrupts: [ ],
		labels: create(null),
		allowSimple: {
			break: false,
			continue: false
		}
	};

	// TODO: Solve the following case:
	// :{
	//     var x;
	//     |foo| :{
	//         break foo;
	//     }
	// }
	// It should stay `break foo` instead of turning into a return.
	processors.BreakStatement = wrapBlockScope(
		processors.BreakStatement, tmp
	);
	processors.ContinueStatement = wrapBlockScope(
		processors.ContinueStatement, tmp
	);
	processors.ReturnStatement = wrapBlockScope(
		processors.ReturnStatement, tmp
	);
	processors.YieldExpression = wrapBlockScopeYield(
		processors.YieldExpression, tmp
	);
	// TODO: Add if for is undeprecated or remove if for is removed
	// ForStatement = wrapBlockScopeControl(ForStatement, [ ]);
	processors.ForOfStatement = wrapBlockScopeControl(
		processors.ForOfStatement, [ 'continue', 'break' ]
	);
	processors.WhileStatement = wrapBlockScopeControl(
		processors.WhileStatement, [ 'continue', 'break' ]
	);
	processors.DoWhileStatement = wrapBlockScopeControl(
		processors.DoWhileStatement, [ 'continue', 'break' ]
	);
	// TODO: remove `break` from switch?
	processors.SwitchCase = wrapBlockScopeControl(
		processors.SwitchCase, [ 'continue', 'break' ]
	);
	processors.LabeledStatement = wrapBlockScopeLabel(
		processors.LabeledStatement
	);
	processors.FunctionExpression = wrapInterruptBlockScope(
		processors.FunctionExpression
	);

	body = processBlockBody(node.body);
	generator = containsNodeType(body, 'YieldExpression');

	processors.BreakStatement = processors.BreakStatement.unwrap();
	processors.ContinueStatement = processors.ContinueStatement.unwrap();
	processors.ReturnStatement = processors.ReturnStatement.unwrap();
	processors.YieldExpression = processors.YieldExpression.unwrap();
	processors.LabeledStatement = processors.LabeledStatement.unwrap();
	processors.FunctionExpression = processors.FunctionExpression.unwrap();

	body = esgen.createBlockStatement(body);
	cases = [ ];

	block = [
		protogen.createExpressionStatement(
			protogen._createCallExpression(
				protogen._createFunctionExpression(
					null, [ ], [ ], [ ], body, null, generator, false, true, false, null
				),
				[ ]
			)
		)
	];

	if (scope.blockScope.interrupts.length > 0) {
		if (generator) {
			tmpGen = tmpVar();
			block[0].expression = esgen.createAssignmentExpression(
				'=', tmpGen, block[0].expression
			);
			block.push(esgen.createExpressionStatement(
				esgen.createAssignmentExpression(
					'=', tmp,
					esgen.createMemberExpression(
						'.',
						toProtoCall('GeneratorNext', [ tmpGen ]),
						esgen.createIdentifier('value')
					)
				)
			));
			createBlockType = esgen.createWhileStatement;
		}
		else {
			block[0].expression = esgen.createAssignmentExpression(
				'=', tmp, block[0].expression
			);
			createBlockType = esgen.createIfStatement;
		}
		block.push(createBlockType(
			esgen.createBinaryExpression(
				'!==', tmp, ES_UNDEFINED
			),
			esgen.createSwitchStatement(
				esgen.createMemberExpression(
					'.', tmp, esgen.createIdentifier('id')
				),
				cases
			)
		));
		for (var i = 0; i < scope.blockScope.interrupts.length; i++) {
			interrupt = scope.blockScope.interrupts[i];
			n = interrupt.node;
			if (interrupt.update)
				n = esgen.createExpressionStatement(
					esgen.createAssignmentExpression('=', tmp, n)
				);
			cases.push(
				esgen.createSwitchCase(
					createStringLiteral(interrupt.id),
					[ n ]
				)
			);
		}
	}
	
	return esgen.createBlockStatement(block);

}

function BreakStatement(node) {
	return esgen.createBreakStatement(process(node.label));
}

function CallExpression(node) {

	assert(isObject(node.callee));
	assert(isArray(node.arguments));

	var obj, prop, fn, own;

	if (node.callee.type == 'MemberExpression') {
		obj = process(node.callee.object);
		prop = getPropertyFromMemberExpression(node.callee);
		own = node.callee.own;
		// Call(Own)Method serves one purpose:
		// 1. It provides a convenient way to make a call without having to
		//    utilize temporary variables for calls such as `foo.bar.baz()`
		//    which would otherwise become `Call(foo.bar.baz, foo.bar)`
		//    computing `foo.bar` twice.
		// It was originally thought that it would also pave the way to enable
		// proxies invoke traps to still work, but it doesn't seem so at this
		// point.
		return toProtoCall(own ? 'CallOwnMethod' : 'CallMethod',
			[ obj, prop, unspread(node.arguments) ]
		);
	}

	// For peformance considerations, we can combine these two operations.
	if (node.callee.type == 'BinaryExpression'
	&& node.callee.operator == '::') {
		fn = process(node.callee.right);
		obj = process(node.callee.left);
	}
	else {
		obj = ES_UNDEFINED;
		fn = process(node.callee);
	}

	return toProtoCall('Call',
		[ fn, obj, unspread(node.arguments) ]
	);

}

function CascadeContext(node, scope) {
	if (!('cascadeContext' in scope))
		throw new Error('Missing cascade context');
	return scope.cascadeContext;
}

function CascadeStatement(node, scope) {

	var tmp = tmpVar();
	scope.cascadeContext = tmp;

	return protogen.createBlockStatement(
		[
			esgen.createExpressionStatement(
				esgen.createAssignmentExpression('=',
					tmp,
					process(node.object)
				)
			)
		].concat(node.body)
	);

}

// function CascadeExpression(node, scope) {

// 	var tmp = tmpVar();
// 	scope.cascadeContext = tmp;

// 	return protogen.createSequenceExpression([
// 		esgen.createAssignmentExpression('=',
// 			tmp,
// 			process(node.object)
// 		),
// 		protogen._createBlockExpression(node.body)
// 	]);

// }

function CatchClause(node) {
	var param, body;
	param = process(node.param, { id_skipGlobal: true });
	addDefinedVar(node.param, node.body);
	body = process(node.body);
	body.body.unshift(
		esgen.createExpressionStatement(
			esgen.createAssignmentExpression('=',
				clone(param),
				toProtoCall('proxyJs', [ clone(param) ])
			)
		)
	);
	return esgen.createCatchClause(
		param, body
	);
}

function Coercive(node) {
	assert(node.id.type == 'Identifier');
	return toProtoCall('AsCoercive', [
		process(node.id),
		createBooleanLiteral(!!node.nilable)
	]);
}

function ComprehensionBlock(node) {
	throw new Error('Unimplemented "ComprehensionBlock"');
}

function ComprehensionExpression(node) {
	throw new Error('Unimplemented "ComprehensionExpression"');
}

function ConditionalExpression(node) {
	// If this expression contains a block expression, we need to break up its
	// parts and evaluate them one at a time.
	if (containsNodeType(node, 'StatementExpression'))
		return breakupExpression(node);
	return esgen.createConditionalExpression(
		process(node.test), process(node.consequent), process(node.alternate)
	);
}

function ContinueStatement(node, scope) {
	var replacement;
	if (node.label == null || scope.continue != null)
		return clone(scope.continue);
	if (replacement = scope['continue_' + node.label.name])
		return clone(replacement);
	return esgen.createContinueStatement(process(node.label));
}

function DebuggerStatement(node) {
	return esgen.createDebuggerStatement();
}

function DoWhileStatement(node, scope) {
	scope.continue = null;
	return esgen.createDoWhileStatement(
		process(node.body),
		process(node.test)
	);
}

function EmptyStatement(node) {
	return esgen.createEmptyStatement();
}

function ExportDeclaration(node) {
	if (node.declaration != null)
		throw new SyntaxError('Declaration not supported in export statement');
	assert(isArray(node.specifiers));
	if (node.source != null)
		return protogen.createBlockStatement([
			protogen._createImportDeclaration(
				node.specifiers.map(function(n) {
					return protogen._createImportSpecifier(n.id, n.name);
				}),
				'named', node.source
			),
			protogen._createExportDeclaration(
				null, node.specifiers, null
			)
		]);
	return esgen.createBlockStatement(
		processAll(node.specifiers)
	);
}

function ExportBatchSpecifier(node) {
	throw new Error('Unimplemented "ExportBatchSpecifier"');
}

function ExportSpecifier(node) {
	var id = node.id,
		name = node.name;
	assert(id && id.type == 'Identifier');
	assert(name == null || name.type == 'Identifier');
	return esgen.createExpressionStatement(
		toProtoCall('SetOwn', [
			esgen.createIdentifier('exports'),
			createStringLiteral(name == null ? id.name : name.name),
			process(id)
		])
	);
}

function ExpressionStatement(node) {
	assert('expression' in node);
	return esgen.createExpressionStatement(process(node.expression));
}

function ForOfStatement(node, scope) {

	scope.continue = null;

	if (node.right.type == 'BinaryExpression'
	&& (node.right.operator == '..'
		|| node.right.operator == '...'
		|| node.right.operator == 'by'
		&& node.right.left.type == 'BinaryExpression'
		&& (node.right.left.operator == '..'
			|| node.right.left.operator == '...')))
		return forOfRange(node, scope);

	var left = node.left,
		right = toProtoCall('GetIterator', [ process(node.right) ]),
		body = node.body,

		// TODO: coercive for u from node.left
		next = tmpVar(),
		u = tmpVar(),
		ofObj = tmpVar(),

		init, test;

	assert(left.type == 'Identifier');

	scope['Identifier:rename_' + left.name] = u.name;
	body = process(body);
	delete scope['Identifier:rename_' + left.name];

	init = protogen._createAssignmentExpression('=', ofObj, right);

	// TODO: Use GeneratorNext instead of the `next` method (?)
	test = protogen.createSequenceExpression([
		protogen._createAssignmentExpression('=',
			next,
			protogen._createCallExpression(
				protogen._createMemberExpression(
					false, false, ofObj, protogen._createIdentifier('next')
				),
				[ ]
			)
		),
		protogen._createAssignmentExpression('=',
			u,
			protogen._createMemberExpression(
				false, false, next, protogen._createIdentifier('value')
			)
		),
		protogen._createUnaryExpression('!',
			protogen._createMemberExpression(
				false, false, next, protogen._createIdentifier('done')
			)
		)
	]);

	return esgen.createForStatement(init, test, null, body);

}

function ForStatement(node, scope) {
	// TODO: proprima still has a "ForStatement" node type and associated
	// functions like `createForStatement` and `parseForStatement` because
	// they seem to be used in the parsing of array comprehensions.  Once
	// array comprehensions are implemented and nailed down, all ForStatement
	// stuff from proprima and the compiler should be removed.
	throw new SyntaxError('Unsupported for statement');
}

function FunctionDeclaration(node, scope) {
	var fe_node = protogen._createFunctionExpression(
		// No id for hoisted FDs because the id is used in the
		// declarator. This makes recursive calls to FDs easy
		// and also preserves JS semantics in situations like
		// the following:
		// function foo(a) {
		//     if (!a) return foo(true); return 'foo';
		// }
		// var bar = foo;
		// foo = function() { return 'baz'; };
		// bar();
		null, node.params, node.defaults, node.coercives,
		node.body, node.rest, node.generator, node.async,
		node.lexicalThis, node.expression, node.arity
	);
	fe_node.fn_name = node.id.name;
	blockHoist(
		protogen.createVariableDeclaration(
			[
				protogen._createVariableDeclarator(
					node.id, fe_node, null
				)
			],
			'var'
		),
		true
	);
}

function FunctionExpression(node, scope) {

	var body = node.body,
		async = node.async,
		generator = node.generator,
		numDefaults = 0,
		param, tmp, id, name, arity, thisValue;

	if (node.expression)
		body = protogen._createBlockStatement([
			protogen._createReturnStatement(body)
		]);

	assert(body.type == 'BlockStatement');
	assert(isArray(body.body));

	id = node.id;
	if (node.id != null) {
		id = node.id;
		assert(id.type == 'Identifier');
		node = clone(node);
		node.id = null;
		node.fn_name = id.name;
		return protogen.createCallExpression(
			protogen._createFunctionExpression(
				null, [ ], [ ], [ ],
				protogen._createBlockStatement([
					protogen._createVariableDeclaration(
						[ protogen._createVariableDeclarator(id, node) ],
						'var'
					),
					protogen._createReturnStatement(id)
				]),
				null, false, false, true, false, null
			),
			[ ]
		);
	}

	// Prime compiler to handle destructuring and add params to scope
	for (var i = 0; i < node.params.length; i++) {
		param = node.params[i];
		if (param.type == 'ObjectPattern' || param.type == 'ArrayPattern') {
			tmp = identifiers.next();
			node.params[i] = tmp;
			body.body.unshift(
				protogen._createVariableDeclaration(
					[
						protogen._createVariableDeclarator(
							param, tmp
						)
					],
					'var'
				)
			);
		}
		assert(node.params[i].type == 'Identifier');
		addDefinedVar(node.params[i], node.body);
	}

	// Prime compiler to handle coercives
	assert(isArray(node.coercives));
	for (var i = 0; i < node.coercives.length; i++)
		if (node.coercives[i] != null) {
			assert(node.coercives[i].type == 'Coercive');
			tmp = identifiers.next();
			if (node.defaults[i] == null)
				// During processing, this will translate into a coercive
				// assignment, allowing args passed in to functions to pass
				// through the coercive.
				body.body.unshift(
					protogen._createExpressionStatement(
						protogen._createAssignmentExpression(
							'=', node.params[i], node.params[i]
						)
					)
				);
			body.body.unshift(
				protogen._createVariableDeclaration(
					[
						protogen._createVariableDeclarator(
							tmp, node.coercives[i], null
						)
					],
					'var'
				)
			);
			// TODO: If a param overrides this one with the same name, it should
			// not use the same coercive by default!!!
			getScopeFor(node.body)['coercive_' + node.params[i].name] = tmp;
		}

	// Insert defaults into body
	assert(isArray(node.defaults));
	for (var i = 0; i < node.defaults.length; i++)
		if (node.defaults[i] != null) {
			numDefaults++;
			body.body.unshift(
				protogen._createIfStatement(
					protogen._createBinaryExpression('==',
						node.params[i], ES_UNDEFINED
					),
					protogen._createExpressionStatement(
						protogen._createAssignmentExpression(
							'=', node.params[i], node.defaults[i]
						)
					),
					null
				)
			);
		}

	// Rest param
	if (node.rest !== null) {
		assert(node.rest.type == 'Identifier');
		body.body.unshift(
			protogen.createVariableDeclaration(
				[
					protogen._createVariableDeclarator(
						node.rest,
						toProtoCall('CreateArray', [
							ES_UNDEFINED,
							toProtoCall('arraySlice', [
								esgen.createIdentifier('arguments'),
								createNumericLiteral(node.params.length)
							])
						])
					)
				],
				'var'
			)
		);
	}

	// We don't need to simulate a new block scope here because one will already
	// exist for the function.
	body.__scopeNeeded__ = false;
	body = process(body);

	var ret = esgen.createFunctionExpression(
		id, processAll(node.params, { id_skipGlobal: true }), [ ],
		body, null, generator || async, false
	);

	if (node.fn_name === undefined)
		name = ES_UNDEFINED;
	else
		name = createStringLiteral(node.fn_name);

	if (node.arity == null)
		arity = createNumericLiteral(node.params.length - numDefaults);
	else
		arity = process(node.arity);

	if (node.lexicalThis)
		thisValue = protogen.createThisExpression();
	else
		thisValue = toProtoProperty('DYNAMIC_THIS');

	if (async)
		return toProtoCall('CreateAsyncFunction', [
			ES_UNDEFINED,
			progenerator.transform(ret),
			name,
			arity,
			thisValue
		]);
	else if (generator)
		return toProtoCall('CreateGeneratorFunction', [
			ES_UNDEFINED,
			progenerator.transform(ret),
			name,
			arity,
			thisValue
		]);
	else
		return toProtoCall('CreateFunction', [
			ES_UNDEFINED, ret, name, arity, thisValue
		]);

}

function Identifier(node, scope, params) {
	assert(typeof node.name == 'string');
	if (node.coercive != null)
		throw new SyntaxError('Unexpected coercive');
	var name = checkIdentifierName(node.name, scope),
		tmp;
	if (!params.id_skipGlobal && !scope['Identifier:defined_' + name]) {
		tmp = permanentVar(
			toProtoCall('GetBuiltInGlobal', [ createStringLiteral(name) ])
		);
		scope['Identifier:rename_' + name] = tmp.name;
		return tmp;
	}
	return esgen.createIdentifier(name);
}

function IfStatement(node) {
	var consequent = node.consequent,
		alternate = node.alternate,
		test = process(node.test);
	// As a convenience during compilation, we always make sure a block
	// statement wraps the consequent and alternate for an if statement. This
	// will ensure that it is considered its own scope, which is important
	// during compilation of block expressions which may occur inside a
	// consequent or alternate (so that hoisted block expressions are hoisted
	// to the consequent or alternate block and not elsewhere).
	if (consequent.type != 'BlockStatement')
		consequent = protogen.createBlockStatement([
			consequent
		]);
	else
		consequent = process(consequent);
	if (alternate != null && alternate.type != 'BlockStatement')
		alternate = protogen.createBlockStatement([
			alternate
		]);
	else
		alternate = process(alternate);
	return esgen.createIfStatement(test,
		reduceBlock(consequent),
		reduceBlock(alternate)
	);
}

function ImportDeclaration(node) {
	// TODO: Update this implementation
	// if (node.specifiers.length > 0)
	// 	throw new Error('Unimplemented "ImportDeclaration" specifiers');
	if (node.source.type != 'Literal' || typeof node.source.value != 'string')
		throw new Error(
			'ImportDeclaration must currently have a simple literal string '
			+ 'source. This will be fixed in the future.'
		);
	var source = node.source.value,
		pvar, name, init, n,
		declarations = [ ];
	if (node.kind == 'default') {
		assert(isArray(node.specifiers));
		assert(node.specifiers.length == 1);
		n = clone(node);
		n.kind = 'named';
		n.specifiers[0].name = n.specifiers[0].id;
		n.specifiers[0].id = protogen._createIdentifier('default');
		return process(n);
	}
	assert(node.kind == 'named' || node.kind == 'unbound');
	if (/^\@/.test(source))
		pvar = importBuiltIn(source);
	// TODO: Remove this logic from the compiler and create an abstract way
	// to set up hooks for imports.. then add a "node:" hook from scripts that
	// run in a node environment.
	else if (/^node\:/.test(source))
		pvar = permanentVar(
			objectToSyntaxTree({
				Value: objectToSyntaxTree({
					default: toProtoCall('proxyJs', [ 
						esgen.createCallExpression(
							esgen.createIdentifier('require'),
							[
								createStringLiteral(
									source.replace(/^node\:/, '')
								)
							]
						)
					])
				})
			})
		);
	else
		pvar = importFile(source);
	for (var i = 0, u; i < node.specifiers.length; i++) {
		u = node.specifiers[i];
		assert(u.type == 'ImportSpecifier');
		name = u.name;
		if (name == null)
			name = u.id;
		init = toProtoCall('Get', [ pvar, createStringLiteral(u.id.name) ]);
		declarations.push(
			esgen.createVariableDeclarator(name, init)
		);
	}
	if (declarations.length)
		return protogen.createVariableDeclaration(declarations, 'var');
	else
		return;
}

function ImportSpecifier(node) {
	// This is taken care of in ImportDeclaration
	throw new Error('Unexpected "ImportSpecifier"')
}

function LabeledStatement(node) {
	var label = process(node.label, { id_skipGlobal: true }),
		// TODO: This block is just for processing... Remove unnecessary block wrapper
		block = protogen._createBlockStatement([ node.body ]);
	if (node.body.type == 'SwitchStatement')
		node.body.label = label;
	addDefinedVar(node.label, block, 'label');
	return esgen.createLabeledStatement(label, process(block));
}

function Literal(node, scope) {
	var arg;
	assert('value' in node);
	if (node.kind == 'Nil')
		return ES_UNDEFINED;
	// TODO: Make NaN a literal, that can't be changed.
	if (node.kind == 'Numeric' && node.value === 'inf')
		return protogen.createIdentifier('inf');
	if (node.kind == 'Symbol') {
		if (!(('sym_' + node.value) in scope))
			throw new TypeError('Undefined symbol ' + node.value);
		return scope['sym_' + node.value];
	}
	return clone(node);
}

function LogicalExpression(node) {
	// If this expression contains a block expression, we need to break up its
	// parts and evaluate them one at a time.
	if (containsNodeType(node, 'StatementExpression'))
		return breakupExpression(node);
	return esgen.createBinaryExpression(
		node.operator, process(node.left), process(node.right)
	);
}

function MemberExpression(node) {
	// TODO: Get array#[1..8] working, so that it only retrieves own properties
	// in the range.
	return toProtoCall(
		node.own ? 'GetOwn' : 'Get', [
			process(node.object),
			getPropertyFromMemberExpression(node)
		]
	);
}

function ModuleDeclaration(node) {
	throw new Error('Unimplemented "ModuleDeclaration"');
}

function NewExpression(node) {
	var proto = process(node.prototype),
		args = processAll(node.arguments);
	return toProtoCall('New', [
		proto,
		esgen.createArrayExpression(args)
	]);
}

function ObjectExpression(node) {
	return createObjectExpression(node, false);
}

function ObjectPattern(node) {
	// This should be taken care of by AssignmentExpression and
	// VariableDeclarator
	throw new Error('Unexpected "ObjectPattern"');
}

function PartialApplicationExpression(node) {
	return toProtoCall('PartiallyApply', [
		process(node.callee),
		esgen.createArrayExpression(processAll(node.arguments))
	]);
}

function Program(node) {
	assert(isArray(node.body));
	return esgen.createProgram(processBlockBody(node.body));
}

function Property(node) {
	// Getters and setters should be handled by ObjectExpression
	assert(node.kind == 'init');
	// Static properties should be handled by ObjectExpression
	assert(!node.static);
	// Conditional properties should be handled by ObjectExpression
	assert(!node.conditional);
	// Symbol properties should be handled before this
	assert(node.key.type != 'Literal' || node.key.kind != 'Symbol');
	if (node.coercive != null)
		throw new SyntaxError('Unexpected coercive');
	// We don't process the key normally because it doesn't have to follow
	// the same rules as other identifiers.
	assert(node.key.type == 'Identifier'
	|| node.key.type == 'Literal' && node.key.kind == 'String'
	|| node.key.type == 'Literal' && node.key.kind == 'Numeric');
	var key;
	if (node.key.type == 'Identifier')
		key = esgen.createIdentifier(node.key.name);
	else
		key = createStringLiteral(node.key.value);
	return esgen.createProperty(
		node.kind, key, process(node.value), false, false, false
	);
}

function ReturnStatement(node) {
	return esgen.createReturnStatement(process(node.argument));
}

function SequenceExpression(node) {
	if (node.expressions.length == 1)
		return process(node.expressions[0]);
	// If this expression contains a block expression, we need to break up its
	// parts and evaluate them one at a time.
	if (containsNodeType(node, 'StatementExpression'))
		return breakupExpression(node);
	return esgen.createSequenceExpression(processAll(node.expressions));
}

function SlotExpression(node) {
	var arg, rest;
	if (node.rest) {
		assert(node.argument === null);
		arg = ES_NULL;
		rest = createBooleanLiteral(true);
	}
	else {
		if (node.argument === null)
			arg = ES_NULL;
		else
			arg = process(node.argument);
		rest = createBooleanLiteral(false);
	}
	return toProtoCall('CreateSlot', [
		ES_UNDEFINED, arg, rest
	]);
}

function SpreadElement(node) {
	// SpreadElement is taken care of by its parents.
	// Currently this is for CallExpression and ArrayExpression. Are there any
	// other places where spread is allowed?
	throw new Error('Unexpected "ArrayPattern"');
}

function StatementExpression(node) {

	// Check to see if statement expression can be rewritten as another kind
	// of expression (such as a sequence expression or conditional expression).
	if (isSequenceable(node.statement))
		return process(statementToExpression(node.statement));

	var tmp = tmpVar(),
		block = protogen.createBlockStatement([ node.statement ]);

	// Find the terminal points of `block` and set `tmp`'s value.
	blockInsert(assignCompletion(tmp, block));

	return tmp;

}

function SwitchCase(node) {
	// This should be handled in SwitchStatement
	throw new Error('Unexpected "SwitchCase"');
}

function SwitchStatement(node, scope) {
	var discriminant = process(node.discriminant),
		cases = [ ],
		wrap = true,
		switchLabel, origCase, lastCase, consequent, caseLabel, ret;

	if (node.label) {
		switchLabel = node.label;
		wrap = false;
	}
	else
		switchLabel = identifiers.next();

	for (var i = 0; i < node.cases.length; i++) {
		origCase = node.cases[i];
		caseLabel = identifiers.next();
		scope.continue = esgen.createBreakStatement(caseLabel);
		scope['continue_'  + switchLabel.name] =
			esgen.createBreakStatement(caseLabel);
		consequent = [
			esgen.createLabeledStatement(
				caseLabel,
				esgen.createBlockStatement(
					processAll(origCase.consequent)
						.concat(esgen.createBreakStatement(switchLabel))
				)
			)
		];
		scope['continue_'  + switchLabel.name] = null;
		if (origCase.test == null)
			cases.push(esgen.createSwitchCase(null, consequent));
		else {
			for (var j = 0, test; j < origCase.test.length; j++) {
				test = origCase.test[j];
				cases.push(
					lastCase = esgen.createSwitchCase(test, [ ])
				);
			}
			lastCase.consequent = consequent;
		}
	}
	scope.continue = null;

	ret = esgen.createSwitchStatement(discriminant, cases);
	if (wrap)
		ret = esgen.createLabeledStatement(switchLabel, ret);

	return ret;

}

function SymbolDeclaration(node, scope) {
	assert(isArray(node.declarations));
	for (var i = 0, n; i < node.declarations.length; i++) {
		n = node.declarations[i];
		assert(n.id.type == 'Literal');
		assert(n.id.raw.charAt(0) == '@');
		var tmp = identifiers.next(),
			init = toProtoCall('CreateSymbolPrimitive', [
				createStringLiteral(n.id.value)
			]);
		scope['sym_' + n.id.value] = tmp;
		blockHoist(
			protogen.createVariableDeclaration(
				[ protogen._createVariableDeclarator(tmp, init, null) ],
				'var'
			)
		);
	}
	return;
}

function SymbolDeclarator(node) {
	// This should be taken care of in SymbolDeclaration.
	throw new Error('Unexpected "SymbolDeclarator"');
}

function TaggedTemplateExpression(node) {
	throw new Error('Unimplemented "TaggedTemplateExpression"');
}

function TemplateElement(node) {
	throw new Error('Unimplemented "TemplateElement"');
}

function TemplateLiteral(node) {
	throw new Error('Unimplemented "TemplateLiteral"');
}

function ThisExpression(node) {
	return esgen.createThisExpression();
}

function ThrowStatement(node) {
	return esgen.createThrowStatement(
		toProtoCall('UnwrapProto', [ process(node.argument) ])
	);
}

function TryStatement(node) {
	return esgen.createTryStatement(
		process(node.block),
		processAll(node.guardedHandlers),
		processAll(node.handlers),
		process(node.finalizer)
	);
}

// TODO: Deal with proto-specific unary operators and renamed operators from JS.
function UnaryExpression(node) {
	switch (node.operator) {
		case '!':
			// Shortcut for !!
			if (node.argument.type == 'UnaryExpression'
			&& node.argument.operator == '!')
				return toProtoCall('ToBoolean', [
					process(node.argument.argument)
				]);
			return esgen.createUnaryExpression(
				'!',
				toProtoCall('ToBoolean', [ process(node.argument) ])
			);
		case '&':
			return toProtoCall('ToString', [ process(node.argument) ]);
		case '+':
			return toProtoCall('ToNumber', [ process(node.argument) ]);
		case '#':
			if (node.argument.type == 'ObjectExpression')
				return createObjectExpression(node.argument, true);
			if (node.argument.type == 'ArrayExpression')
				return createArrayExpression(node.argument, true);
			return toProtoCall('Own', [ process(node.argument) ]);
		case '::':
			return unaryBindOperator(node);
		case 'like':
			return toProtoCall('Like', [ process(node.argument) ]);
		case 'typeof':
			return toProtoCall('ToType', [ process(node.argument) ]);
		case 'not':
			// TODO: I think other operators should manually call ToNumber
			// (or ToX) like this. (?)
			return esgen.createUnaryExpression(
				'~', toProtoCall('ToNumber', [ process(node.argument) ])
			);
		case 'delete':
			if (node.argument.type != 'MemberExpression')
				throw new SyntaxError(
					'The delete operator can only be used to delete properties '
					+ 'from objects'
				);
			return toProtoCall('Delete', [
				process(node.argument.object),
				getPropertyFromMemberExpression(node.argument)
			]);
		case 'await':
			return protogen.createYieldExpression(node.argument, false);
		default:
			return esgen.createUnaryExpression(
				node.operator, process(node.argument)
			);
	}
}

function UpdateExpression(node) {
	var object, property, tmp, tmpEvaluation;
	if (node.argument.type == 'MemberExpression') {
		object = process(node.argument.object);
		if (node.argument.computed)
			property = process(node.argument.property);
		else {
			property = node.argument.property;
			assert(property.type == 'Identifier');
			property = createStringLiteral(property.name);
		}
		tmp = tmpVar();
		tmpEvaluation = tmpVar();
		return esgen.createSequenceExpression([
			esgen.createAssignmentExpression(
				'=', tmp,
				toProtoCall('ToNumber', [
					toProtoCall('Get', [ object, property ])
				])
			),
			esgen.createAssignmentExpression(
				'=', tmpEvaluation, esgen.createUnaryExpression(
					node.operator, tmp
				)
			),
			toProtoCall('Set', [ object, property, tmp ]),
			tmpEvaluation
		]);
	}
	else if (node.argument.type == 'Identifier') {
		if (node.prefix)
			return esgen.createUnaryExpression(
				node.operator, process(node.argument)
			);
		else
			return esgen.createPostfixExpression(
				node.operator, process(node.argument)
			);
	}
	else
		throw new SyntaxError(
			'Invalid argument type in UpdateExpression: "'
			+ node.argument.type
			+ '"'
		);
}

function VariableDeclaration(node, scope) {
	var declarations = [ ], tmpDecl, i, d, tmp, init;
	assert(node.kind == 'var' || node.kind == 'const');
	// Process destructurings
	for (i = 0; i < node.declarations.length; i++) {
		d = node.declarations[i];
		if (d.id.type == 'ObjectPattern' || d.id.type == 'ArrayPattern')
			pushAll(declarations, destructureVariableDeclarator(d));
		else if (d.id.type == 'Identifier')
			declarations.push(d);
		else
			throw new TypeError(
				'Identfier, ObjectPattern, or ArrayPattern expected'
			);
	}
	// Add variable to scope and process coercives
	tmpDecl = declarations;
	declarations = [ ];
	for (i = 0; i < tmpDecl.length; i++) {
		d = tmpDecl[i];
		addDefinedVar(d.id, undefined, node.kind);
		init = process(d.init);
		if (d.coercive != null) {
			assert(d.coercive.type == 'Coercive');
			tmp = identifiers.next();
			declarations.push(
				esgen.createVariableDeclarator(tmp, process(d.coercive))
			);
			scope['coercive_' + d.id.name] = tmp;
			if (init == null)
				init = [ ];
			else
				init = [ init ];
			init = toProtoCall('Call', [
				tmp,
				ES_UNDEFINED,
				esgen.createArrayExpression(init)
			]);
		}
		declarations.push(
			esgen.createVariableDeclarator(process(d.id), init)
		);
	}
	return esgen.createVariableDeclaration(declarations, 'var');
}

function VariableDeclarator(node) {
	// This should be handled in VariableDeclaration
	throw new Error('Unexpected "VariableDeclarator"');
}

function WhileStatement(node, scope) {
	scope.continue = null;
	return esgen.createWhileStatement(process(node.test), process(node.body));
}

function YieldExpression(node) {
	// This is transformed to ES5 via progenerator
	return esgen.createYieldExpression(process(node.argument), node.delegate);
}

function clone(node) {
	return JSON.parse(JSON.stringify(node));
}

function importFile(filename) {
	if (importedFiles[filename])
		return esgen.createIdentifier(importedFiles[filename]);
	var node = includeFile(filename);
	importedFiles[filename] = node.name;
	return node;
}

function includeFile(filename) {
	var file = path.resolve(relativePath + '/', filename),
		source = String(fs.readFileSync(file)),
		prevRelativePath = relativePath,
		prevFile = state.file,
		output;
	relativePath = path.dirname(file);
	state.file = file;
	output = handleFile(filename, file, source);
	relativePath = prevRelativePath;
	state.file = prevFile;
	return output;
}

function handleFile(filename, fullFilename, source) {
	var program, pvar;
	if (/\.pr$/.test(filename)) {
		program = proprima.parse(source);
		pvar = permanentVar(
			esgen.createCallExpression(
				esgen.createFunctionExpression(
					null,
					[ esgen.createIdentifier('exports') ],
					[ ],
					esgen.createBlockStatement(
						process(program).body
							.concat(
								esgen.createReturnStatement(
									esgen.createIdentifier('exports')
								)
							)
					),
					null, false, false
				),
				[ toProtoCall('CreateObject', [ ]) ]
			)
		);
		return pvar;
	}
	else if (/\.js$/.test(filename)) {
		program = esprima.parse(source);
		return permanentVar(
			esgen.createCallExpression(
				esgen.createFunctionExpression(
					null, [ ], [ ],
					esgen.createBlockStatement(program.body),
					null, false, false
				),
				[ ]
			)
		);
	}
	// TODO: Move this out of the compiler code and into some sort of dynamic
	// loader definition in the unit test script, allowing the testing script
	// to configure this file extension.
	else if (/\.ejs$/.test(filename)) {
		return handleFile(
			filename.slice(0, -4),
			fullFilename,
			ejs.render(source, {
				filename: fullFilename,
				partial: function partial(filename, options) {
					var s = fs.readFileSync(path.resolve(
						path.dirname(fullFilename),
						filename
					));
					return ejs.render(String(s), options);
				}
			})
		);
	}
	else
		throw new Error('Unknown file extension for file: "' + filename + '"');
}

function importBuiltIn(name) {
	if (name == '@env')
		return permanentVar(
			toProtoCall('proxyJs', [ esgen.createIdentifier('global') ])
		);
	if (/^\@proto\:/.test(name))
		switch (name) {
			case '@proto:Promise':
				return permanentVar(
					objectToSyntaxTree({
						Value: objectToSyntaxTree({
							default: toProtoProperty('PromiseProto')
						})
					})
				);
		}
	throw new Error('Unknown module "' + name + '"');
}

// Ensures all variables being used in the program have been declared first
// TODO: Make this work for function arguments too.
// TODO: Determine if a variable is declared twice, and prevent that... Really
// doing this well will probably require making a decision on block scoping or
// function scoping.
function ensureAllDeclared(program) {
	return;
	traverse(program, function(info) {
		var node = info.node,
			parent = info.parent,
			key = info.key;
		if (node == null)
			return false;
		if (node.type == 'BlockStatement' || node.type == 'Program')
			info.persistentInfo.blockInfo = info.persistentInfo;
		if (node.type == 'VariableDeclarator')
			info.persistentInfo.blockInfo[node.id.name] = true;
		else if (node.type == 'FunctionExpression') {
			for (var i = 0, p; i < node.params.length; i++) {
				p = node.params[i];
				assert(p.type == 'Identifier');
				info.persistentInfo[p.name] = true;
			}
		}
		else if (node.type == 'Identifier'
		&& !(
			parent.type == 'MemberExpression'
			|| parent.type == 'Property' && key == 'key'
		))
			if (!idWhitelist[node.name] && !info.persistentInfo[node.name])
				throw new ReferenceError(
					'Undeclared variable "' + node.name + '"'
				);
		return true;
	});
}

module.exports = {
	compile: compile,
	state: state
};