var traverser = require('../traverser'),
	containsNodeType = traverser.containsNodeType,
	esprima = require('../esprima-harmony'),
	estree = esprima.SyntaxTreeDelegate,
	proprima = require('../proprima'),
	prototree = proprima.SyntaxTreeDelegate,
	ES_UNDEFINED = estree.createIdentifier('undefined');

function isSequenceable(node) {
	if (node.type == 'ExpressionStatement')
		return !containsNodeType(node, 'StatementExpression');
	if (node.type == 'BlockStatement')
		return isSequenceableBody(node.body);
	if (node.type == 'IfStatement')
		return isSequenceableIf(node);
	return false;
}

function isSequenceableBody(body) {
	var child;
	for (var i = 0; i < body.length; i++) {
		child = body[i];
		if (child.type != 'ExpressionStatement') {
			if (child.type == 'IfStatement'
			&& isSequenceableIf(child))
				continue;
			if (child.type == 'BlockStatement'
			&& isSequenceableBody(child.body))
				continue;
			return false;
		}
	}
	return true;
}

function isSequenceableIf(node) {
	var consequent = node.consequent,
		alternate = node.alternate;
	return isSequenceable(consequent)
		&& (alternate == null || isSequenceable(alternate));
}

function statementToExpression(node) {
	if (node == null)
		return ES_UNDEFINED;
	if (node.type == 'ExpressionStatement')
		return node.expression;
	if (node.type == 'BlockStatement')
		return bodyToSequenceExpression(node.body);
	if (node.type == 'IfStatement')
		return ifStatementToConditionalExpression(node);
	throw new Error('Unexpected node type "' + node.type + '"');
}

function bodyToSequenceExpression(body) {

	var output = [ ],
		child;

	for (var i = 0; i < body.length; i++) {
		child = body[i];
		if (child.type == 'ExpressionStatement')
			output.push(child.expression);
		else if (child.type == 'IfStatement')
			output.push(ifStatementToConditionalExpression(child));
		else if (child.type == 'BlockStatement')
			output.push(bodyToSequenceExpression(child.body));
		else
			throw new Error('Unexpected node type "' + child.type + '"');
	}

	return prototree.createSequenceExpression(output);

}

function ifStatementToConditionalExpression(node) {
	return prototree.createConditionalExpression(
			node.test,
			statementToExpression(node.consequent),
			statementToExpression(node.alternate)
		);
}

module.exports = {
	isSequenceable: isSequenceable,
	statementToExpression: statementToExpression
};