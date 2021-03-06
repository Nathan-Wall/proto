'use strict';

function traverse(node, callback, beforeFlatten) {
	return _traverse(node, wrap(callback), beforeFlatten, [ ]);
}

function _traverse(node, callback, beforeFlatten, parents, key, persistentInfo) {

	var cont,
		info,
		_persistentInfo = Object.create(persistentInfo || null);

	if (node && node.__skip__)
		cont = true;
	else {
		info = {
			node: node,
			parent: parents[0],
			parents: parents,
			key: key,
			traverse: function(node) {
				return _traverse(
					node,
					callback,
					beforeFlatten,
					parents,
					key,
					_persistentInfo
				);
			},
			persistentInfo: _persistentInfo
		};
		cont = callback(info);
	}

	if (cont && Object(node) === node) {

		// Make an initial pass to do all replacements
		Object.keys(node).forEach(function(key) {
			_traverse(
				node[key],
				callback,
				beforeFlatten,
				[ node ].concat(parents),
				key,
				_persistentInfo
			);
		});

		if (beforeFlatten)
			beforeFlatten();

		// Make a second pass to expand array replacements or remove undefined
		// replacements
		if (Array.isArray(node))
			Object.keys(node).forEach(function(key) {
				if (node[key] === undefined)
					node.splice(key, 1);
				else if (Array.isArray(node[key]))
					node.splice.apply(node, [ key, 1 ].concat(node[key]));
			});

	}

}

function wrap(callback) {
	return function(info) {
		var ret = callback(info),
			parent = info.parent,
			traverse = info.traverse,
			key = info.key;
		if (ret instanceof Replacement) {
			if (parent === undefined)
				throw new Error('Replacement not expected here');
			info.parent[key] = ret.node;
			traverse(ret.node);
			return false;
		}
		return ret;
	};
}

function Replacement(node) {
	this.node = node;
}

// Searches a block, but doesn't search inside further inside functions which
// are contained in the block.
function containsNode(node, test) {
	var found = false;
	traverse(node, function(info) {
		var node = info.node;
		if (found || !node)
			return false;
		if (test(node))
			found = true;
		var type = node.type;
		// Don't keep looking further inside functions
		if (type == 'FunctionDeclaration'
		|| type == 'FunctionExpression'
		|| type == 'ArrowLambdaExpression'
		|| type == 'BlockStatement')
			return false;
		return !found;
	});
	return found;
}

function containsNodeType(node, type) {
	return containsNode(node, function(n) {
		return n.type == type;
	});
}

module.exports = {
	traverse: traverse,
	Replacement: Replacement,
	containsNode: containsNode,
	containsNodeType: containsNodeType
};