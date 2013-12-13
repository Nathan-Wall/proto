'use strict';

var fs = require('fs'),
	path = require('path'),
	proprima = require('./proprima'),
	esprima = require('./esprima-harmony'),
	Identifiers = require('./identifiers'),
	traverse = require('./traverser').traverse,
	progenerator = require('./progenerator/main'),

	lazyTie = Function.prototype.bind.bind(Function.prototype.apply),
	create = Object.create,
	isArray = Array.isArray,
	pushAll = lazyTie(Array.prototype.push),

	protogen = wrapProtogen(proprima.SyntaxTreeDelegate),
	esgen = wrapEsgen(esprima.SyntaxTreeDelegate),
	identifiers,
	blockInterceptIds,

	processors = {
		ArrayExpression: ArrayExpression,
		ArrayPattern: ArrayPattern,
		ArrowLambdaExpression: ArrowLambdaExpression,
		AssignmentExpression: AssignmentExpression,
		AwaitExpression: AwaitExpression,
		BinaryExpression: BinaryExpression,
		BlockStatement: BlockStatement,
		BreakStatement: BreakStatement,
		CallExpression: CallExpression,
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

	protoUid,
	curBlockBodies,
	relativePath,
	programInsertIndex,
	idWhitelist = create(null),
	idBlacklist = create(null),

	currentScope = create(null),

	neededRuntimeProps,

	ES_NULL_LITERAL = {
		type: 'Literal',
		value: null,
		raw: 'null'
	};

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
	var processed;
	protoUid = Identifiers.getRandomString(6);
	curBlockBodies = [ ];
	relativePath = path.resolve(__dirname, relPath);
	programInsertIndex = 0;
	identifiers = wrapIdentifiers(Identifiers);
	blockInterceptIds = new Identifiers();
	neededRuntimeProps = Object.create(null);
	// TODO: This is currently not very precise because old runtime names
	// don't get removed after an import... importing in general needs to be
	// reworked so that these kinds of globals don't clash.
	if (_idWhitelist !== undefined)
		_idWhitelist.forEach(function(id) {
			idWhitelist[id] = true;
		});
	processed = process(program);
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
		if (p !== undefined)
			body.push(p);
	}
	curBlockBodies.pop();
	return body;
}

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
		node.__scopeAdditions__ = Object.create(null);
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

function wrapIdentifiers(Identifiers) {
	var prefix = '$__proto_',
		infix = '_id_' + Identifiers.getRandomString(4),
		suffix = '__$',
		identifiers = new Identifiers();
	return {
		next: function next() {
			var id = esgen.createIdentifier(
				prefix + protoUid + infix + identifiers.next() + suffix
			);
			return id;
		}
	};
}

// TODO: Remove `init` param... it's not a good idea.. sequence expressions
// are better.
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
				'init', esgen.createIdentifier(k), obj[k], false, false
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

	var props = [ ],
		statics = [ ],
		computed = [ ],
		prop, kind, key;

	assert(isArray(node.properties));

	for (var i = 0; i < node.properties.length; i++) {
		prop = node.properties[i];
		if (prop.key.type == 'Literal' && prop.key.kind == 'Symbol'
		|| prop.kind != 'init') {
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
				static: createBooleanLiteral(prop.static)
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
		own ? ES_NULL_LITERAL
			: esgen.createIdentifier('undefined'),
		esgen.createObjectExpression(props),
		statics.length > 0
			? esgen.createObjectExpression(statics)
			: esgen.createIdentifier('undefined'),
		computed.length > 0
			? objectsToSyntaxTrees(computed)
			: esgen.createIdentifier('undefined')
	]);

}

function createArrayExpression(node, own) {
	assert(isArray(node.elements));
	return toProtoCall('CreateArray', [
		own ? ES_NULL_LITERAL
			: esgen.createIdentifier('undefined'),
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
	var computed = /[^\w\_\$]/.test(name);
	if (neededRuntimeProps && !neededRuntimeProps[name])
		neededRuntimeProps[name] = Object.create(null);
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
			if (node.type == 'ReturnStatement') {
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
						? esgen.createIdentifier('undefined')
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

function assert(value, msg) {
	if (!value)
		throw new Error('Assertion failure'
			+ (msg === undefined ? '' : ': ' + msg)
		);
}

function isObject(value) {
	return Object(value) === value;
}

function ArrayExpression(node) {
	return createArrayExpression(node, false);
}

function ArrayPattern(node) {
	// This should be taken care of by AssignmentExpression
	throw new Error('Unexpected "ArrayPattern"');
}

function ArrowLambdaExpression(node) {
	assert('body' in node);
	assert(!isArray(node.body));
	// We currently don't allow block statements in arrow lambdas, but it could
	// be a nice addition.
	assert(node.body && node.body.type != 'BlockStatement');
	var body = protogen._createBlockStatement([
		protogen._createReturnStatement(node.body)
	]);
	return protogen.createFunctionExpression(
		null, node.params, node.defaults, node.coercives, body, node.rest,
		false, false, node.lexicalThis, false, null
	);
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
	if (node.operator == ':=')
		return mixinOperator(node);
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

function AwaitExpression(node) {
	return protogen.createYieldExpression(node.argument, false);
}

function BinaryExpression(node) {
	var operator;
	switch (node.operator) {
		case '::':
			return binaryBindOperator(node);
		case 'like':
			return binaryLikeOperator(node);
		case '&': if (!operator) operator = '+';
		case '&=': if (!operator) operator = '+=';
			return esgen.createBinaryExpression(operator,
				toProtoCall('ToString', [ process(node.left) ]),
				toProtoCall('ToString', [ process(node.right) ])
			);
		case 'mod': if (!operator) operator = '%';
		case '+':
		case '+=':
		case '-=':
		case '*=': if (!operator) operator = node.operator;
			return esgen.createBinaryExpression(operator,
				toProtoCall('ToNumber', [ process(node.left) ]),
				toProtoCall('ToNumber', [ process(node.right) ])
			);
			return binaryAddOperator(node);
		case '^':
			return toProtoCall('Pow', [
				process(node.left), process(node.right)
			]);
		case '^=':
			return protogen.createAssignmentExpression('=',
				node.left,
				protogen._createBinaryExpression('^', node.left, node.right)
			);
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
				protogen._createIdentifier('undefined'),
				createBooleanLiteral(node.operator == '...'),
				process(node.left), process(node.right)
			]);
		case 'by':
			// TODO: make shortcut for `1 .. 10 by 2` case
			// (using both .. and by)
			return toProtoCall('ModifyRangeStep', [
				process(node.left), process(node.right)
			]);
		case '??':
			// Arrows are used for lazy evaluation
			return toProtoCall('NilCoalesce', [
				protogen.createArrowLambdaExpression(
					[ ], [ ], [ ], node.left, null, true
				),
				protogen.createArrowLambdaExpression(
					[ ], [ ], [ ], node.right, null, true
				)
			]);
		case '!like': if (!operator) operator = 'like';
		case '!is': if (!operator) operator = 'is';
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
		block, cases;

	scope.blockScope = {
		outerScope: Object.getPrototypeOf(scope),
		interrupts: [ ],
		labels: Object.create(null),
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

	processors.BreakStatement = processors.BreakStatement.unwrap();
	processors.ContinueStatement = processors.ContinueStatement.unwrap();
	processors.ReturnStatement = processors.ReturnStatement.unwrap();
	processors.LabeledStatement = processors.LabeledStatement.unwrap();
	processors.FunctionExpression = processors.FunctionExpression.unwrap();

	body = esgen.createBlockStatement(body);
	cases = [ ];
	block = [
		esgen.createExpressionStatement(
			esgen.createCallExpression(
				esgen.createFunctionExpression(
					null, [ ], [ ], body, null, false, false
				),
				[ ]
			)
		)
	];
	if (scope.blockScope.interrupts.length > 0) {
		block[0].expression = esgen.createAssignmentExpression(
			'=', tmp, block[0].expression
		);
		block.push(esgen.createIfStatement(
			esgen.createBinaryExpression(
				'!==', tmp, esgen.createIdentifier('undefined')
			),
			esgen.createSwitchStatement(
				esgen.createMemberExpression(
					'.', tmp, esgen.createIdentifier('id')
				),
				cases
			)
		));
		for (var i = 0; i < scope.blockScope.interrupts.length; i++)
			cases.push(
				esgen.createSwitchCase(
					createStringLiteral(scope.blockScope.interrupts[i].id),
					[ scope.blockScope.interrupts[i].node ]
				)
			);
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
		obj = esgen.createIdentifier('undefined');
		fn = process(node.callee);
	}

	return toProtoCall('Call',
		[ fn, obj, unspread(node.arguments) ]
	);

}

function CatchClause(node) {
	return esgen.createCatchClause(
		process(node.param),
		process(node.body)
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
	if (node.source != null)
		throw new SyntaxError('Source not supported in export declaration');
	assert(isArray(node.specifiers));
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

	if (node.right.type == 'BinaryExpression' && node.right.operator == '..')
		return forOfRange(node, scope);

	var left = node.left,
		// TODO: Use iterable semantics
		right = toProtoCall('ToArray', [ process(node.right) ]),
		body = node.body,

		// TODO: coercive for u from node.left
		u = tmpVar(),
		ofObj = tmpVar(),
		i = tmpVar(createNumericLiteral(0)),
		length = tmpVar(),

		init, test, update, iUpdate;

	assert(left.type == 'Identifier');

	scope['Identifier:rename_' + left.name] = u.name;
	body = process(body);
	delete scope['Identifier:rename_' + left.name];

	iUpdate = protogen.createAssignmentExpression(
		'=', u, protogen._createMemberExpression(true, false, ofObj, i)
	);

	init = protogen.createSequenceExpression([
		protogen._createAssignmentExpression('=', ofObj, right),
		protogen._createAssignmentExpression('=', length,
			protogen._createMemberExpression(false, false, ofObj,
				protogen._createIdentifier('length')
			)
		),
		iUpdate
	]);

	protogen.createMemberExpression(false, false, ofObj,
		protogen._createIdentifier('length')
	);
	test = esgen.createBinaryExpression('<', i, length);

	update = esgen.createSequenceExpression([
		esgen.createPostfixExpression('++', i),
		iUpdate
	]);

	return esgen.createForStatement(init, test, update, body);

}

// This is a shortcut for ranges in for..of, for performance.
// TODO: Check to make sure coercives work with for..of
// TODO: What if the @iterator method is overridden for the Range prototype?
function forOfRange(node, scope) {

	var left = node.left,
		right = node.right,
		body = node.body,
		u = tmpVar(),
		from = tmpVar(),
		to = tmpVar(),
		updateAmount = tmpVar(),
		init, test, update;

	assert(left.type == 'Identifier');

	scope['Identifier:rename_' + left.name] = u.name;
	body = process(body);
	delete scope['Identifier:rename_' + left.name];

	// TODO: Put a check in to make sure neither this nor the end are infinity
	init = esgen.createSequenceExpression([
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
			'=', updateAmount,
			protogen._createConditionalExpression(
				protogen.createBinaryExpression('<', from, to),
				protogen._createLiteral('Numeric', 1, '1'),
				protogen._createUnaryExpression(
					'-', protogen._createLiteral('Numeric', 1, '1')
				)
			)
		)
	]);
	test = protogen.createConditionalExpression(
		protogen.createBinaryExpression('<', from, to),
		protogen.createBinaryExpression('<', u, to),
		protogen.createBinaryExpression('>', u, to)
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
	update = protogen.createAssignmentExpression(
		'=', u,
		// u and updateAmount are guarnanteed to be numbers at this point,
		// so we don't have to use Proto's explicit ToNumber + operator.
		// This will be more performant.
		esgen.createBinaryExpression('+', u, updateAmount)
	);

	return esgen.createForStatement(init, test, update, body);

}

function ForStatement(node, scope) {
	// TODO: Determine whether Proto should have `for` (or only `for..of`)
	throw new SyntaxError('Unsupported for statement');
	scope.continue = null;
	return esgen.createForStatement(
		process(node.init),
		process(node.test),
		process(node.update),
		process(node.body)
	);
}

function FunctionDeclaration(node, scope) {
	blockHoist(
		protogen.createVariableDeclaration(
			[
				protogen._createVariableDeclarator(
					node.id,
					protogen._createFunctionExpression(
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
					),
					null
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
		param, tmp, id, arity;

	if (node.expression)
		body = protogen._createBlockStatement([
			protogen._createReturnStatement(body)
		]);

	assert(body.type == 'BlockStatement');
	assert(isArray(body.body));

	id = node.id;
	if (node.id != null) {
		id = node.id;
		node.id = null;
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
			scope['coercive_' + node.params[i].name] = tmp;
		}

	// Insert defaults into body
	assert(isArray(node.defaults));
	for (var i = 0; i < node.defaults.length; i++)
		if (node.defaults[i] != null)
			body.body.unshift(
				protogen._createExpressionStatement(
					protogen._createAssignmentExpression(
						'=', node.params[i], node.defaults[i]
					)
				)
			);

	// Rest param
	if (node.rest !== null) {
		assert(node.rest.type == 'Identifier');
		body.body.unshift(
			protogen.createVariableDeclaration(
				[
					protogen._createVariableDeclarator(
						node.rest,
						toProtoCall('CreateArray', [
							esgen.createIdentifier('undefined'),
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

	body.__scopeNeeded__ = false;
	body = process(body);

	var ret = esgen.createFunctionExpression(
		id, processAll(node.params, { id_skipGlobal: true }), [ ],
		body, null, generator || async, false
	);

	if (node.lexicalThis)
		ret = toProtoCall('bind', [ ret, protogen.createThisExpression() ]);

	if (node.arity != null)
		arity = process(node.arity);
	else
		arity = esgen.createIdentifier('undefined');

	if (async)
		ret = toProtoCall('CreateAsyncFunction', [
			esgen.createIdentifier('undefined'),
			progenerator.transform(ret),
			arity
		]);
	else if (generator)
		ret = toProtoCall('CreateGeneratorFunction', [
			esgen.createIdentifier('undefined'),
			progenerator.transform(ret),
			arity
		]);
	else
		ret = toProtoCall('CreateFunction', [
			esgen.createIdentifier('undefined'), ret, arity
		]);

	return ret;

}

function Identifier(node, scope, params) {
	assert(typeof node.name == 'string');
	if (node.coercive != null)
		throw new SyntaxError('Unexpected coercive');
	var name = checkIdentifierName(node.name, scope);
	if (!params.id_skipGlobal && !scope['Identifier:defined_' + name])
		return toProtoProperty('global_' + name);
	return esgen.createIdentifier(name);
}

function IfStatement(node) {
	return esgen.createIfStatement(
		process(node.test),
		process(node.consequent),
		process(node.alternate)
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
		pvar, name, init,
		declarations = [ ];
	if (/^\@/.test(source))
		pvar = importBuiltIn(source);
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
	var label = process(node.label);
	if (node.body.type == 'SwitchStatement')
		node.body.label = label;
	return esgen.createLabeledStatement(label, process(node.body));
}

function Literal(node, scope) {
	var arg;
	assert('value' in node);
	if (node.kind == 'Nil')
		return esgen.createIdentifier('undefined');
	if (node.kind == 'Numeric' && node.value === 'inf')
		return esgen.createIdentifier('inf');
	if (node.kind == 'Symbol') {
		if (!(('sym_' + node.value) in scope))
			throw new TypeError('Undefined symbol ' + node.value);
		return scope['sym_' + node.value];
	}
	return clone(node);
}

function LogicalExpression(node) {
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
	// Symbol properties should be handled before this
	assert(node.key.type != 'Literal' || node.key.kind != 'Symbol');
	if (node.coercive != null)
		throw new SyntaxError('Unexpected coercive');
	// We don't process the key normally because it doesn't have to follow
	// the same rules as other identifiers.
	assert(node.key.type == 'Identifier');
	var key = esgen.createIdentifier(node.key.name);
	return esgen.createProperty(
		node.kind, key, process(node.value), false, false
	);
}

function ReturnStatement(node) {
	return esgen.createReturnStatement(process(node.argument));
}

function SequenceExpression(node) {
	return esgen.createSequenceExpression(processAll(node.expressions));
}

function SlotExpression(node) {
	var arg, rest;
	if (node.rest) {
		assert(node.argument === null);
		arg = ES_NULL_LITERAL;
		rest = createBooleanLiteral(true);
	}
	else {
		if (node.argument === null)
			arg = ES_NULL_LITERAL;
		else
			arg = process(node.argument);
		rest = createBooleanLiteral(false);
	}
	return toProtoCall('CreateSlot', [
		esgen.createIdentifier('undefined'), arg, rest
	]);
}

function SpreadElement(node) {
	// SpreadElement is taken care of by its parents.
	// Currently this is for CallExpression and ArrayExpression. Are there any
	// other places where spread is allowed?
	throw new Error('Unexpected "ArrayPattern"');
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
	return esgen.createThrowStatement(process(node.argument));
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
				esgen.createIdentifier('undefined'),
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
	var file = path.resolve(relativePath + '/', filename),
		source = fs.readFileSync(file),
		prevRelativePath = relativePath,
		program, pvar;
	if (/\.proto$/.test(filename)) {
		program = proprima.parse(source);
		relativePath = path.dirname(file);
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
		relativePath = prevRelativePath;
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
	else
		throw new Error('Unknown file extension for file: "' + filename + '"');
}

function importBuiltIn(name) {
	if (name == '@env')
		return permanentVar(
			toProtoCall('proxyJs', [ esgen.createIdentifier('global') ])
		);
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
	compile: compile
};