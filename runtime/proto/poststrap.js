var $$get = CreateBuiltInSymbol('get'),
	$$getOwn = CreateBuiltInSymbol('getOwn'),
	$$has = CreateBuiltInSymbol('has'),
	$$hasOwn = CreateBuiltInSymbol('hasOwn'),
	$$set = CreateBuiltInSymbol('set'),
	$$setOwn = CreateBuiltInSymbol('setOwn'),
	$$delete = CreateBuiltInSymbol('delete'),
	$$getDescriptor = CreateBuiltInSymbol('getDescriptor'),
	$$iterator = CreateBuiltInSymbol('iterator'),
	$$toComparable = CreateBuiltInSymbol('toComparable'),
	$$type = CreateBuiltInSymbol('type'),
	$$receiver = CreateBuiltInSymbol('receiver'),

	$$accessorGet = CreateBuiltInSymbol('accessorGet'),
	$$accessorSet = CreateBuiltInSymbol('accessorSet'),

	$$arrayIteratorNextIndex = CreateBuiltInSymbol('arrayIteratorNextIndex'),
	$$arrayIterationKind = CreateBuiltInSymbol('arrayIterationKind'),
	$$arrayIteratorIteratedObject = CreateBuiltInSymbol('arrayIteratorIteratedObject'),

	$$asyncResolve = CreateBuiltInSymbol('asyncResolve'),
	$$asyncReject = CreateBuiltInSymbol('asyncReject'),

	$$booleanValue = CreateBuiltInSymbol('booleanValue'),
	$$toBoolean = CreateBuiltInSymbol('toBoolean'),

	$$generatorStart = CreateBuiltInSymbol('generatorStart'),
	$$generatorContext = CreateBuiltInSymbol('generatorContext'),
	$$generatorState = CreateBuiltInSymbol('generatorState'),
	$$generatorInnerFn = CreateBuiltInSymbol('generatorInnerFn'),

	$$mapKeys = CreateBuiltInSymbol('mapKeys'),
	$$mapPrimitiveHashValues = CreateBuiltInSymbol('mapPrimitiveHashValues'),
	$$mapPrimitiveHashIndices = CreateBuiltInSymbol('mapPrimitiveHashIndices'),
	$$mapId = CreateBuiltInSymbol('mapId'),
	$$mapSize = CreateBuiltInSymbol('mapSize'),
	// mapValue should be non-transferable
	$$mapValue = CreateBuiltInSymbol('mapValue'),
	$$mapIteratorMap = CreateBuiltInSymbol('mapIteratorMap'),
	$$mapIteratorNextIndex = CreateBuiltInSymbol('mapIteratorNextIndex'),
	$$mapIteratorKind = CreateBuiltInSymbol('mapIteratorKind'),

	$$numberValue = CreateBuiltInSymbol('numberValue'),
	$$toNumber = CreateBuiltInSymbol('toNumber'),

	$$promise = CreateBuiltInSymbol('promise'),
	$$promiseStatus = CreateBuiltInSymbol('promiseStatus'),
	$$promiseDeferred = CreateBuiltInSymbol('promiseDeferred'),
	$$promiseHandler = CreateBuiltInSymbol('promiseHandler'),
	$$promiseResolveReactions = CreateBuiltInSymbol('promiseResolveReactions'),
	$$promiseRejectReactions = CreateBuiltInSymbol('promiseRejectReactions'),
	$$promiseResult = CreateBuiltInSymbol('promiseResult'),
	$$promiseIndex = CreateBuiltInSymbol('promiseIndex'),
	$$promiseValues = CreateBuiltInSymbol('promiseValues'),
	$$promiseCountdownHolder = CreateBuiltInSymbol('promiseCountdownHolder'),
	$$promiseFulfillmentHandler = CreateBuiltInSymbol('promiseFulfillmentHandler'),
	$$promiseRejectionHandler = CreateBuiltInSymbol('promiseRejectionHandler'),

	$$rangeFrom = CreateBuiltInSymbol('rangeFrom'),
	$$rangeTo = CreateBuiltInSymbol('rangeTo'),
	$$rangeInclusive = CreateBuiltInSymbol('rangeInclusive'),
	$$rangeStep = CreateBuiltInSymbol('rangeStep'),
	$$rangeIteratorFrom = CreateBuiltInSymbol('rangeIteratorFrom'),
	$$rangeIteratorTo = CreateBuiltInSymbol('rangeIteratorTo'),
	$$rangeIteratorStep = CreateBuiltInSymbol('rangeIteratorStep'),
	$$rangeIteratorInclusive = CreateBuiltInSymbol('rangeIteratorInclusive'),
	$$rangeIteratorDone = CreateBuiltInSymbol('rangeIteratorDone'),
	$$rangeIteratorIteration = CreateBuiltInSymbol('rangeIteratorIteration'),

	$$setMap = CreateBuiltInSymbol('setMap'),

	$$slot = CreateBuiltInSymbol('slot'),
	$$restSlot = CreateBuiltInSymbol('restSlot'),

	$$stringValue = CreateBuiltInSymbol('stringValue'),

	$$weakMapId = CreateBuiltInSymbol('weakMapId'),
	// TODO: weakMapValue should be non-transferable
	$$weakMapValue = CreateBuiltInSymbol('weakMapValue'),

	$$weakSetMap = CreateBuiltInSymbol('weakSetMap'),

	identifiers = new Identifiers();