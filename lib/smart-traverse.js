var traverser = require('./traverser');

function traverse(node, callback, beforeFlatten) {
	return traverser.traverse(node, function(info) {

		var node = info.node,
			parent = info.parent,
			key = info.key;

		if (key == 'body'
		&& (parent.type == 'BlockStatement' || parent.type == 'Program'))
			info.persistentInfo.blockNode = node;

		if (parent === info.persistentInfo.blockNode)
			info.persistentInfo.blockKey = key;

		info.blockNode = info.persistentInfo.blockNode;
		info.blockKey = info.persistentInfo.blockKey;

		return callback(info);

	}, beforeFlatten);
}

module.exports = traverse;